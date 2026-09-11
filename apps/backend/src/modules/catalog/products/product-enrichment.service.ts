import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { dbPool } from '../../../config/database.config';
import { ProductsService } from './products.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import {
  ApplyEnrichedProductDto,
  ApplyEnrichedProductsDto,
  EnrichProductDto,
  ProductEnrichField,
} from './dto/enrich-product.dto';

type CategoryOption = { id: string; name: string; parent_name?: string | null };

type CatalogLookup = {
  sku: string;
  name: string;
  description: string;
  categoryNames: string[];
  pageUrl: string;
  imageUrls: string[];
  approximate: boolean;
  compatibility?: EnrichedProductResult['compatibility'];
};

const TOYOTA_GRAPHQL = 'https://autoparts.toyota.com/api/graphql';
const TOYOTA_PRODUCT_BASE = 'https://autoparts.toyota.com/products/product';
const LONGO_OEM_BASE = 'https://parts.longotoyota.com/oem-parts';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export type EnrichedProductResult = {
  product_id: string;
  sku: string | null;
  original_name: string;
  fields: ProductEnrichField[];
  name?: string;
  description?: string;
  category_id?: string | null;
  category_name?: string | null;
  shipping?: {
    weight_kg: number | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    estimated: true;
    rationale?: string;
  };
  compatibility?: {
    is_universal: boolean;
    items: Array<{
      make: string;
      model: string;
      year_start?: number;
      year_end?: number;
      body_trim?: string | null;
      engine_transmission?: string | null;
      notes?: string;
      source?: string;
      confidence?: number;
    }>;
    notes?: string;
  };
  image_url?: string | null;
  image_options?: string[];
  sources?: string[];
  warnings: string[];
};

@Injectable()
export class ProductEnrichmentService {
  private readonly logger = new Logger(ProductEnrichmentService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async enrichOne(dto: EnrichProductDto): Promise<EnrichedProductResult> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const product = await this.loadProduct(dto.productId);
    const categories = await this.loadCategories();
    const warnings: string[] = [];
    const sources: string[] = [];

    const toyota = await this.lookupToyotaOfficial(product.sku);
    const longo = await this.lookupLongoCatalog(product);
    const catalog = mergeCatalogLookups(toyota, longo);
    if (catalog?.pageUrl) sources.push(catalog.pageUrl);
    if (toyota?.pageUrl) sources.push(toyota.pageUrl);
    if (longo?.pageUrl) sources.push(longo.pageUrl);
    if (catalog?.approximate) {
      warnings.push(
        `El SKU local ${product.sku} se resolvió como ${catalog.sku} en el catálogo Toyota/Longo. Verifica que sea la misma pieza.`,
      );
    } else if (product.sku && !catalog) {
      warnings.push('No se encontró ficha en Toyota oficial ni en Longo Parts. Se buscó en otras fuentes.');
    }

    const catalogName = chooseCatalogName(product.name, product.sku, [longo?.name, toyota?.name, catalog?.name]);
    const oemCategory = catalog ? matchCategoryFromNames(catalog.categoryNames, categories) : null;
    const fieldsForAi = dto.fields.filter((field) => {
      if (field === 'photography') return false;
      if (field === 'name' && isCompleteProductName(catalogName, product.sku)) return false;
      if (field === 'description' && catalog?.description) return false;
      if (field === 'category' && oemCategory) return false;
      if (field === 'compatibility' && catalog?.compatibility?.items?.length) return false;
      return true;
    });

    const textResult = fieldsForAi.length
      ? await this.completeFromWeb(product, fieldsForAi, categories, catalog)
      : { warnings: [] };
    warnings.push(...(textResult.warnings || []));
    collectHttpUrls([textResult.sources]).forEach((url) => sources.push(url));

    let imageOptions: string[] = [];
    if (dto.fields.includes('photography')) {
      imageOptions = await this.findRealProductPhotos(product, [
        ...(catalog?.imageUrls || []),
        catalog?.pageUrl,
        longo?.pageUrl,
        textResult.image_url,
        ...(Array.isArray(textResult.image_urls) ? textResult.image_urls : []),
        ...sources,
      ]);
      if (imageOptions.length === 0) {
        warnings.push('No se encontró una foto real después de 3 intentos.');
      }
    }

    const resolvedName = dto.fields.includes('name')
      ? chooseCatalogName(product.name, product.sku, [catalogName, textResult.name, longo?.name, toyota?.name])
      : undefined;
    const spanish = await this.ensureSpanishCopy({
      name: resolvedName,
      description: dto.fields.includes('description')
        ? catalog?.description || textResult.description || product.description || ''
        : undefined,
      sku: product.sku,
    });

    return {
      product_id: product.id,
      sku: product.sku,
      original_name: product.name,
      fields: dto.fields,
      name: dto.fields.includes('name') ? spanish.name : undefined,
      description: dto.fields.includes('description') ? spanish.description : undefined,
      category_id: dto.fields.includes('category') ? oemCategory?.id ?? textResult.category_id ?? null : undefined,
      category_name: dto.fields.includes('category')
        ? oemCategory?.label ?? textResult.category_name ?? null
        : undefined,
      shipping: dto.fields.includes('shipping') ? textResult.shipping : undefined,
      compatibility: dto.fields.includes('compatibility')
        ? catalog?.compatibility || textResult.compatibility
        : undefined,
      image_url: dto.fields.includes('photography') ? imageOptions[0] || null : undefined,
      image_options: dto.fields.includes('photography') && imageOptions.length ? imageOptions : undefined,
      sources: Array.from(new Set(sources)),
      warnings,
    };
  }

  async apply(dto: ApplyEnrichedProductsDto) {
    const results: Array<{ id: string; ok: boolean; message?: string }> = [];

    for (const item of dto.products) {
      try {
        await this.applyOne(item);
        results.push({ id: item.id, ok: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error aplicando enriquecimiento a ${item.id}: ${message}`);
        results.push({ id: item.id, ok: false, message });
      }
    }

    return {
      saved: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  private async applyOne(item: ApplyEnrichedProductDto) {
    const existing = await this.productsService.findOne(item.id, undefined, true);
    const payload: Record<string, unknown> = {};

    if (item.fields.includes('name') && item.name?.trim()) {
      payload.name = item.name.trim();
    }
    if (item.fields.includes('description') && item.description !== undefined) {
      payload.description = item.description;
    }
    if (item.fields.includes('category') && item.category_id) {
      payload.category_id = item.category_id;
    }
    if (item.fields.includes('photography')) {
      const imageUris = Array.from(
        new Set(
          [...(item.image_urls || []), item.image_url]
            .map((uri) => uri?.trim())
            .filter((uri): uri is string => Boolean(uri)),
        ),
      );
      if (imageUris.length > 0) {
        const primaryUrl = await this.productsService.attachGalleryImages(item.id, imageUris);
        if (primaryUrl) {
          payload.image_url = primaryUrl;
        }
      }
    }
    if (item.fields.includes('shipping') && item.shipping) {
      const currentMetadata =
        existing.metadata && typeof existing.metadata === 'object' ? { ...existing.metadata } : {};
      payload.metadata = {
        ...currentMetadata,
        shipping_weight_kg: item.shipping.weight_kg != null ? String(item.shipping.weight_kg) : undefined,
        shipping_length_cm: item.shipping.length_cm != null ? String(item.shipping.length_cm) : undefined,
        shipping_width_cm: item.shipping.width_cm != null ? String(item.shipping.width_cm) : undefined,
        shipping_height_cm: item.shipping.height_cm != null ? String(item.shipping.height_cm) : undefined,
        shipping_estimated: 'true',
      };
    }

    if (Object.keys(payload).length > 0) {
      await this.productsService.update(item.id, payload as any);
    }

    if (item.fields.includes('compatibility')) {
      await this.vehiclesService.clearProductCompatibilities(item.id);
      if (item.compatibility_is_universal) {
        await this.vehiclesService.addCompatibilityByApplication(item.id, {
          is_universal: true,
          notes: 'Marcado como universal desde completar metadatos',
        });
      } else {
        for (const compat of item.compatibility_items || []) {
          if (!compat.make?.trim() || !compat.model?.trim()) continue;
          const yearStart = compat.year_start || compat.year_end;
          const yearEnd = compat.year_end || compat.year_start;
          if (!yearStart) continue;
          await this.vehiclesService.addCompatibilityByApplication(item.id, {
            make: compat.make.trim(),
            model: compat.model.trim(),
            year_start: yearStart,
            year_end: yearEnd,
            body_trim: compat.body_trim || undefined,
            engine_transmission: compat.engine_transmission || undefined,
            notes: [compat.notes, compat.source].filter(Boolean).join(' | ') || undefined,
          });
        }
      }
    }
  }

  private async loadProduct(productId: string) {
    const result = await dbPool.query(
      `SELECT p.id, p.name, p.sku, p.description, p.image_url, p.price, p.product_type,
              p.category_id, p.metadata, p.business_id, pc.name as category_name
       FROM catalog.products p
       LEFT JOIN catalog.product_categories pc ON pc.id = p.category_id
       WHERE p.id = $1`,
      [productId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Producto no encontrado');
    }
    return result.rows[0];
  }

  private async loadCategories(): Promise<CategoryOption[]> {
    const result = await dbPool.query(
      `SELECT pc.id, pc.name, parent.name as parent_name
       FROM catalog.product_categories pc
       LEFT JOIN catalog.product_categories parent ON parent.id = pc.parent_category_id
       WHERE pc.is_active = TRUE
       ORDER BY parent.name NULLS LAST, pc.name
       LIMIT 400`,
    );
    return result.rows;
  }

  private getLlmConfig() {
    const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.TASK_DETAIL_AI_API_KEY?.trim();
    if (!apiKey) {
      throw new BadRequestException('No hay clave de IA configurada en el servidor');
    }
    const base = (process.env.OPENAI_BASE_URL || process.env.TASK_DETAIL_AI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    );
    const model = process.env.OPENAI_MODEL || process.env.TASK_DETAIL_AI_MODEL || 'gpt-4o-mini';
    return { apiKey, base, model };
  }

  private async lookupToyotaOfficial(sku?: string | null): Promise<CatalogLookup | null> {
    const variants = skuSearchVariants(sku);
    if (variants.length === 0) return null;

    let items: any[] = [];
    for (const variant of variants) {
      try {
        const query = `{ products(search:"${variant}", pageSize:5){ items{ sku name url_key image{url} media_gallery{url} categories{name} } } }`;
        const { data } = await axios.post(
          TOYOTA_GRAPHQL,
          { query },
          {
            timeout: 15000,
            headers: {
              'User-Agent': BROWSER_UA,
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Store: 'default',
            },
          },
        );
        items = data?.data?.products?.items || [];
        if (items.length) break;
      } catch (error: unknown) {
        this.logger.warn(
          `Toyota GraphQL falló para ${variant}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const picked = pickBestToyotaItem(sku || '', items);
    if (!picked) return null;

    const pageUrl = `${TOYOTA_PRODUCT_BASE}/${picked.item.url_key}`;
    const imageUrls = new Set<string>();
    collectHttpUrls([picked.item.image?.url, picked.item.media_gallery]).forEach((url) => imageUrls.add(url));

    let description = '';
    try {
      const { data: html } = await axios.get<string>(pageUrl, {
        timeout: 15000,
        responseType: 'text',
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      description = extractToyotaDescription(String(html || ''));
      extractImageUrlsFromHtml(String(html || ''), pageUrl).forEach((url) => imageUrls.add(url));
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudo leer la ficha Toyota ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      sku: String(picked.item.sku || ''),
      name: String(picked.item.name || '').trim(),
      description,
      categoryNames: Array.from(
        new Set(
          (Array.isArray(picked.item.categories) ? picked.item.categories : [])
            .map((category: any) => String(category?.name || '').trim())
            .filter(Boolean),
        ),
      ),
      pageUrl,
      imageUrls: Array.from(imageUrls),
      approximate: picked.approximate,
    };
  }

  private async lookupLongoCatalog(product: any): Promise<CatalogLookup | null> {
    const sku = String(product?.sku || '').trim();
    if (!sku) return null;

    const candidates = longoCandidateUrls(sku, product?.name);
    try {
      const { apiKey, base, model } = this.getLlmConfig();
      const raw = await this.callWebSearchModel(
        apiKey,
        base,
        model,
        [
          'Consulta el catálogo OEM Toyota de Longo Parts (RevolutionParts).',
          'Abre la ficha site:parts.longotoyota.com/oem-parts del SKU exacto.',
          'No inventes aplicaciones. Si un dato no está en esa ficha, déjalo vacío.',
          'name = título COMPLETO de la ficha (H1), incluyendo tipo, clase, marca y número de parte si aparecen. No lo acortes a 1 o 2 palabras.',
          'description en español de México. Si la ficha está en inglés, tradúcela sin inventar.',
          'No inventes atributos que no estén en la ficha.',
          'Devuelve SOLO JSON válido, sin markdown.',
        ].join(' '),
        [
          `SKU: ${sku}`,
          `Nombre actual: ${product?.name || ''}`,
          `URLs candidatas: ${candidates.join(' | ')}`,
          'Busca también: site:parts.longotoyota.com/oem-parts ' + sku,
          'Extrae JSON con esta forma:',
          JSON.stringify({
            sku: '90916-A2016',
            name: 'Tow Hitch Ball Mount, Class III - Toyota (PT228-48141)',
            description: 'texto de la ficha / Fits ...',
            pageUrl: 'https://parts.longotoyota.com/oem-parts/...',
            image_urls: ['https://cdn.revolutionparts.io/images/...', 'https://cdn-product-images.revolutionparts.io/assets/...'],
            categoryNames: ['Belts'],
            compatibility: {
              is_universal: false,
              items: [
                {
                  make: 'Toyota',
                  model: 'Corolla',
                  year_start: 2011,
                  year_end: 2019,
                  notes: 'With AC. Without eco. 1.8L US built',
                  source: 'https://parts.longotoyota.com/oem-parts/toyota-serpentine-belt-90916a2016',
                },
              ],
            },
          }),
        ].join('\n'),
      );
      const parsed = parseJsonObject(raw);
      if (!parsed) return null;

      const pageUrl =
        collectHttpUrls([parsed.pageUrl, parsed.sources, raw]).find((url) =>
          /parts\.longotoyota\.com\/oem-parts\//i.test(url),
        ) ||
        (typeof parsed.pageUrl === 'string' && /^https?:\/\//i.test(parsed.pageUrl) ? parsed.pageUrl : candidates[0]);

      const name = String(parsed.name || '').trim();
      const description = String(parsed.description || '').trim();
      const imageUrls = collectHttpUrls([parsed.image_url, parsed.image_urls, parsed.sources, raw]).filter(
        (url) => !looksLikeLogoUrl(url),
      );
      const compatibility = normalizeCompatibility(parsed.compatibility, pageUrl);
      if (!name && !description && !imageUrls.length && !compatibility?.items?.length) return null;

      return {
        sku: String(parsed.sku || sku),
        name,
        description,
        categoryNames: Array.isArray(parsed.categoryNames)
          ? parsed.categoryNames.map((value: unknown) => String(value || '').trim()).filter(Boolean)
          : [],
        pageUrl,
        imageUrls,
        approximate: compactSku(String(parsed.sku || '')) !== compactSku(sku),
        compatibility,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Longo catalog falló para ${sku}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async completeFromWeb(
    product: any,
    fields: ProductEnrichField[],
    categories: CategoryOption[],
    oem?: CatalogLookup | null,
  ): Promise<any> {
    const { apiKey, base, model } = this.getLlmConfig();
    const categoryCatalog = categories.map((c) => ({
      id: c.id,
      name: c.parent_name ? `${c.parent_name} > ${c.name}` : c.name,
    }));
    const searchQuery = [product.sku, product.name].filter(Boolean).join(' ');
    const selected = new Set(fields);

    const schema: Record<string, unknown> = { sources: ['urls consultadas'], warnings: ['string'] };
    if (selected.has('name')) {
      schema.name =
        'título completo encontrado en la ficha (tipo + clase/atributos + marca + SKU si aparecen). Nunca un nombre de 1-2 palabras.';
    }
    if (selected.has('description')) schema.description = 'string de ficha publicada en español';
    if (selected.has('category')) schema.category_id = 'uuid|null';
    if (selected.has('category')) schema.category_name = 'string|null';
    if (selected.has('photography')) {
      schema.image_url = 'https://url-directa-jpg-png-webp';
      schema.image_urls = ['https://otras-fotos-directas'];
    }
    if (selected.has('shipping')) {
      schema.shipping = {
        weight_kg: 'number',
        length_cm: 'number',
        width_cm: 'number',
        height_cm: 'number',
        estimated: true,
        rationale: 'string',
      };
    }
    if (selected.has('compatibility')) {
      schema.compatibility = {
        is_universal: false,
        items: [
          {
            make: 'string',
            model: 'string',
            year_start: 2018,
            year_end: 2022,
            notes: 'string',
            source: 'url o catálogo',
          },
        ],
        notes: 'string',
      };
    }

    const instructions = [
      'Eres un investigador de catálogo automotriz para AGORA.',
      `Busca en internet SOLO estos campos: ${fields.join(', ')}. No investigues ni devuelvas nada más.`,
      'Usa el SKU y el nombre exactos del producto.',
      'Nombre: construye el título con SOLO lo publicado (tipo de pieza, clase, marca, SKU). No inventes. No acortes. Si el nombre actual ya es más completo que el de la ficha, conserva esos datos que también aparezcan en la red.',
      'Nombre y descripción DEBEN ir en español de México. Si la ficha está en inglés, tradúcela sin inventar datos. Conserva SKU, marcas, clase y números.',
      'Prioriza parts.longotoyota.com/oem-parts, luego autoparts.toyota.com, y fotos en cdn.revolutionparts.io o cdn-product-images.revolutionparts.io.',
      selected.has('photography')
        ? 'Para fotografía: NO generes imagen. Devuelve URLs https DIRECTAS a la foto real (.jpg .png .webp) de ESA pieza. No uses logos ni cdn-static.revolutionparts.io.'
        : '',
      selected.has('compatibility')
        ? 'Compatibilidad: solo aplicaciones confirmadas en papeles u OEM. Si no hay fuente, items=[].'
        : '',
      selected.has('shipping')
        ? 'Peso y volumen: único dato que puedes estimar si no aparece publicado.'
        : '',
      selected.has('category')
        ? 'Categoría: elige SOLO un id de la lista recibida. Si ninguna aplica, null.'
        : '',
      'Responde SOLO un JSON válido, sin markdown.',
    ]
      .filter(Boolean)
      .join(' ');

    const user = [
      `Producto: "${searchQuery}".`,
      `SKU: ${product.sku || 'no disponible'}.`,
      `Nombre actual: ${product.name}.`,
      `Descripción actual: ${product.description || 'ninguna'}.`,
      oem?.pageUrl
        ? `Ficha ya encontrada: ${oem.pageUrl} (SKU ${oem.sku}, nombre "${oem.name}", categorías: ${oem.categoryNames.join(', ') || 'n/a'}). Úsala como fuente principal.`
        : `Busca primero site:parts.longotoyota.com/oem-parts ${product.sku || ''} y https://autoparts.toyota.com.`,
      `Campos a buscar: ${fields.join(', ')}.`,
      'Devuelve JSON solo con esos campos, con esta forma:',
      JSON.stringify(schema),
      selected.has('category') ? `Categorías existentes: ${JSON.stringify(categoryCatalog)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.callWebSearchModel(apiKey, base, model, instructions, user);
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      throw new ServiceUnavailableException('La IA no devolvió JSON válido desde la búsqueda web');
    }

    if (!fields.includes('category')) {
      parsed.category_id = undefined;
      parsed.category_name = undefined;
    }
    if (!fields.includes('name')) parsed.name = undefined;
    if (!fields.includes('description')) parsed.description = undefined;
    if (!fields.includes('shipping')) parsed.shipping = undefined;
    if (!fields.includes('compatibility')) parsed.compatibility = undefined;
    if (!fields.includes('photography')) {
      parsed.image_url = undefined;
      parsed.image_urls = undefined;
    }

    const validCategoryIds = new Set(categories.map((c) => c.id));
    if (fields.includes('category') && parsed.category_id && !validCategoryIds.has(parsed.category_id)) {
      const byName = categories.find(
        (c) =>
          c.name.toLowerCase() === String(parsed.category_name || '').toLowerCase() ||
          `${c.parent_name || ''} > ${c.name}`.toLowerCase() === String(parsed.category_name || '').toLowerCase(),
      );
      parsed.category_id = byName?.id || null;
      parsed.category_name = byName
        ? byName.parent_name
          ? `${byName.parent_name} > ${byName.name}`
          : byName.name
        : null;
      if (!parsed.category_id) {
        parsed.warnings = [...(parsed.warnings || []), 'La categoría sugerida no coincide con el catálogo existente.'];
      }
    } else if (fields.includes('category') && parsed.category_id) {
      const match = categories.find((c) => c.id === parsed.category_id);
      parsed.category_name = match
        ? match.parent_name
          ? `${match.parent_name} > ${match.name}`
          : match.name
        : parsed.category_name;
    }

    if (fields.includes('shipping') && parsed.shipping) {
      parsed.shipping = {
        weight_kg: toPositiveNumber(parsed.shipping.weight_kg),
        length_cm: toPositiveNumber(parsed.shipping.length_cm),
        width_cm: toPositiveNumber(parsed.shipping.width_cm),
        height_cm: toPositiveNumber(parsed.shipping.height_cm),
        estimated: true,
        rationale: parsed.shipping.rationale || undefined,
      };
    }

    if (fields.includes('compatibility') && parsed.compatibility) {
      parsed.compatibility = normalizeCompatibility(parsed.compatibility);
    }

    if (parsed.image_url && (String(parsed.image_url).startsWith('data:') || !/^https?:\/\//i.test(String(parsed.image_url)))) {
      parsed.image_url = null;
      parsed.warnings = [...(parsed.warnings || []), 'Se descartó una imagen que no era una URL pública.'];
    }

    return parsed;
  }

  private async ensureSpanishCopy(input: {
    name?: string;
    description?: string;
    sku?: string | null;
  }): Promise<{ name?: string; description?: string }> {
    const name = input.name?.trim();
    const description = input.description?.trim();
    if (!name && !description) return input;
    if (!looksLikeEnglish(name) && !looksLikeEnglish(description)) {
      return { name, description };
    }

    try {
      const { apiKey, base, model } = this.getLlmConfig();
      const { data } = await axios.post(
        `${base}/chat/completions`,
        {
          model,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: [
                'Traduces fichas de refacciones automotrices al español de México.',
                'No inventes datos. No acortes el nombre. No elimines clase, marca ni número de parte.',
                'No juntes palabras (Ball Mount no es Ballmount).',
                'Conserva SKU, marcas, números de parte, medidas y Class/Clase.',
                'Si el texto ya está en español, devuélvelo igual.',
                'Responde SOLO JSON { "name": "...", "description": "..." }.',
              ].join(' '),
            },
            {
              role: 'user',
              content: JSON.stringify({ name: name || '', description: description || '', sku: input.sku || '' }),
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: Number(process.env.OPENAI_TIMEOUT_MS || 120000),
        },
      );
      const parsed = parseJsonObject(data?.choices?.[0]?.message?.content || '');
      const translatedName = String(parsed?.name || name || '').trim() || name;
      const translatedDescription = String(parsed?.description || description || '').trim() || description;
      return {
        name:
          name && translatedName && nameQualityScore(translatedName, input.sku) + 8 < nameQualityScore(name, input.sku)
            ? name
            : translatedName,
        description: translatedDescription,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudo traducir al español: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { name, description };
    }
  }

  private async callWebSearchModel(
    apiKey: string,
    base: string,
    model: string,
    instructions: string,
    user: string,
  ): Promise<string> {
    const timeout = Number(process.env.OPENAI_TIMEOUT_MS || 120000);
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    try {
      const { data } = await axios.post(
        `${base}/responses`,
        {
          model,
          tools: [{ type: 'web_search' }],
          instructions,
          input: user,
          temperature: 0.1,
        },
        { headers, timeout },
      );
      const text = extractResponseText(data);
      if (text) return text;
      throw new Error('EMPTY_RESPONSES_OUTPUT');
    } catch (error: unknown) {
      this.logger.warn(
        `Responses+web_search no disponible (${error instanceof Error ? error.message : String(error)}). Intentando modelo de búsqueda.`,
      );
    }

    const searchModel = process.env.OPENAI_SEARCH_MODEL || 'gpt-4o-mini-search-preview';
    const { data } = await axios.post(
      `${base}/chat/completions`,
      {
        model: searchModel,
        web_search_options: { search_context_size: 'medium' },
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: user },
        ],
      },
      { headers, timeout },
    );

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new ServiceUnavailableException('La búsqueda web no devolvió contenido');
    }
    return text;
  }

  private async findRealProductPhotos(product: any, extraCandidates: unknown[]): Promise<string[]> {
    const { apiKey, base, model } = this.getLlmConfig();
    const candidates = new Set<string>();
    collectHttpUrls(extraCandidates)
      .filter((url) => !looksLikeLogoUrl(url))
      .forEach((url) => candidates.add(url));

    let options = await this.downloadRankedPhotos(Array.from(candidates));
    if (options.length > 0) return options.slice(0, 3);

    const searchQueries = [
      `SKU ${product.sku || ''} "${product.name || ''}" foto real OEM site:parts.longotoyota.com cdn.revolutionparts.io`,
      `SKU ${product.sku || ''} product photo packaged part cdn-product-images.revolutionparts.io`,
      `SKU ${product.sku || ''} ${product.name || ''} genuine toyota part image jpg`,
    ];

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      this.logger.log(`Búsqueda de foto intento ${attempt}/3 para SKU ${product.sku || product.id}`);
      try {
        const raw = await this.callWebSearchModel(
          apiKey,
          base,
          model,
          [
            `Intento ${attempt} de 3.`,
            'Busca fotos REALES de la pieza física o su empaque OEM.',
            'Prioriza URLs de cdn.revolutionparts.io/images/ y cdn-product-images.revolutionparts.io/assets/.',
            'Busca la ficha en parts.longotoyota.com/oem-parts y autoparts.toyota.com.',
            'NO uses logos, favicons, banners, placeholders, ni cdn-static.revolutionparts.io.',
            'NO uses cdn-illustrations.revolutionparts.io si hay foto real.',
            'Devuelve JSON { image_urls: ["https://...jpg", "https://...png", "https://...webp"] }.',
          ].join(' '),
          searchQueries[attempt - 1],
        );
        const parsed = parseJsonObject(raw);
        collectHttpUrls([parsed?.image_url, parsed?.image_urls, parsed?.sources, raw])
          .filter((url) => !looksLikeLogoUrl(url))
          .forEach((url) => candidates.add(url));
      } catch (error: unknown) {
        this.logger.warn(
          `Búsqueda de foto intento ${attempt}/3 falló: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      options = await this.downloadRankedPhotos(Array.from(candidates), options);
      if (options.length > 0) return options.slice(0, 3);
    }

    return [];
  }

  private async downloadRankedPhotos(urls: string[], already: string[] = []): Promise<string[]> {
    const options = [...already];
    const seen = new Set(already.map((value) => value.slice(0, 80)));
    const ranked = [...urls].sort((a, b) => photoSourceScore(b) - photoSourceScore(a));
    for (const candidate of ranked) {
      if (options.length >= 3) break;
      const downloaded = await this.downloadPublicImage(candidate, 0);
      if (!downloaded) continue;
      const fingerprint = downloaded.slice(0, 80);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      options.push(downloaded);
    }
    return options;
  }

  private async downloadPublicImage(rawUrl: string, depth = 0): Promise<string | null> {
    if (
      !rawUrl ||
      rawUrl.startsWith('data:') ||
      !/^https?:\/\//i.test(rawUrl) ||
      isPrivateUrl(rawUrl) ||
      looksLikeLogoUrl(rawUrl) ||
      /\.svg(\?|$)/i.test(rawUrl)
    ) {
      return null;
    }

    try {
      const response = await axios.get(rawUrl, {
        timeout: 15000,
        maxRedirects: 4,
        maxContentLength: 4_000_000,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: refererForImage(rawUrl),
        },
        validateStatus: (status) => status >= 200 && status < 400,
      });
      const bytes = Buffer.from(response.data);
      const contentType = String(response.headers['content-type'] || '').toLowerCase();

      if (contentType.includes('html') || looksLikeHtml(bytes)) {
        if (depth >= 1) return null;
        const html = bytes.toString('utf8');
        const images = extractImageUrlsFromHtml(html, rawUrl);
        for (const imageUrl of images.slice(0, 5)) {
          const nested = await this.downloadPublicImage(imageUrl, depth + 1);
          if (nested) return nested;
        }
        return null;
      }

      const mime = imageMimeFromBytes(bytes) || (contentType.startsWith('image/') ? contentType.split(';')[0] : null);
      if (!mime || mime.includes('svg') || bytes.length < 8000) return null;
      const size = imageDimensions(bytes, mime);
      if (size && (Math.min(size.w, size.h) < 140 || size.w / size.h > 2.8 || size.h / size.w > 2.8)) {
        return null;
      }
      return `data:${mime};base64,${bytes.toString('base64')}`;
    } catch (error: unknown) {
      this.logger.warn(`No se pudo bajar imagen ${rawUrl}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function parseJsonObject(raw: string): any | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1] || trimmed;
  const start = payload.indexOf('{');
  const end = payload.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(payload.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isPrivateUrl(raw: string): boolean {
  try {
    const { hostname } = new URL(raw);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.')
    );
  } catch {
    return true;
  }
}

function collectHttpUrls(values: unknown[]): string[] {
  const found = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      const matches = value.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
      matches.forEach((url) => {
        const clean = url.replace(/[),.;]+$/, '');
        if (!isPrivateUrl(clean)) found.add(clean);
      });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  values.forEach(visit);
  return Array.from(found);
}

function looksLikeHtml(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 200).toString('utf8').toLowerCase();
  return head.includes('<html') || head.includes('<!doctype html');
}

function extractImageUrlsFromHtml(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const push = (raw?: string) => {
    if (!raw) return;
    const url = resolveUrl(raw, pageUrl);
    if (/^https?:\/\//i.test(url) && !isPrivateUrl(url) && !looksLikeLogoUrl(url)) urls.push(url);
  };

  const imgTags = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgTags) {
    const tag = match[0].toLowerCase();
    const src = match[1];
    if (tag.includes('logo') || tag.includes('icon') || tag.includes('sprite')) continue;
    push(src);
  }

  const jsonImages = html.matchAll(/"image"\s*:\s*("https?:[^"]+"|\[[^\]]+\])/gi);
  for (const match of jsonImages) {
    collectHttpUrls([match[1]]).forEach(push);
  }

  const cdnImages = html.matchAll(
    /https?:\/\/(?:cdn(?:-product-images)?\.revolutionparts\.io|epc-images\.toyota\.com|eparts-images\.toyota\.com)[^"'\s>]+/gi,
  );
  for (const match of cdnImages) push(match[0]);

  return urls;
}

function looksLikeLogoUrl(url: string): boolean {
  return /logo|favicon|icon|sprite|banner|placeholder|watermark|badge|avatar|wordmark|cdn-static\.revolutionparts|toyota-pco\/common|default_vis_genuine/i.test(
    url,
  );
}

function photoSourceScore(url: string): number {
  const value = url.toLowerCase();
  if (looksLikeLogoUrl(value)) return -10;
  if (value.includes('cdn-product-images.revolutionparts.io')) return 100;
  if (value.includes('cdn.revolutionparts.io/images/')) return 95;
  if (value.includes('cdn-illustrations.revolutionparts.io') || value.includes('epc-images.toyota.com')) return 15;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(value)) return 50;
  if (value.includes('autoparts.toyota.com')) return 30;
  return 20;
}

function refererForImage(url: string): string {
  if (/revolutionparts\.io/i.test(url)) return 'https://parts.longotoyota.com/';
  if (/toyota\.com/i.test(url)) return 'https://autoparts.toyota.com/';
  return 'https://www.google.com/';
}

function mergeCatalogLookups(
  toyota?: CatalogLookup | null,
  longo?: CatalogLookup | null,
): CatalogLookup | null {
  if (!toyota && !longo) return null;
  const imageUrls = Array.from(new Set([...(longo?.imageUrls || []), ...(toyota?.imageUrls || [])]));
  const categoryNames = Array.from(new Set([...(toyota?.categoryNames || []), ...(longo?.categoryNames || [])]));
  const description =
    (longo?.description && longo.description.length >= 40 ? longo.description : '') ||
    toyota?.description ||
    longo?.description ||
    '';
  return {
    sku: toyota?.sku || longo?.sku || '',
    name: chooseCatalogName('', toyota?.sku || longo?.sku, [longo?.name, toyota?.name]),
    description,
    categoryNames,
    pageUrl: longo?.pageUrl || toyota?.pageUrl || '',
    imageUrls,
    approximate: Boolean(toyota?.approximate || longo?.approximate),
    compatibility: longo?.compatibility?.items?.length ? longo.compatibility : toyota?.compatibility,
  };
}

function longoCandidateUrls(sku: string, name?: string | null): string[] {
  const compact = compactSku(sku).toLowerCase();
  if (!compact) return [];
  const slugs = new Set<string>();
  if (name) {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug) slugs.add(`toyota-${slug}`);
  }
  slugs.add('toyota-serpentine-belt');
  slugs.add('toyota-v-ribbed-belt');
  slugs.add('toyota-belt-v-ribbed');
  return [
    ...Array.from(slugs).map((slug) => `${LONGO_OEM_BASE}/${slug}-${compact}`),
    `https://parts.longotoyota.com/search?q=${encodeURIComponent(sku)}`,
  ];
}

function normalizeCompatibility(
  value: any,
  fallbackSource?: string,
): EnrichedProductResult['compatibility'] | undefined {
  if (!value) return undefined;
  const items = Array.isArray(value.items) ? value.items : [];
  const normalized = items
    .filter((item: any) => item?.make && item?.model && (item.year_start || item.year_end))
    .map((item: any) => ({
      make: String(item.make).trim(),
      model: String(item.model).trim(),
      year_start: toYear(item.year_start) || toYear(item.year_end),
      year_end: toYear(item.year_end) || toYear(item.year_start),
      body_trim: item.body_trim || null,
      engine_transmission: item.engine_transmission || null,
      notes: item.notes || undefined,
      source: item.source || fallbackSource || undefined,
      confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
    }));
  if (!normalized.length && !value.notes) return undefined;
  return {
    is_universal: Boolean(value.is_universal) && normalized.length === 0,
    items: normalized,
    notes: value.notes || undefined,
  };
}

function skuSearchVariants(sku?: string | null): string[] {
  if (!sku) return [];
  const cleaned = sku.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40);
  if (!cleaned) return [];
  const compact = cleaned.replace(/[-_]/g, '').toUpperCase();
  const dashed = compact.replace(/^(\d+)([A-Z].*)$/, '$1-$2');
  return Array.from(new Set([cleaned, compact, dashed, compact.toLowerCase()])).filter(Boolean);
}

function compactSku(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !['the', 'and', 'for', 'con', 'para', 'del', 'los'].includes(token));
}

function nameQualityScore(name?: string | null, sku?: string | null): number {
  const cleaned = String(name || '').trim();
  if (!cleaned) return -100;
  const tokens = nameTokens(cleaned);
  let score = tokens.length * 4 + Math.min(cleaned.length, 120) / 6;
  if (sku && compactSku(cleaned).includes(compactSku(sku))) score += 14;
  if (/\b(toyota|lexus|class|clase|iii|ii|iv)\b/i.test(cleaned)) score += 8;
  if (tokens.length <= 2) score -= 24;
  if (cleaned.length < 14) score -= 16;
  return score;
}

function isCompleteProductName(name?: string | null, sku?: string | null): boolean {
  const cleaned = String(name || '').trim();
  if (!cleaned) return false;
  const tokens = nameTokens(cleaned);
  const hasSku = Boolean(sku && compactSku(cleaned).includes(compactSku(sku)));
  const hasBrandOrClass = /\b(toyota|lexus|class|clase)\b/i.test(cleaned);
  return tokens.length >= 4 && cleaned.length >= 22 && (hasSku || hasBrandOrClass);
}

function chooseCatalogName(
  original: string,
  sku?: string | null,
  candidates: Array<string | undefined | null> = [],
): string {
  const originalClean = String(original || '').trim();
  const options = [originalClean, ...candidates.map((value) => String(value || '').trim())].filter(Boolean);
  if (options.length === 0) return originalClean;
  const ranked = [...options].sort((a, b) => nameQualityScore(b, sku) - nameQualityScore(a, sku));
  const best = ranked[0];
  const originalScore = nameQualityScore(originalClean, sku);
  const bestScore = nameQualityScore(best, sku);
  if (!originalClean) return best;
  if (bestScore + 3 < originalScore) return originalClean;
  if (best.length + 18 < originalClean.length && bestScore <= originalScore + 4) return originalClean;
  return best;
}

function pickBestToyotaItem(
  sku: string,
  items: any[],
): { item: any; approximate: boolean } | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const query = compactSku(sku);
  const scored = items
    .map((item) => {
      const found = compactSku(String(item?.sku || ''));
      let score = 0;
      if (found && query && found === query) score = 100;
      else if (found && query && (query.startsWith(found) || found.startsWith(query))) {
        score = 80 - Math.abs(query.length - found.length) * 5;
      } else if (found && query) {
        score = 75 - levenshtein(query, found) * 10;
      }
      if (query && found && query.slice(-1) === found.slice(-1)) score += 3;
      return { item, found, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 45) return null;
  return { item: best.item, approximate: best.score < 95 };
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      grid[i][j] =
        a[i - 1] === b[j - 1]
          ? grid[i - 1][j - 1]
          : 1 + Math.min(grid[i - 1][j], grid[i][j - 1], grid[i - 1][j - 1]);
    }
  }
  return grid[a.length][b.length];
}

function extractToyotaDescription(html: string): string {
  const ldBlocks = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of ldBlocks) {
    try {
      const parsed = JSON.parse(match[1]);
      const description = String(parsed?.description || '').trim();
      if (description.length > 40) return description;
    } catch {
      // ignore invalid JSON-LD
    }
  }

  const about = html.match(/<p>The <strong>[\s\S]*?<\/p>(?:\s*<ul>[\s\S]*?<\/ul>)?/i);
  if (about) {
    const text = htmlToPlainText(about[0]);
    if (text.length > 40) return text;
  }

  const meta = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  return meta?.[1]?.trim() || '';
}

function looksLikeEnglish(text?: string): boolean {
  if (!text) return false;
  const sample = text.toLowerCase();
  const englishHits = (
    sample.match(
      /\b(the|and|with|without|belt|filter|ribbed|genuine|drive|accessory|spark|oil|engine|serpentine|fits|built|delivers|reliable|vehicle|replace|repair)\b/g,
    ) || []
  ).length;
  const spanishHits = (
    sample.match(
      /\b(el|la|los|las|con|sin|banda|filtro|aceite|motor|para|vehiculo|vehículo|genuino|acanalada|reemplaza|pieza)\b/g,
    ) || []
  ).length;
  return englishHits > spanishHits && englishHits >= 1;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|li|h\d|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function matchCategoryFromNames(
  oemNames: string[],
  categories: CategoryOption[],
): { id: string; label: string } | null {
  if (!oemNames.length || !categories.length) return null;
  const oemTokens = oemNames.flatMap((name) => tokenizeCategory(name));
  if (!oemTokens.length) return null;

  let best: { category: CategoryOption; score: number } | null = null;
  for (const category of categories) {
    const tokens = tokenizeCategory(
      `${category.parent_name || ''} ${category.name}`,
    );
    const overlap = tokens.filter((token) => oemTokens.includes(token)).length;
    const score = overlap;
    if (score > 0 && (!best || score > best.score)) best = { category, score };
  }
  if (!best || best.score < 1) return null;
  const label = best.category.parent_name
    ? `${best.category.parent_name} > ${best.category.name}`
    : best.category.name;
  return { id: best.category.id, label };
}

function tokenizeCategory(value: string): string[] {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const raw = normalized.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  const synonyms: Record<string, string[]> = {
    belt: ['banda', 'correa', 'belt'],
    banda: ['belt', 'correa', 'banda'],
    correa: ['belt', 'banda', 'correa'],
    filter: ['filtro', 'filter'],
    filtro: ['filter', 'filtro'],
    plug: ['bujia', 'spark', 'plug'],
    bujia: ['plug', 'spark', 'bujia'],
    oil: ['aceite', 'oil'],
    aceite: ['oil', 'aceite'],
    air: ['aire', 'air'],
    aire: ['air', 'aire'],
  };
  return Array.from(new Set(raw.flatMap((token) => synonyms[token] || [token])));
}

function imageDimensions(bytes: Buffer, mime: string): { w: number; h: number } | null {
  try {
    if (mime === 'image/png' && bytes.length >= 24) {
      return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
    }
    if (mime === 'image/jpeg') {
      let offset = 2;
      while (offset < bytes.length - 9) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        const length = bytes.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xc3) {
          return { h: bytes.readUInt16BE(offset + 5), w: bytes.readUInt16BE(offset + 7) };
        }
        offset += 2 + length;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function resolveUrl(url: string, pageUrl: string): string {
  try {
    return new URL(url, pageUrl).toString();
  } catch {
    return url;
  }
}

function imageMimeFromBytes(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 6 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (bytes.length >= 6 && bytes.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function toYear(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1970 || n > 2035) return undefined;
  return n;
}
