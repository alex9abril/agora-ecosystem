import { Injectable, ServiceUnavailableException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { dbPool } from '../../../config/database.config';
import { supabaseAdmin } from '../../../config/supabase.config';
import { normalizeStoragePath } from '../../../utils/storage.utils';

@Injectable()
export class ProductsService {
  /**
   * Normaliza el nombre del bucket: si viene una URL completa, extrae solo el nombre
   */
  private normalizeBucketName(bucketName: string): string {
    if (!bucketName) return 'products';
    
    // Si es una URL completa, intentar extraer el nombre del bucket
    if (bucketName.startsWith('http')) {
      console.warn('⚠️ [ProductsService] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS contiene una URL completa:', bucketName);
      console.warn('⚠️ [ProductsService] Usando nombre por defecto: products');
      return 'products';
    }
    
    // Si contiene caracteres especiales de URL, probablemente es una URL mal configurada
    if (bucketName.includes('://') || bucketName.includes('/storage/')) {
      console.warn('⚠️ [ProductsService] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS parece contener una URL:', bucketName);
      console.warn('⚠️ [ProductsService] Usando nombre por defecto: products');
      return 'products';
    }
    
    // Si es solo el nombre del bucket, retornarlo tal cual
    return bucketName.trim();
  }

  private readonly BUCKET_NAME = this.normalizeBucketName(process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products');

  /**
   * Detecta si una URL es un data URI (base64)
   */
  private isDataUri(url: string): boolean {
    return url.startsWith('data:image/');
  }

  /**
   * Extrae el tipo MIME y los datos base64 de un data URI
   */
  private parseDataUri(dataUri: string): { mimeType: string; base64Data: string } | null {
    const match = dataUri.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (!match) {
      return null;
    }
    return {
      mimeType: `image/${match[1]}`,
      base64Data: match[2],
    };
  }

  /**
   * Sube una imagen desde un data URI a Supabase Storage
   */
  private async uploadImageFromDataUri(productId: string, dataUri: string): Promise<string> {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    const parsed = this.parseDataUri(dataUri);
    if (!parsed) {
      throw new BadRequestException('Formato de data URI inválido. Debe ser: data:image/[tipo];base64,[datos]');
    }

    try {
      // Convertir base64 a Buffer
      const imageBuffer = Buffer.from(parsed.base64Data, 'base64');

      // Generar nombre de archivo único
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 9);
      const ext = parsed.mimeType.split('/')[1] || 'png';
      const fileName = `main-${timestamp}-${randomStr}.${ext}`;
      const filePath = `${productId}/${fileName}`;

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, imageBuffer, {
          contentType: parsed.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Error subiendo imagen desde data URI:', uploadError);
        throw new ServiceUnavailableException(`Error al subir imagen: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      console.log('✅ Imagen subida desde data URI:', {
        productId,
        filePath,
        publicUrl: urlData.publicUrl,
      });

      return urlData.publicUrl;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error('❌ Error procesando data URI:', error);
      throw new ServiceUnavailableException(`Error al procesar imagen: ${error.message}`);
    }
  }
  /**
   * Obtener configuración de campos por tipo de producto
   */
  async getFieldConfigByProductType(productType: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar primero si la tabla existe
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'catalog' 
        AND table_name = 'product_type_field_config'
      );
    `;

    try {
      const tableCheck = await pool.query(tableExistsQuery);
      const tableExists = tableCheck.rows[0]?.exists;

      if (!tableExists) {
        console.warn('⚠️ Tabla catalog.product_type_field_config no existe. Usando configuración por defecto.');
        // Retornar configuración por defecto basada en el tipo de producto
        return this.getDefaultFieldConfig(productType);
      }

      const sqlQuery = `
        SELECT 
          field_name,
          is_visible,
          is_required,
          display_order
        FROM catalog.product_type_field_config
        WHERE product_type = $1::catalog.product_type
        ORDER BY display_order
      `;

      const result = await pool.query(sqlQuery, [productType]);
      
      // Si no hay resultados, usar configuración por defecto
      if (result.rows.length === 0) {
        console.warn(`⚠️ No se encontró configuración para tipo ${productType}. Usando configuración por defecto.`);
        return this.getDefaultFieldConfig(productType);
      }

      const config = result.rows.map(row => ({
        fieldName: row.field_name,
        isVisible: row.is_visible,
        isRequired: row.is_required,
        displayOrder: row.display_order,
      }));

      return config;
    } catch (error: any) {
      console.error('❌ Error obteniendo configuración de campos:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        productType,
      });
      
      // Si es un error de tipo o tabla, usar configuración por defecto
      if (error.code === '42P01' || error.code === '42804' || error.message?.includes('does not exist')) {
        console.warn('⚠️ Usando configuración por defecto debido a error de base de datos.');
        return this.getDefaultFieldConfig(productType);
      }
      
      throw new ServiceUnavailableException(`Error al obtener configuración de campos: ${error.message}`);
    }
  }

  /**
   * Configuración por defecto de campos por tipo de producto
   * (Fallback si la tabla no existe o no hay datos)
   */
  private getDefaultFieldConfig(productType: string) {
    const baseFields = [
      { fieldName: 'name', isVisible: true, isRequired: true, displayOrder: 1 },
      { fieldName: 'description', isVisible: true, isRequired: false, displayOrder: 2 },
      { fieldName: 'image_url', isVisible: true, isRequired: false, displayOrder: 3 },
      { fieldName: 'price', isVisible: true, isRequired: true, displayOrder: 4 },
      { fieldName: 'category_id', isVisible: true, isRequired: true, displayOrder: 5 },
      { fieldName: 'product_type', isVisible: true, isRequired: true, displayOrder: 6 },
      { fieldName: 'is_available', isVisible: true, isRequired: false, displayOrder: 7 },
      { fieldName: 'is_featured', isVisible: true, isRequired: false, displayOrder: 8 },
      { fieldName: 'display_order', isVisible: true, isRequired: false, displayOrder: 9 },
      { fieldName: 'variant_groups', isVisible: true, isRequired: false, displayOrder: 10 },
    ];

    // Campos específicos según tipo
    // Para refacciones, accesorios y fluidos: no se muestran alérgenos ni información nutricional
    if (productType === 'refaccion' || productType === 'accesorio' || productType === 'fluido') {
      return [
        ...baseFields,
        { fieldName: 'allergens', isVisible: false, isRequired: false, displayOrder: 11 },
        { fieldName: 'nutritional_info', isVisible: false, isRequired: false, displayOrder: 12 },
        { fieldName: 'requires_prescription', isVisible: false, isRequired: false, displayOrder: 13 },
        { fieldName: 'age_restriction', isVisible: false, isRequired: false, displayOrder: 14 },
        { fieldName: 'max_quantity_per_order', isVisible: false, isRequired: false, displayOrder: 15 },
        { fieldName: 'requires_pharmacist_validation', isVisible: false, isRequired: false, displayOrder: 16 },
      ];
    } else if (productType === 'servicio_instalacion' || productType === 'servicio_mantenimiento') {
      return [
        ...baseFields,
        { fieldName: 'allergens', isVisible: false, isRequired: false, displayOrder: 11 },
        { fieldName: 'nutritional_info', isVisible: false, isRequired: false, displayOrder: 12 },
        { fieldName: 'requires_prescription', isVisible: true, isRequired: false, displayOrder: 13 },
        { fieldName: 'age_restriction', isVisible: true, isRequired: false, displayOrder: 14 },
        { fieldName: 'max_quantity_per_order', isVisible: true, isRequired: false, displayOrder: 15 },
        { fieldName: 'requires_pharmacist_validation', isVisible: true, isRequired: false, displayOrder: 16 },
      ];
    } else {
      // Otros tipos de producto (por defecto, todos los campos opcionales)
      return [
        ...baseFields,
        { fieldName: 'allergens', isVisible: false, isRequired: false, displayOrder: 11 },
        { fieldName: 'nutritional_info', isVisible: false, isRequired: false, displayOrder: 12 },
        { fieldName: 'requires_prescription', isVisible: false, isRequired: false, displayOrder: 13 },
        { fieldName: 'age_restriction', isVisible: false, isRequired: false, displayOrder: 14 },
        { fieldName: 'max_quantity_per_order', isVisible: false, isRequired: false, displayOrder: 15 },
        { fieldName: 'requires_pharmacist_validation', isVisible: false, isRequired: false, displayOrder: 16 },
      ];
    }
  }

  /**
   * Listar productos con filtros y paginación
   */
  async findAll(query: ListProductsDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const {
      page = 1,
      limit = 20,
      businessId,
      groupId,
      branchId,
      categoryId,
      isAvailable,
      isFeatured,
      search,
      sortBy = 'display_order',
      sortOrder = 'asc',
      vehicleBrandId,
      vehicleModelId,
      vehicleYearId,
      vehicleSpecId,
    } = query;

    const offset = (page - 1) * limit;
    const pool = dbPool;

    // Construir query SQL
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    let businessJoin = '';
    let branchJoin = '';

    // Si se filtra por grupo, buscar productos disponibles en sucursales del grupo
    // IMPORTANTE: No filtrar por business_id del producto, sino por disponibilidad en sucursales del grupo
    if (groupId) {
      // Buscar productos que tienen disponibilidad en sucursales del grupo
      branchJoin = `INNER JOIN catalog.product_branch_availability pba_group ON pba_group.product_id = p.id INNER JOIN core.businesses b_group ON pba_group.branch_id = b_group.id`;
      whereConditions.push(`b_group.business_group_id = $${paramIndex}`);
      whereConditions.push(`pba_group.is_enabled = TRUE`);
      whereConditions.push(`pba_group.is_active = TRUE`);
      queryParams.push(groupId);
      paramIndex++;
    } else if (businessId) {
      whereConditions.push(`p.business_id = $${paramIndex}`);
      queryParams.push(businessId);
      paramIndex++;
    }

    // Filtro por sucursal: filtrar productos disponibles en esa sucursal
    // Solo aplicar si NO estamos filtrando por grupo (ya que el grupo ya tiene su propio branchJoin)
    if (branchId && !groupId) {
      branchJoin = `INNER JOIN catalog.product_branch_availability pba ON pba.product_id = p.id`;
      whereConditions.push(`pba.branch_id = $${paramIndex}`);
      whereConditions.push(`pba.is_enabled = TRUE`);
      whereConditions.push(`pba.is_active = TRUE`);
      queryParams.push(branchId);
      paramIndex++;
    }

    // Filtro por categoría: incluir la categoría y todas sus subcategorías recursivamente
    let categoryCTE = '';
    let categoryWhere = '';
    if (categoryId) {
      // CTE recursiva para obtener todas las subcategorías (hijos, nietos, etc.)
      categoryCTE = `
        WITH RECURSIVE category_tree AS (
          -- Caso base: la categoría inicial
          SELECT id, parent_category_id, name
          FROM catalog.product_categories
          WHERE id = $${paramIndex}::UUID
          
          UNION ALL
          
          -- Caso recursivo: todas las subcategorías
          SELECT pc.id, pc.parent_category_id, pc.name
          FROM catalog.product_categories pc
          INNER JOIN category_tree ct ON pc.parent_category_id = ct.id
        )
      `;
      
      // Filtrar productos que pertenezcan a cualquier categoría en el árbol
      categoryWhere = `AND p.category_id IN (SELECT id FROM category_tree)`;
      queryParams.push(categoryId);
      paramIndex++;
    }

    if (isAvailable !== undefined) {
      whereConditions.push(`p.is_available = $${paramIndex}`);
      queryParams.push(isAvailable);
      paramIndex++;
    }

    if (isFeatured !== undefined) {
      whereConditions.push(`p.is_featured = $${paramIndex}`);
      queryParams.push(isFeatured);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    // Filtrado por compatibilidad de vehículos
    let compatibilityJoin = '';
    let compatibilityWhere = '';
    if (vehicleBrandId || vehicleModelId || vehicleYearId || vehicleSpecId) {
      // Solo filtrar productos de tipo refaccion o accesorio
      whereConditions.push(`p.product_type IN ('refaccion', 'accesorio')`);
      
      // Agregar JOIN con tabla de compatibilidad
      compatibilityJoin = `INNER JOIN catalog.product_vehicle_compatibility pvc ON pvc.product_id = p.id`;
      
      // Agregar condición de compatibilidad usando la función SQL
      const brandParam = paramIndex++;
      const modelParam = paramIndex++;
      const yearParam = paramIndex++;
      const specParam = paramIndex++;
      
      compatibilityWhere = `AND pvc.is_active = TRUE
        AND (
          pvc.is_universal = TRUE
          OR catalog.check_product_vehicle_compatibility(
            p.id,
            $${brandParam}::UUID,
            $${modelParam}::UUID,
            $${yearParam}::UUID,
            $${specParam}::UUID
          ) = TRUE
        )`;
      
      queryParams.push(
        vehicleBrandId || null,
        vehicleModelId || null,
        vehicleYearId || null,
        vehicleSpecId || null
      );
    }

    // Construir WHERE clause combinando todas las condiciones
    const allWhereConditions = [...whereConditions];
    if (categoryWhere) {
      // Si categoryWhere empieza con AND, removerlo y agregarlo como condición normal
      const categoryCondition = categoryWhere.replace(/^AND\s+/, '');
      allWhereConditions.push(categoryCondition);
    }
    if (compatibilityWhere) {
      // Si compatibilityWhere empieza con AND, removerlo y agregarlo como condición normal
      const compatibilityCondition = compatibilityWhere.replace(/^AND\s+/, '');
      allWhereConditions.push(compatibilityCondition);
    }
    
    const whereClause = allWhereConditions.length > 0
      ? `WHERE ${allWhereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación (usar queryParams antes de agregar limit/offset)
    const countQuery = `
      ${categoryCTE}
      SELECT COUNT(DISTINCT p.id) as total 
      FROM catalog.products p
      ${businessJoin}
      ${branchJoin}
      ${compatibilityJoin}
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal
    const orderBy = sortBy || 'display_order';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    const sortByMap: { [key: string]: string } = {
      'display_order': 'p.display_order',
      'name': 'p.name',
      'price': 'p.price',
      'created_at': 'p.created_at',
    };
    const orderByColumn = sortByMap[orderBy] || 'p.display_order';
    
    // Agregar limit y offset al final para la query principal
    queryParams.push(limit, offset);

    const sqlQuery = `
      ${categoryCTE}
      SELECT
        p.*,
        b.name as business_name,
        pc.name as category_name,
        pc.display_order as category_display_order,
        pc.business_id as category_business_id,
        -- Obtener el file_path de la imagen principal usando subconsulta escalar (funciona mejor con GROUP BY)
        -- IMPORTANTE: file_path debe ser una ruta relativa, no una URL completa
        (
          SELECT pi_sub.file_path
          FROM catalog.product_images pi_sub
          WHERE pi_sub.product_id = p.id
          AND pi_sub.is_active = TRUE
          ORDER BY pi_sub.is_primary DESC, pi_sub.display_order ASC
          LIMIT 1
        ) as primary_image_path,
        COALESCE(
          json_agg(
            json_build_object(
              'variant_group_id', vg.id,
              'variant_group_name', vg.name,
              'description', vg.description,
              'is_required', vg.is_required,
              'selection_type', vg.selection_type,
              'display_order', vg.display_order,
              'variants', (
                SELECT json_agg(
                  json_build_object(
                    'variant_id', v.id,
                    'variant_name', v.name,
                    'description', v.description,
                    'price_adjustment', v.price_adjustment,
                    'absolute_price', v.absolute_price,
                    'is_available', v.is_available,
                    'display_order', v.display_order
                  ) ORDER BY v.display_order
                )
                FROM catalog.product_variants v
                WHERE v.variant_group_id = vg.id
                AND v.is_available = TRUE
              )
            ) ORDER BY vg.display_order
          ) FILTER (WHERE vg.id IS NOT NULL),
          '[]'::json
        ) as variant_groups_structured
      FROM catalog.products p
      ${businessJoin}
      ${branchJoin}
      ${compatibilityJoin}
      LEFT JOIN core.businesses b ON p.business_id = b.id
      LEFT JOIN catalog.product_categories pc ON p.category_id = pc.id
      LEFT JOIN catalog.product_variant_groups vg ON vg.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.business_id, p.name, p.sku, p.description, p.image_url, p.price, p.product_type,
               p.category_id, p.is_available, p.is_featured, p.variants, p.nutritional_info,
               p.allergens, p.requires_prescription, p.age_restriction, p.max_quantity_per_order,
               p.requires_pharmacist_validation, p.display_order, p.created_at, p.updated_at,
               b.name, pc.name, pc.business_id, pc.display_order
      ORDER BY COALESCE(pc.display_order, 999) ASC, ${orderByColumn} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      // Log de la consulta SQL para debugging (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [findAll] SQL Query:', sqlQuery.substring(0, 1000));
        console.log('🔍 [findAll] Query Params:', queryParams);
      }
      
      const result = await pool.query(sqlQuery, queryParams);
      const data = result.rows || [];

      // Debug: Verificar qué está devolviendo la query para los primeros productos
      if (data.length > 0 && process.env.NODE_ENV !== 'production') {
        const productosConImagen = data.filter(r => r.primary_image_path).length;
        console.log('🔍 [findAll] Resultado SQL - Primeros productos:', {
          total: data.length,
          productosConImagen,
          productosSinImagen: data.length - productosConImagen,
          primerosProductos: data.slice(0, 5).map(r => ({
            id: r.id,
            name: r.name?.substring(0, 30),
            primary_image_path: r.primary_image_path, // Mostrar completo, no truncar
            primary_image_path_length: r.primary_image_path?.length || 0,
            isUrl: r.primary_image_path?.startsWith('http') || false,
            image_url: r.image_url,
          })),
        });
      }

      const mappedData = data.map((row, index) => {
          // Parsear variant_groups estructuradas
          let variantGroupsStructured = [];
          if (row.variant_groups_structured) {
            try {
              variantGroupsStructured = Array.isArray(row.variant_groups_structured) 
                ? row.variant_groups_structured 
                : JSON.parse(row.variant_groups_structured);
            } catch (e) {
              console.error('Error parseando variant_groups_structured:', e);
              variantGroupsStructured = [];
            }
          }

          // Parsear variant_groups antiguo (JSONB) para compatibilidad
          let variantGroupsLegacy = null;
          if (row.variants) {
            if (typeof row.variants === 'string') {
              try {
                variantGroupsLegacy = JSON.parse(row.variants);
              } catch (e) {
                console.error('Error parseando variants JSON:', e);
                variantGroupsLegacy = null;
              }
            } else {
              variantGroupsLegacy = row.variants;
            }
          }

          // Usar variantes estructuradas si existen, sino convertir legacy
          let variantGroups = variantGroupsStructured;
          
          if (variantGroups.length === 0 && variantGroupsLegacy) {
            // Convertir formato legacy a formato estructurado
            if (Array.isArray(variantGroupsLegacy)) {
              variantGroups = variantGroupsLegacy.map((group: any, index: number) => {
                const groupId = group.variant_group_id || `legacy-${index}`;
                return {
                  variant_group_id: groupId,
                  variant_group_name: group.name || group.variant_group_name || `Grupo ${index + 1}`,
                  description: group.description || null,
                  is_required: group.is_required || false,
                  selection_type: group.selection_type || 'single',
                  display_order: group.display_order || index,
                  variants: (group.variants || []).map((variant: any, vIndex: number) => ({
                    variant_id: variant.variant_id || `${groupId}-${vIndex}`,
                    variant_name: variant.name || variant.variant_name || `Variante ${vIndex + 1}`,
                    description: variant.description || null,
                    price_adjustment: variant.price_adjustment || 0,
                    absolute_price: variant.absolute_price || null,
                    is_available: variant.is_available !== undefined ? variant.is_available : true,
                    display_order: variant.display_order || vIndex,
                  })),
                };
              });
            }
          }

          // Generar URL pública de la imagen principal si existe
          // Usar la misma lógica que getProductImages para consistencia
          let primaryImageUrl: string | undefined = undefined;
          if (row.primary_image_path && supabaseAdmin) {
            try {
              const originalPath = row.primary_image_path;
              let finalPath: string | null = null;
              
              // Si ya es un path relativo (no empieza con http), usarlo directamente
              if (!originalPath.startsWith('http')) {
                finalPath = originalPath;
              } else {
                // Si es una URL completa, extraer directamente el patrón UUID/filename
                // PRIORIDAD 1: Buscar el patrón UUID/filename con extensión
                const uuidMatch = originalPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+\.(jpg|jpeg|png|webp|gif|svg))/i);
                if (uuidMatch && uuidMatch[1]) {
                  finalPath = uuidMatch[1];
                } else {
                  // PRIORIDAD 2: Buscar sin extensión
                  const uuidMatchNoExt = originalPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+)/i);
                  if (uuidMatchNoExt && uuidMatchNoExt[1]) {
                    finalPath = uuidMatchNoExt[1];
                  }
                }
              }
              
              // Debug logging SIEMPRE (no solo para los primeros 3) para ver qué está pasando
              console.log('🔍 [findAll] Procesando primary_image_path:', {
                productId: row.id,
                originalPath: originalPath?.substring(0, 200),
                finalPath,
                isUrl: originalPath?.startsWith('http') || false,
                finalPathIsUrl: finalPath?.startsWith('http') || false,
              });
              
              // Solo generar URL si tenemos un path relativo válido (no empieza con http)
              // IMPORTANTE: Verificar que finalPath NO sea una URL completa antes de pasarlo a getPublicUrl
              if (finalPath && !finalPath.startsWith('http') && !finalPath.startsWith('https') && finalPath.includes('/')) {
                // Verificar que finalPath tenga el formato correcto (UUID/filename)
                if (finalPath.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i)) {
                  // Asegurarse de que finalPath no contenga caracteres de URL
                  if (!finalPath.includes('://') && !finalPath.includes('.supabase.co') && !finalPath.includes('.storage.supabase.co')) {
                    const { data: urlData } = supabaseAdmin.storage
                      .from(this.BUCKET_NAME)
                      .getPublicUrl(finalPath);
                    primaryImageUrl = urlData.publicUrl;
                    
                    console.log('✅ [findAll] URL generada correctamente:', {
                      productId: row.id,
                      finalPath,
                      bucket: this.BUCKET_NAME,
                      primaryImageUrl: primaryImageUrl?.substring(0, 200),
                    });
                  } else {
                    console.error('❌ [findAll] finalPath contiene caracteres de URL:', {
                      productId: row.id,
                      finalPath: finalPath?.substring(0, 200),
                    });
                  }
                } else {
                  console.error('❌ [findAll] finalPath no tiene el formato correcto (UUID/filename):', {
                    productId: row.id,
                    finalPath: finalPath?.substring(0, 200),
                  });
                }
              } else {
                console.error('❌ [findAll] No se pudo extraer path relativo de primary_image_path:', {
                  productId: row.id,
                  originalPath: originalPath?.substring(0, 200),
                  finalPath: finalPath?.substring(0, 200) || null,
                  isUrl: originalPath?.startsWith('http') || false,
                  finalPathIsUrl: finalPath?.startsWith('http') || false,
                  hasSlash: finalPath?.includes('/') || false,
                });
              }
            } catch (error) {
              console.error('❌ [findAll] Error generando URL de imagen principal:', {
                productId: row.id,
                productName: row.name?.substring(0, 50),
                error: error instanceof Error ? error.message : String(error),
                primary_image_path: row.primary_image_path?.substring(0, 200),
              });
            }
          }

          return {
            id: row.id,
            business_id: row.business_id,
            business_name: row.business_name,
            name: row.name,
            sku: row.sku || null,
            description: row.description,
            image_url: row.image_url,
            primary_image_url: primaryImageUrl, // URL de la imagen principal de product_images
            price: parseFloat(row.price),
            product_type: row.product_type || 'refaccion',
            category_id: row.category_id,
            category_name: row.category_name,
            category_display_order: row.category_display_order || 999,
            is_available: row.is_available,
            is_featured: row.is_featured,
            variants: variantGroupsLegacy,
            variant_groups: variantGroups, // Usar variantes estructuradas
            nutritional_info: row.nutritional_info,
            allergens: row.allergens || [],
            requires_prescription: row.requires_prescription || false,
            age_restriction: row.age_restriction || null,
            max_quantity_per_order: row.max_quantity_per_order || null,
            requires_pharmacist_validation: row.requires_pharmacist_validation || false,
            display_order: row.display_order,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        });

      // Debug: Verificar que primary_image_url se está incluyendo en la respuesta
      if (mappedData.length > 0 && process.env.NODE_ENV !== 'production') {
        const productosConImagen = mappedData.filter(p => p.primary_image_url).length;
        console.log('🔍 [findAll] Resumen de productos con imágenes:', {
          total: mappedData.length,
          conImagen: productosConImagen,
          sinImagen: mappedData.length - productosConImagen,
          primerosProductos: mappedData.slice(0, 3).map(p => ({
            id: p.id,
            name: p.name?.substring(0, 30),
            hasPrimaryImageUrl: !!p.primary_image_url,
            primary_image_url: p.primary_image_url?.substring(0, 80) + '...',
          })),
        });
      }

      return {
        data: mappedData,
        pagination: {
          page,
          limit,
          total: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error ejecutando query de productos:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
      });
      console.error('❌ SQL Query que falló:', sqlQuery.substring(0, 500));
      console.error('❌ Query params:', queryParams);
      throw new ServiceUnavailableException(`Error al obtener productos: ${error.message}`);
    }
  }

  /**
   * Obtener un producto por ID
   */
  async findOne(id: string, branchId?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Si se proporciona branchId, incluir datos de disponibilidad de la sucursal
    const branchAvailabilitySelect = branchId 
      ? `, pba.price as branch_price, pba.stock as branch_stock, pba.is_enabled as branch_is_enabled`
      : '';
    
    const branchAvailabilityJoin = branchId
      ? `LEFT JOIN catalog.product_branch_availability pba ON pba.product_id = p.id AND pba.branch_id = $2 AND COALESCE(pba.is_active, TRUE) = TRUE`
      : '';

    const sqlQuery = `
      SELECT 
        p.*,
        b.name as business_name,
        pc.name as category_name,
        pc.business_id as category_business_id
        ${branchAvailabilitySelect},
        -- Obtener la imagen principal de product_images
        pi_main.file_path as primary_image_path,
        COALESCE(
          json_agg(
            json_build_object(
              'variant_group_id', vg.id,
              'variant_group_name', vg.name,
              'description', vg.description,
              'is_required', vg.is_required,
              'selection_type', vg.selection_type,
              'display_order', vg.display_order,
              'variants', (
                SELECT json_agg(
                  json_build_object(
                    'variant_id', v.id,
                    'variant_name', v.name,
                    'description', v.description,
                    'price_adjustment', v.price_adjustment,
                    'absolute_price', v.absolute_price,
                    'is_available', v.is_available,
                    'display_order', v.display_order
                  ) ORDER BY v.display_order
                )
                FROM catalog.product_variants v
                WHERE v.variant_group_id = vg.id
                AND v.is_available = TRUE
              )
            ) ORDER BY vg.display_order
          ) FILTER (WHERE vg.id IS NOT NULL),
          '[]'::json
        ) as variant_groups_structured
      FROM catalog.products p
      LEFT JOIN core.businesses b ON p.business_id = b.id
      LEFT JOIN catalog.product_categories pc ON p.category_id = pc.id
      LEFT JOIN catalog.product_variant_groups vg ON vg.product_id = p.id
      -- LEFT JOIN para obtener la imagen principal (primera imagen activa ordenada por is_primary y display_order)
      LEFT JOIN LATERAL (
        SELECT pi_lat.file_path
        FROM catalog.product_images pi_lat
        WHERE pi_lat.product_id = p.id
        AND pi_lat.is_active = TRUE
        ORDER BY pi_lat.is_primary DESC, pi_lat.display_order ASC
        LIMIT 1
      ) pi_main ON TRUE
      ${branchAvailabilityJoin}
      WHERE p.id = $1
      GROUP BY p.id, p.business_id, p.name, p.sku, p.description, p.image_url, p.price, p.product_type,
               p.category_id, p.is_available, p.is_featured, p.variants, p.nutritional_info,
               p.allergens, p.requires_prescription, p.age_restriction, p.max_quantity_per_order,
               p.requires_pharmacist_validation, p.display_order, p.created_at, p.updated_at,
               b.name, pc.name, pc.business_id, pi_main.file_path${branchId ? ', pba.price, pba.stock, pba.is_enabled' : ''}
    `;

    try {
      const queryParams = branchId ? [id, branchId] : [id];
      const result = await pool.query(sqlQuery, queryParams);
      
      if (result.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      const row = result.rows[0];

      // Parsear variant_groups estructuradas
      let variantGroupsStructured = [];
      if (row.variant_groups_structured) {
        try {
          variantGroupsStructured = Array.isArray(row.variant_groups_structured) 
            ? row.variant_groups_structured 
            : JSON.parse(row.variant_groups_structured);
        } catch (e) {
          console.error('Error parseando variant_groups_structured:', e);
          variantGroupsStructured = [];
        }
      }

      // Parsear variant_groups antiguo (JSONB) para compatibilidad
      let variantGroupsLegacy = null;
      if (row.variants) {
        console.log('🔍 Campo variants encontrado:', {
          type: typeof row.variants,
          isArray: Array.isArray(row.variants),
          value: JSON.stringify(row.variants).substring(0, 200),
        });
        
        if (typeof row.variants === 'string') {
          try {
            variantGroupsLegacy = JSON.parse(row.variants);
            console.log('✅ Variants parseado desde string');
          } catch (e) {
            console.error('❌ Error parseando variants JSON:', e);
            variantGroupsLegacy = null;
          }
        } else {
          variantGroupsLegacy = row.variants;
          console.log('✅ Variants ya es objeto/array');
        }
      } else {
        console.log('⚠️  No hay campo variants en row');
      }

      // Convertir formato legacy a formato estructurado si es necesario
      let variantGroups = variantGroupsStructured;
      
      if (variantGroups.length === 0 && variantGroupsLegacy) {
        console.log('🔄 Convirtiendo formato legacy a estructurado...');
        
        // El formato legacy puede venir como array de objetos con estructura:
        // [{ name: "Grupo", variants: [{ name: "Variante", ... }], ... }]
        if (Array.isArray(variantGroupsLegacy)) {
          variantGroups = variantGroupsLegacy.map((group: any, index: number) => {
            // Generar IDs temporales si no existen
            const groupId = group.variant_group_id || `legacy-${index}`;
            
            return {
              variant_group_id: groupId,
              variant_group_name: group.name || group.variant_group_name || `Grupo ${index + 1}`,
              description: group.description || null,
              is_required: group.is_required || false,
              selection_type: group.selection_type || 'single',
              display_order: group.display_order || index,
              variants: (group.variants || []).map((variant: any, vIndex: number) => ({
                variant_id: variant.variant_id || `${groupId}-${vIndex}`,
                variant_name: variant.name || variant.variant_name || `Variante ${vIndex + 1}`,
                description: variant.description || null,
                price_adjustment: variant.price_adjustment || 0,
                absolute_price: variant.absolute_price || null,
                is_available: variant.is_available !== undefined ? variant.is_available : true,
                display_order: variant.display_order || vIndex,
              })),
            };
          });
        } else if (typeof variantGroupsLegacy === 'object') {
          // Formato legacy como objeto: { "Tamaño": ["pequeño", "mediano"], ... }
          variantGroups = Object.entries(variantGroupsLegacy).map(([groupName, variants]: [string, any], index: number) => {
            const groupId = `legacy-${index}`;
            const variantArray = Array.isArray(variants) ? variants : [];
            
            return {
              variant_group_id: groupId,
              variant_group_name: groupName,
              description: null,
              is_required: false,
              selection_type: 'single',
              display_order: index,
              variants: variantArray.map((variant: any, vIndex: number) => {
                // Si es string, crear objeto básico
                if (typeof variant === 'string') {
                  return {
                    variant_id: `${groupId}-${vIndex}`,
                    variant_name: variant,
                    description: null,
                    price_adjustment: 0,
                    absolute_price: null,
                    is_available: true,
                    display_order: vIndex,
                  };
                }
                // Si ya es objeto, mapear campos
                return {
                  variant_id: variant.variant_id || `${groupId}-${vIndex}`,
                  variant_name: variant.name || variant.variant_name || `Variante ${vIndex + 1}`,
                  description: variant.description || null,
                  price_adjustment: variant.price_adjustment || 0,
                  absolute_price: variant.absolute_price || null,
                  is_available: variant.is_available !== undefined ? variant.is_available : true,
                  display_order: variant.display_order || vIndex,
                };
              }),
            };
          });
        }
        
        console.log('✅ Variantes legacy convertidas:', variantGroups.length);
      }

      console.log('🔍 Variantes encontradas:', {
        structured: variantGroupsStructured.length,
        legacy: variantGroupsLegacy ? (Array.isArray(variantGroupsLegacy) ? variantGroupsLegacy.length : Object.keys(variantGroupsLegacy).length) : 0,
        final: variantGroups.length,
      });

      // Generar URL pública de la imagen principal si existe
      let primaryImageUrl: string | undefined = undefined;
      if (row.primary_image_path && supabaseAdmin) {
        try {
          const originalPath = row.primary_image_path;
          let finalPath: string | null = null;
          
          // Si ya es un path relativo (no empieza con http), usarlo directamente
          if (!originalPath.startsWith('http')) {
            finalPath = originalPath;
          } else {
            // Si es una URL completa, extraer directamente el patrón UUID/filename
            // PRIORIDAD 1: Buscar el patrón UUID/filename con extensión
            const uuidMatch = originalPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+\.(jpg|jpeg|png|webp|gif|svg))/i);
            if (uuidMatch) {
              finalPath = uuidMatch[1];
            } else {
              // PRIORIDAD 2: Buscar sin extensión
              const uuidMatchNoExt = originalPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+)/i);
              if (uuidMatchNoExt) {
                finalPath = uuidMatchNoExt[1];
              }
            }
          }
          
          // Solo generar URL si tenemos un path relativo válido (no empieza con http)
          if (finalPath && !finalPath.startsWith('http')) {
            const { data: urlData } = supabaseAdmin.storage
              .from(this.BUCKET_NAME)
              .getPublicUrl(finalPath);
            primaryImageUrl = urlData.publicUrl;
          } else {
            console.error('❌ [findOne] No se pudo extraer path relativo de primary_image_path:', {
              productId: row.id,
              originalPath: originalPath?.substring(0, 200),
              finalPath: finalPath?.substring(0, 200) || null,
            });
          }
        } catch (error) {
          console.error('❌ [findOne] Error generando URL de imagen principal:', {
            productId: row.id,
            error: error instanceof Error ? error.message : String(error),
            primary_image_path: row.primary_image_path?.substring(0, 200),
          });
        }
      }

      return {
        id: row.id,
        business_id: row.business_id,
        business_name: row.business_name,
        name: row.name,
        sku: row.sku || null,
        description: row.description,
        image_url: row.image_url,
        primary_image_url: primaryImageUrl, // URL de la imagen principal de product_images
        price: parseFloat(row.price),
        product_type: row.product_type || 'refaccion', // Valor por defecto para productos existentes
        category_id: row.category_id,
        category_name: row.category_name,
        is_available: row.is_available,
        is_featured: row.is_featured,
        variants: variantGroupsLegacy, // Mantener para compatibilidad
        variant_groups: variantGroups, // Usar estructuradas si existen
        nutritional_info: row.nutritional_info,
        allergens: row.allergens || [],
        // Datos específicos de la sucursal (si branchId fue proporcionado)
        branch_price: branchId && row.branch_price !== null && row.branch_price !== undefined 
          ? parseFloat(row.branch_price.toString()) 
          : undefined,
        branch_stock: branchId && row.branch_stock !== null && row.branch_stock !== undefined 
          ? parseInt(row.branch_stock.toString(), 10) 
          : undefined,
        branch_is_enabled: branchId && row.branch_is_enabled !== null && row.branch_is_enabled !== undefined
          ? row.branch_is_enabled
          : undefined,
        // Campos de farmacia
        requires_prescription: row.requires_prescription || false,
        age_restriction: row.age_restriction || null,
        max_quantity_per_order: row.max_quantity_per_order || null,
        requires_pharmacist_validation: row.requires_pharmacist_validation || false,
        display_order: row.display_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error ejecutando query de producto:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al obtener producto');
    }
  }

  /**
   * Crear un nuevo producto
   */
  async create(createProductDto: CreateProductDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Validar que el negocio existe
    const businessCheck = await pool.query(
      'SELECT id FROM core.businesses WHERE id = $1',
      [createProductDto.business_id]
    );
    if (businessCheck.rows.length === 0) {
      throw new BadRequestException('El negocio especificado no existe');
    }

    // Validar que la categoría existe si se proporciona
    if (createProductDto.category_id && createProductDto.category_id.trim() !== '') {
      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(createProductDto.category_id)) {
        throw new BadRequestException('El category_id debe ser un UUID válido');
      }
      
      const categoryCheck = await pool.query(
        'SELECT id FROM catalog.product_categories WHERE id = $1',
        [createProductDto.category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new BadRequestException('La categoría especificada no existe');
      }
    }

    // Validar que el SKU sea único dentro del negocio si se proporciona
    if (createProductDto.sku && createProductDto.sku.trim() !== '') {
      const skuCheck = await pool.query(
        'SELECT id FROM catalog.products WHERE business_id = $1 AND sku = $2',
        [createProductDto.business_id, createProductDto.sku.trim()]
      );
      if (skuCheck.rows.length > 0) {
        throw new BadRequestException('Ya existe un producto con este SKU en este negocio');
      }
    }

    const sqlQuery = `
      INSERT INTO catalog.products (
        business_id, name, sku, description, image_url, price, product_type, category_id,
        is_available, is_featured, variants, nutritional_info, allergens,
        display_order, requires_prescription, age_restriction, max_quantity_per_order,
        requires_pharmacist_validation
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;

    try {
      // Manejar variant_groups: si viene variant_groups, usarlo; si no, usar variants (deprecated)
      let variantsData: string | null = null;
      if (createProductDto.variant_groups !== undefined) {
        if (Array.isArray(createProductDto.variant_groups)) {
          if (createProductDto.variant_groups.length === 0) {
            // Array vacío: guardar como '[]'
            variantsData = '[]';
            console.log('🔍 [CREATE] variant_groups está vacío, guardando como []');
          } else {
            // Sanitizar grupos para asegurar que cada uno tenga su array de variants
            const sanitizedGroups = createProductDto.variant_groups.map((group: any) => {
              const sanitizedGroup = { ...group };
              // Asegurarse de que variants sea un array
              if (!Array.isArray(sanitizedGroup.variants)) {
                sanitizedGroup.variants = [];
              }
              return sanitizedGroup;
            });
            variantsData = JSON.stringify(sanitizedGroups);
            console.log('🔍 [CREATE] Guardando variant_groups (sanitizado):', variantsData);
            console.log('🔍 [CREATE] Estructura original:', JSON.stringify(createProductDto.variant_groups, null, 2));
          }
        } else if (createProductDto.variant_groups) {
          variantsData = JSON.stringify(createProductDto.variant_groups);
          console.log('🔍 [CREATE] Guardando variant_groups (no array):', variantsData);
        }
      } else if (createProductDto.variants) {
        variantsData = JSON.stringify(createProductDto.variants);
        console.log('🔍 [CREATE] Guardando variants (deprecated):', variantsData);
      }

      // Manejar allergens: convertir array a formato PostgreSQL TEXT[]
      // Si es null, undefined, o array vacío, usar null
      let allergensData: string[] | null = null;
      if (createProductDto.allergens && Array.isArray(createProductDto.allergens) && createProductDto.allergens.length > 0) {
        allergensData = createProductDto.allergens.filter(a => a && typeof a === 'string' && a.trim().length > 0);
        // Si después de filtrar está vacío, usar null
        if (allergensData.length === 0) {
          allergensData = null;
        }
      }

      // Normalizar image_url: si está vacío o es solo espacios, usar null
      const imageUrl = createProductDto.image_url && createProductDto.image_url.trim() !== '' 
        ? createProductDto.image_url.trim() 
        : null;

      // Normalizar SKU: si está vacío o es solo espacios, usar null
      const skuValue = createProductDto.sku && createProductDto.sku.trim() !== '' 
        ? createProductDto.sku.trim() 
        : null;

      const queryParams = [
        createProductDto.business_id,
        createProductDto.name,
        skuValue,
        createProductDto.description || null,
        imageUrl,
        createProductDto.price,
        createProductDto.product_type,
        (createProductDto.category_id && createProductDto.category_id.trim() !== '') ? createProductDto.category_id : null,
        createProductDto.is_available !== undefined ? createProductDto.is_available : true,
        createProductDto.is_featured !== undefined ? createProductDto.is_featured : false,
        variantsData,
        createProductDto.nutritional_info ? JSON.stringify(createProductDto.nutritional_info) : null,
        allergensData,
        createProductDto.display_order || 0,
        createProductDto.requires_prescription || false,
        createProductDto.age_restriction || null,
        createProductDto.max_quantity_per_order || null,
        createProductDto.requires_pharmacist_validation || false,
      ];

      console.log('🔍 [CREATE] Intentando crear producto con parámetros:', {
        business_id: queryParams[0],
        name: queryParams[1],
        sku: queryParams[2],
        sku_original: createProductDto.sku,
        product_type: queryParams[6],
        allergens: queryParams[12],
        allergens_type: typeof queryParams[12],
        allergens_is_array: Array.isArray(queryParams[12]),
      });

      const result = await pool.query(sqlQuery, queryParams);
      
      // Verificar qué se guardó en la base de datos
      const savedRow = result.rows[0];
      console.log('🔍 [CREATE] Producto guardado:', {
        id: savedRow.id,
        name: savedRow.name,
        sku: savedRow.sku,
        sku_type: typeof savedRow.sku,
        variants: savedRow.variants ? 'present' : 'null',
      });
      if (savedRow.variants) {
        console.log('🔍 [CREATE] Variants como string:', JSON.stringify(savedRow.variants));
      }

      return this.findOne(result.rows[0].id);
    } catch (error: any) {
      console.error('❌ Error creando producto:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        internalPosition: error.internalPosition,
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        constraint: error.constraint,
        file: error.file,
        line: error.line,
        routine: error.routine,
        stack: error.stack,
      });
      // También loguear el error completo
      console.error('❌ Error completo:', error);
      throw new ServiceUnavailableException(`Error al crear producto: ${error.message}`);
    }
  }

  /**
   * Actualizar un producto
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    console.log('🔵 [UPDATE] ============================================');
    console.log('🔵 [UPDATE] Iniciando actualización de producto');
    console.log('🔵 [UPDATE] Product ID:', id);
    console.log('🔵 [UPDATE] DTO recibido:', JSON.stringify(updateProductDto, null, 2));
    console.log('🔵 [UPDATE] variant_groups:', updateProductDto.variant_groups);
    console.log('🔵 [UPDATE] variant_groups type:', typeof updateProductDto.variant_groups);
    console.log('🔵 [UPDATE] variant_groups isArray:', Array.isArray(updateProductDto.variant_groups));
    console.log('🔵 [UPDATE] variant_groups length:', Array.isArray(updateProductDto.variant_groups) ? updateProductDto.variant_groups.length : 'N/A');
    
    if (!dbPool) {
      console.error('❌ [UPDATE] No hay conexión a base de datos');
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Declarar variables fuera del try para que estén disponibles en el catch
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    let sqlQuery = '';

    try {
      // Verificar que el producto existe
      console.log('🔵 [UPDATE] Verificando que el producto existe...');
      const existing = await this.findOne(id);
      console.log('🔵 [UPDATE] Producto encontrado:', existing.id);

      // Validar que la categoría existe si se proporciona
      if (updateProductDto.category_id && updateProductDto.category_id.trim() !== '') {
        console.log('🔵 [UPDATE] Validando category_id...');
        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(updateProductDto.category_id)) {
          throw new BadRequestException('El category_id debe ser un UUID válido');
        }
        
        const categoryCheck = await pool.query(
          'SELECT id FROM catalog.product_categories WHERE id = $1',
          [updateProductDto.category_id]
        );
        if (categoryCheck.rows.length === 0) {
          throw new BadRequestException('La categoría especificada no existe');
        }
        console.log('🔵 [UPDATE] category_id válido');
      }

      // Construir query de actualización dinámicamente
      console.log('🔵 [UPDATE] Construyendo query de actualización...');

      // Validar que el SKU sea único dentro del negocio si se proporciona y es diferente al actual
      if (updateProductDto.sku !== undefined) {
        // Normalizar SKU: si está vacío o es solo espacios, usar null
        const skuValue = updateProductDto.sku && updateProductDto.sku.trim() !== '' 
          ? updateProductDto.sku.trim() 
          : null;
        
        console.log('🔵 [UPDATE] Actualizando SKU:', {
          product_id: id,
          sku_original: updateProductDto.sku,
          sku_normalized: skuValue,
        });
        
        if (skuValue) {
          const skuCheck = await pool.query(
            'SELECT id FROM catalog.products WHERE business_id = $1 AND sku = $2 AND id != $3',
            [existing.business_id, skuValue, id]
          );
          if (skuCheck.rows.length > 0) {
            throw new BadRequestException('Ya existe un producto con este SKU en este negocio');
          }
        }
        updateFields.push(`sku = $${paramIndex}`);
        updateValues.push(skuValue);
        paramIndex++;
      }

      if (updateProductDto.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        updateValues.push(updateProductDto.name);
        paramIndex++;
      }

      if (updateProductDto.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(updateProductDto.description);
        paramIndex++;
      }

      if (updateProductDto.image_url !== undefined) {
        // Normalizar image_url: si está vacío o es solo espacios, usar null
        let imageUrl = updateProductDto.image_url && updateProductDto.image_url.trim() !== '' 
          ? updateProductDto.image_url.trim() 
          : null;

        // Si es un data URI, subirlo a Supabase Storage y obtener la URL pública
        if (imageUrl && this.isDataUri(imageUrl)) {
          console.log('🔵 [UPDATE] Detectado data URI, subiendo a Supabase Storage...');
          try {
            imageUrl = await this.uploadImageFromDataUri(id, imageUrl);
            console.log('✅ [UPDATE] Imagen subida exitosamente, URL pública:', imageUrl);
          } catch (error: any) {
            console.error('❌ [UPDATE] Error subiendo imagen desde data URI:', error);
            // Si falla la subida, mantener la imagen existente del producto
            // o usar null si no hay imagen previa
            const existingProduct = await this.findOne(id);
            if (existingProduct.image_url && !this.isDataUri(existingProduct.image_url)) {
              // Si el producto ya tiene una URL válida (no data URI), mantenerla
              console.log('⚠️ [UPDATE] Manteniendo imagen existente debido a error en subida');
              imageUrl = existingProduct.image_url;
            } else {
              // Si no hay imagen válida, usar null
              console.log('⚠️ [UPDATE] No se pudo subir imagen y no hay imagen previa, usando null');
              imageUrl = null;
            }
            // No lanzar error, solo loguear y continuar con la imagen existente o null
          }
        }

        updateFields.push(`image_url = $${paramIndex}`);
        updateValues.push(imageUrl);
        paramIndex++;
      }

      if (updateProductDto.price !== undefined) {
        updateFields.push(`price = $${paramIndex}`);
        updateValues.push(updateProductDto.price);
        paramIndex++;
      }

      if (updateProductDto.category_id !== undefined) {
        // Normalizar category_id: si está vacío o es solo espacios, usar null
        const categoryId = (updateProductDto.category_id && updateProductDto.category_id.trim() !== '') 
          ? updateProductDto.category_id 
          : null;
        updateFields.push(`category_id = $${paramIndex}`);
        updateValues.push(categoryId);
        paramIndex++;
      }

      if (updateProductDto.is_available !== undefined) {
        updateFields.push(`is_available = $${paramIndex}`);
        updateValues.push(updateProductDto.is_available);
        paramIndex++;
      }

      if (updateProductDto.is_featured !== undefined) {
        updateFields.push(`is_featured = $${paramIndex}`);
        updateValues.push(updateProductDto.is_featured);
        paramIndex++;
      }

      if (updateProductDto.product_type !== undefined) {
        updateFields.push(`product_type = $${paramIndex}`);
        updateValues.push(updateProductDto.product_type);
        paramIndex++;
      }

      if (updateProductDto.variant_groups !== undefined) {
        console.log('🔵 [UPDATE] Procesando variant_groups...');
        // Manejar variant_groups de la misma manera que en create
        let variantGroupsValue: string | null = null;
        if (Array.isArray(updateProductDto.variant_groups)) {
          if (updateProductDto.variant_groups.length === 0) {
            // Array vacío: guardar como '[]'
            variantGroupsValue = '[]';
            console.log('🔵 [UPDATE] variant_groups está vacío, guardando como []');
          } else {
            // Sanitizar grupos para asegurar que cada uno tenga su array de variants
            const sanitizedGroups = updateProductDto.variant_groups.map((group: any) => {
              const sanitizedGroup = { ...group };
              // Asegurarse de que variants sea un array
              if (!Array.isArray(sanitizedGroup.variants)) {
                sanitizedGroup.variants = [];
              }
              return sanitizedGroup;
            });
            variantGroupsValue = JSON.stringify(sanitizedGroups);
            console.log('🔵 [UPDATE] Guardando variant_groups (sanitizado):', variantGroupsValue);
          }
        } else if (updateProductDto.variant_groups) {
          // Si no es array pero tiene valor, stringificarlo
          variantGroupsValue = JSON.stringify(updateProductDto.variant_groups);
          console.log('🔵 [UPDATE] Guardando variant_groups (no array):', variantGroupsValue);
        }
        // Usar casting a JSONB solo si el valor no es null
        if (variantGroupsValue !== null) {
          updateFields.push(`variants = $${paramIndex}::jsonb`);
          console.log('🔵 [UPDATE] Agregando variants con casting JSONB, valor:', variantGroupsValue);
        } else {
          updateFields.push(`variants = $${paramIndex}`);
          console.log('🔵 [UPDATE] Agregando variants sin casting (null)');
        }
        updateValues.push(variantGroupsValue);
        paramIndex++;
      } else if (updateProductDto.variants !== undefined) {
      const variantsValue = Array.isArray(updateProductDto.variants) && updateProductDto.variants.length === 0
        ? '[]'
        : (updateProductDto.variants ? JSON.stringify(updateProductDto.variants) : null);
      // Usar casting a JSONB para asegurar que PostgreSQL lo acepte correctamente
      updateFields.push(`variants = $${paramIndex}::jsonb`);
      updateValues.push(variantsValue);
      paramIndex++;
      }

      if (updateProductDto.nutritional_info !== undefined) {
        updateFields.push(`nutritional_info = $${paramIndex}`);
        updateValues.push(updateProductDto.nutritional_info ? JSON.stringify(updateProductDto.nutritional_info) : null);
        paramIndex++;
      }

      if (updateProductDto.allergens !== undefined) {
        // Manejar allergens: convertir array a formato PostgreSQL TEXT[]
        // Si es null, undefined, o array vacío, usar null
        let allergensData: string[] | null = null;
        if (updateProductDto.allergens && Array.isArray(updateProductDto.allergens) && updateProductDto.allergens.length > 0) {
          allergensData = updateProductDto.allergens.filter(a => a && typeof a === 'string' && a.trim().length > 0);
          // Si después de filtrar está vacío, usar null
          if (allergensData.length === 0) {
            allergensData = null;
          }
        }
        updateFields.push(`allergens = $${paramIndex}`);
        updateValues.push(allergensData);
        paramIndex++;
      }

      if (updateProductDto.display_order !== undefined) {
        updateFields.push(`display_order = $${paramIndex}`);
        updateValues.push(updateProductDto.display_order);
        paramIndex++;
      }

      // Campos de farmacia
      if (updateProductDto.requires_prescription !== undefined) {
        updateFields.push(`requires_prescription = $${paramIndex}`);
        updateValues.push(updateProductDto.requires_prescription);
        paramIndex++;
      }

      if (updateProductDto.age_restriction !== undefined) {
        updateFields.push(`age_restriction = $${paramIndex}`);
        updateValues.push(updateProductDto.age_restriction || null);
        paramIndex++;
      }

      if (updateProductDto.max_quantity_per_order !== undefined) {
        updateFields.push(`max_quantity_per_order = $${paramIndex}`);
        updateValues.push(updateProductDto.max_quantity_per_order || null);
        paramIndex++;
      }

      if (updateProductDto.requires_pharmacist_validation !== undefined) {
        updateFields.push(`requires_pharmacist_validation = $${paramIndex}`);
        updateValues.push(updateProductDto.requires_pharmacist_validation);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        console.log('🔵 [UPDATE] No hay campos para actualizar, retornando producto existente');
        return existing;
      }

      // Agregar updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      updateValues.push(id);

      sqlQuery = `
        UPDATE catalog.products
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      console.log('🔵 [UPDATE] Query SQL construida:');
      console.log('🔵 [UPDATE] SQL:', sqlQuery);
      console.log('🔵 [UPDATE] Valores a actualizar:', JSON.stringify(updateValues, null, 2));
      console.log('🔵 [UPDATE] Número de parámetros:', paramIndex);
      console.log('🔵 [UPDATE] Campos a actualizar:', updateFields);
      
      console.log('🔵 [UPDATE] Ejecutando query SQL...');
      const result = await pool.query(sqlQuery, updateValues);
      console.log('🔵 [UPDATE] Query ejecutada exitosamente');
      
      // Verificar qué se guardó en la base de datos
      if (result.rows.length > 0) {
        const savedRow = result.rows[0];
        console.log('🔵 [UPDATE] Producto actualizado exitosamente:', {
          id: savedRow.id,
          name: savedRow.name,
          sku: savedRow.sku,
          sku_type: typeof savedRow.sku,
          variants: savedRow.variants ? 'present' : 'null',
        });
        if (savedRow.variants) {
          console.log('🔵 [UPDATE] Variants guardados:', JSON.stringify(savedRow.variants, null, 2));
        }
      } else {
        console.warn('⚠️ [UPDATE] No se actualizó ningún producto. El ID puede no existir:', id);
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      
      console.log('🔵 [UPDATE] Obteniendo producto actualizado...');
      const updatedProduct = await this.findOne(id);
      console.log('🔵 [UPDATE] ============================================');
      return updatedProduct;
    } catch (error: any) {
      console.error('❌ [UPDATE] ============================================');
      console.error('❌ [UPDATE] ERROR ACTUALIZANDO PRODUCTO');
      console.error('❌ [UPDATE] Mensaje:', error.message);
      console.error('❌ [UPDATE] Código:', error.code);
      console.error('❌ [UPDATE] Detalle:', error.detail);
      console.error('❌ [UPDATE] Hint:', error.hint);
      console.error('❌ [UPDATE] Stack:', error.stack);
      console.error('❌ [UPDATE] Product ID:', id);
      console.error('❌ [UPDATE] Update Fields:', updateFields);
      console.error('❌ [UPDATE] Update Values:', JSON.stringify(updateValues, null, 2));
      if (typeof sqlQuery !== 'undefined') {
        console.error('❌ [UPDATE] SQL Query:', sqlQuery);
      }
      console.error('❌ [UPDATE] variant_groups recibido:', JSON.stringify(updateProductDto.variant_groups, null, 2));
      console.error('❌ [UPDATE] ============================================');
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException('Ya existe un producto con estos datos únicos');
      }
      
      if (error.code === '23503') { // Foreign key violation
        throw new BadRequestException('Referencia inválida: uno de los valores proporcionados no existe');
      }
      
      if (error.code === '23502') { // NOT NULL violation
        throw new BadRequestException('Faltan campos requeridos');
      }
      
      throw new ServiceUnavailableException(`Error al actualizar producto: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
   * Eliminar lógicamente un producto (marcar como no disponible)
   */
  async remove(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el producto existe
    const existing = await this.findOne(id);

    // Verificar si está en pedidos activos o entregados recientemente
    const ordersCheck = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders.order_items oi
       JOIN orders.orders o ON oi.order_id = o.id
       WHERE oi.product_id = $1 
       AND o.status NOT IN ('cancelled', 'refunded')
       AND o.created_at > CURRENT_DATE - INTERVAL '30 days'`,
      [id]
    );
    const orderCount = parseInt(ordersCheck.rows[0].count, 10);

    // Eliminación lógica: marcar como no disponible
    const sqlQuery = `
      UPDATE catalog.products
      SET is_available = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      await pool.query(sqlQuery, [id]);
      return { 
        message: 'Producto desactivado exitosamente',
        warning: orderCount > 0 ? `Este producto tiene ${orderCount} pedido(s) en los últimos 30 días` : undefined
      };
    } catch (error: any) {
      console.error('❌ Error eliminando producto:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al eliminar producto');
    }
  }

  /**
   * Obtener disponibilidad de un producto en todas las sucursales
   * @param productId ID del producto
   * @param groupId Opcional: filtrar por grupo empresarial
   * @param brandId Opcional: filtrar por marca de vehículo (solo sucursales que venden productos de esa marca)
   */
  async getProductBranchAvailability(productId: string, groupId?: string, brandId?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      // Verificar que el producto existe
      const productCheck = await pool.query('SELECT id FROM catalog.products WHERE id = $1', [productId]);
      if (productCheck.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Construir condiciones de filtrado
      // IMPORTANTE: Devolver TODAS las sucursales (activas e inactivas) para que el frontend pueda gestionarlas
      // El frontend decidirá si deshabilitar el checkbox basándose en is_active
      let whereConditions: string[] = [];
      const queryParams: any[] = [productId];
      let paramIndex = 2;
      let brandJoin = '';

      // Filtrar por grupo: solo sucursales que pertenecen al grupo
      if (groupId) {
        whereConditions.push(`b.business_group_id = $${paramIndex}`);
        queryParams.push(groupId);
        paramIndex++;
      }

      // Filtrar por marca: solo sucursales que venden productos de esa marca
      // Y que el producto actual sea compatible con esa marca
      if (brandId) {
        // Verificar que el producto sea compatible con la marca
        whereConditions.push(`EXISTS (
          SELECT 1 FROM catalog.product_vehicle_compatibility pvc
          WHERE pvc.product_id = $1 
          AND pvc.vehicle_brand_id = $${paramIndex} 
          AND pvc.is_active = TRUE
        )`);
        queryParams.push(brandId);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Consulta: obtener TODAS las sucursales (activas e inactivas) con su disponibilidad
      // Usar LEFT JOIN para incluir sucursales sin disponibilidad configurada
      const sqlQuery = `
        SELECT DISTINCT
          b.id AS branch_id,
          b.name AS branch_name,
          b.slug AS branch_slug,
          b.phone AS branch_phone,
          b.is_active AS branch_is_active,
          COALESCE(pba.is_enabled, FALSE) AS is_enabled,
          pba.price,
          pba.stock,
          -- Construir dirección completa desde core.addresses si existe
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
          ) AS branch_address
        FROM core.businesses b
        LEFT JOIN catalog.product_branch_availability pba 
          ON b.id = pba.branch_id 
          AND pba.product_id = $1
          AND COALESCE(pba.is_active, TRUE) = TRUE
        LEFT JOIN core.addresses a ON b.address_id = a.id
        ${whereClause}
        ORDER BY COALESCE(pba.is_enabled, FALSE) DESC, b.is_active DESC, b.name ASC
      `;

      const result = await pool.query(sqlQuery, queryParams);
      
      return {
        availabilities: result.rows.map(row => ({
          branch_id: row.branch_id,
          branch_name: row.branch_name,
          branch_slug: row.branch_slug || null,
          branch_address: row.branch_address || null,
          branch_phone: row.branch_phone || null,
          is_enabled: row.is_enabled || false,
          price: row.price !== null && row.price !== undefined ? parseFloat(row.price.toString()) : null,
          stock: row.stock !== null && row.stock !== undefined ? parseInt(row.stock.toString(), 10) : null,
          is_active: row.branch_is_active !== undefined ? row.branch_is_active : true,
        })),
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo disponibilidad por sucursal:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack,
      });
      
      // Si es un error de tabla no encontrada, dar un mensaje más claro
      if (error.code === '42P01') {
        throw new ServiceUnavailableException(
          'La tabla de disponibilidad por sucursal no existe. Por favor, ejecuta la migración migration_product_branch_availability.sql'
        );
      }
      
      // Si es un error de NotFoundException, re-lanzarlo
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new ServiceUnavailableException(
        `Error al obtener disponibilidad por sucursal: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Actualizar disponibilidad de un producto en múltiples sucursales
   */
  async updateProductBranchAvailability(
    productId: string,
    availabilities: Array<{
      branch_id: string;
      is_enabled: boolean;
      price?: number | null;
      stock?: number | null;
    }>
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el producto existe
    const productCheck = await pool.query('SELECT id FROM catalog.products WHERE id = $1', [productId]);
    if (productCheck.rows.length === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Usar transacción para garantizar consistencia
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const availability of availabilities) {
        // Verificar que la sucursal existe
        const branchCheck = await client.query(
          'SELECT id FROM core.businesses WHERE id = $1 AND is_active = TRUE',
          [availability.branch_id]
        );
        if (branchCheck.rows.length === 0) {
          console.warn(`⚠️ Sucursal ${availability.branch_id} no encontrada o inactiva, omitiendo...`);
          continue; // Continuar con la siguiente en lugar de fallar
        }

        if (availability.is_enabled) {
          // Si está habilitada, insertar o actualizar
          const upsertQuery = `
            INSERT INTO catalog.product_branch_availability (
              product_id, branch_id, is_enabled, price, stock, is_active, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
            ON CONFLICT (product_id, branch_id)
            DO UPDATE SET
              is_enabled = EXCLUDED.is_enabled,
              price = EXCLUDED.price,
              stock = EXCLUDED.stock,
              is_active = TRUE,
              updated_at = CURRENT_TIMESTAMP
          `;

          await client.query(upsertQuery, [
            productId,
            availability.branch_id,
            true, // Siempre true cuando está habilitada
            availability.price ?? null,
            availability.stock ?? null,
          ]);
        } else {
          // Si está deshabilitada, eliminar el registro o marcarlo como inactivo
          const deleteQuery = `
            DELETE FROM catalog.product_branch_availability
            WHERE product_id = $1 AND branch_id = $2
          `;
          await client.query(deleteQuery, [productId, availability.branch_id]);
        }
      }

      await client.query('COMMIT');

      // Retornar la disponibilidad actualizada
      return this.getProductBranchAvailability(productId);
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error actualizando disponibilidad por sucursal:', {
        message: error.message,
        code: error.code,
      });
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new ServiceUnavailableException('Error al actualizar disponibilidad por sucursal');
    } finally {
      client.release();
    }
  }
}

