import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ListProductsDto } from '../catalog/products/dto/list-products.dto';
import { ProductsService } from '../catalog/products/products.service';
import { StorefrontChatDto } from './dto/storefront-chat.dto';
import {
  buildSearchAttempts,
  extractProductSearchQuery,
  fallbackReply,
  shouldUseMergedCatalogSearch,
} from './storefront-chat.helpers';

export type StorefrontChatResult = {
  reply: string;
  source: 'llm' | 'fallback';
  productHints?: { id: string; name: string; sku: string | null }[];
};

const MAX_CONTEXT_MESSAGES = 14;
const CATALOG_MERGE_MAX_CALLS = 6;
const CATALOG_MERGE_PER_LIMIT = 5;
const CATALOG_MERGE_MAX_UNIQUE = 12;
const DESC_SNIPPET_LEN = 220;

@Injectable()
export class StorefrontChatService {
  private readonly logger = new Logger(StorefrontChatService.name);

  constructor(private readonly productsService: ProductsService) {}

  private clipDescription(d: string | null | undefined): string | null {
    if (!d || typeof d !== 'string') return null;
    const t = d.replace(/\s+/g, ' ').trim();
    if (!t) return null;
    if (t.length <= DESC_SNIPPET_LEN) return t;
    return `${t.slice(0, DESC_SNIPPET_LEN)}…`;
  }

  async chat(dto: StorefrontChatDto): Promise<StorefrontChatResult> {
    const rawSearch = extractProductSearchQuery(dto.messages);
    const searchAttempts = rawSearch.length >= 2 ? buildSearchAttempts(rawSearch) : [];
    type HintRow = { id: string; name: string; sku: string | null; descriptionSnippet: string | null };
    let productHints: HintRow[] = [];
    let searchUsedForHints = rawSearch;

    if (searchAttempts.length > 0) {
      try {
        const useMerge = shouldUseMergedCatalogSearch(rawSearch);
        if (useMerge) {
          const merged: HintRow[] = [];
          const seen = new Set<string>();
          let calls = 0;
          const termsTried: string[] = [];
          for (const term of searchAttempts) {
            if (!term || term.length < 2) continue;
            if (calls >= CATALOG_MERGE_MAX_CALLS || merged.length >= CATALOG_MERGE_MAX_UNIQUE) break;
            calls++;
            termsTried.push(term);
            const q: ListProductsDto = {
              page: 1,
              limit: CATALOG_MERGE_PER_LIMIT,
              search: term,
              branchId: dto.branchId,
              groupId: dto.groupId,
              vehicleBrandId: dto.vehicleBrandId,
            };
            const res = await this.productsService.findAll(q);
            const rows = Array.isArray(res?.data) ? res.data : [];
            for (const p of rows as { id: string; name: string; sku?: string | null; description?: string | null }[]) {
              if (merged.length >= CATALOG_MERGE_MAX_UNIQUE) break;
              if (seen.has(p.id)) continue;
              seen.add(p.id);
              merged.push({
                id: p.id,
                name: p.name,
                sku: p.sku ?? null,
                descriptionSnippet: this.clipDescription(p.description ?? null),
              });
            }
          }
          productHints = merged;
          searchUsedForHints = termsTried.length ? termsTried.slice(0, 4).join(' · ') : rawSearch;
        } else {
          for (const term of searchAttempts) {
            const q: ListProductsDto = {
              page: 1,
              limit: 8,
              search: term,
              branchId: dto.branchId,
              groupId: dto.groupId,
              vehicleBrandId: dto.vehicleBrandId,
            };
            const res = await this.productsService.findAll(q);
            const rows = Array.isArray(res?.data) ? res.data : [];
            if (rows.length > 0) {
              searchUsedForHints = term;
              productHints = rows.slice(0, 8).map((p: { id: string; name: string; sku?: string | null; description?: string | null }) => ({
                id: p.id,
                name: p.name,
                sku: p.sku ?? null,
                descriptionSnippet: this.clipDescription(p.description ?? null),
              }));
              break;
            }
          }
        }
      } catch (e: unknown) {
        this.logger.warn(`Catálogo para chat: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const hintsForLlm = productHints.slice(0, 6);
    const catalogBlock =
      productHints.length > 0
        ? `Candidatos del catálogo (solo reales; búsquedas: «${searchUsedForHints}»). El usuario describió lo que busca con lenguaje natural: NO trates su frase como nombre literal de producto. Compara intención (uso, forma, contexto) con nombre y descripción de cada fila; recomienda 1–2 que mejor encajen o di claramente que ninguno encaja bien. No inventes artículos fuera de esta lista. Los enlaces del panel pueden mostrar más filas.\n${hintsForLlm
            .map((p) => {
              const desc = p.descriptionSnippet ? ` — ${p.descriptionSnippet}` : '';
              return `- ${p.name} (SKU: ${p.sku || 'N/A'})${desc}`;
            })
            .join('\n')}${productHints.length > hintsForLlm.length ? '\n- …más candidatos en enlaces' : ''}`
        : `Sin coincidencias claras en catálogo para «${rawSearch || 'la consulta'}»; saluda breve y pide vehículo, SKU o palabra de refacción.`;

    const storeLine = dto.storeLabel?.trim() || 'Agora Parts';

    const system = [
      `Eres un asistente de ventas en español para: "${storeLine}".`,
      'Prioridad: respuestas MUY breves (2–4 frases cortas, máx. ~70 palabras). Sin listas numeradas largas ni un párrafo por producto.',
      'Si el usuario solo saluda o es charla ligera: responde cordial en 1–2 frases y pregunta qué refacción o vehículo busca; no inventes productos ni hables del catálogo salvo que el bloque de catálogo traiga filas.',
      'Si el usuario describe por apariencia o uso (ej. «triangulito rojo en la vía»): no digas que no existe un producto con ese nombre; interpreta la intención y elige entre las filas del bloque las que mejor encajan por nombre y descripción.',
      'Si hay productos en el bloque de catálogo: menciona como máximo 1–2 nombres o SKU; el resto queda en los enlaces del panel. No describas cada artículo.',
      'Solo hechos del bloque de catálogo para productos concretos; no inventes existencias ni precios.',
      'Si es fuera de tema o irrespetuoso, redirige con una frase al catálogo o a autopartes.',
      'Sin markdown pesado (sin tablas ni encabezados). Cierra con una pregunta corta para seguir la conversación.',
    ].join(' ');

    const trimmed = dto.messages.slice(-MAX_CONTEXT_MESSAGES).map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }));

    const userAugment = `\n\n[Contexto interno para ti — no copies literal los ids salvo que ayuden al usuario]\n${catalogBlock}`;

    const apiMessages = [
      { role: 'system' as const, content: system },
      ...trimmed.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];
    if (apiMessages[apiMessages.length - 1]?.role === 'user') {
      const last = apiMessages[apiMessages.length - 1];
      last.content = `${last.content}${userAugment}`;
    } else {
      apiMessages.push({ role: 'user', content: `Sigue la conversación.${userAugment}` });
    }

    const hintsForClient = productHints.map(({ id, name, sku }) => ({ id, name, sku }));

    try {
      const reply = await this.callLlm(apiMessages);
      return { reply, source: 'llm', productHints: hintsForClient };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Chat storefront LLM no disponible: ${msg}`);
      return {
        reply: fallbackReply(rawSearch, hintsForClient, storeLine),
        source: 'fallback',
        productHints: hintsForClient,
      };
    }
  }

  private getLlmConfig(): { apiKey: string; base: string; model: string } {
    const storefrontKey = process.env.STOREFRONT_CHAT_AI_API_KEY?.trim();
    if (storefrontKey) {
      const base = (
        process.env.STOREFRONT_CHAT_AI_BASE_URL ||
        process.env.TASK_DETAIL_AI_BASE_URL ||
        'https://api.openai.com/v1'
      ).replace(/\/$/, '');
      const model =
        process.env.STOREFRONT_CHAT_AI_MODEL ||
        process.env.TASK_DETAIL_AI_MODEL ||
        process.env.GROQ_MODEL ||
        'gpt-4o-mini';
      return { apiKey: storefrontKey, base, model };
    }
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      return {
        apiKey: groqKey,
        base: 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      };
    }
    const fallbackKey =
      process.env.TASK_DETAIL_AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!fallbackKey) {
      throw new Error('NO_AI_KEY');
    }
    const base = (
      process.env.TASK_DETAIL_AI_BASE_URL ||
      process.env.STOREFRONT_CHAT_AI_BASE_URL ||
      'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    const model = process.env.TASK_DETAIL_AI_MODEL || process.env.STOREFRONT_CHAT_AI_MODEL || 'gpt-4o-mini';
    return { apiKey: fallbackKey, base, model };
  }

  private async callLlm(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const { apiKey, base, model } = this.getLlmConfig();

    const { data } = await axios.post(
      `${base}/chat/completions`,
      {
        model,
        messages,
        temperature: 0.35,
        max_tokens: 320,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 35_000,
      },
    );

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new Error('EMPTY_LLM_RESPONSE');
    }
    return text.trim();
  }
}
