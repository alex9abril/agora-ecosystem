import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ImproveTaskDetailDto } from './dto/improve-task-detail.dto';

export type AutomatedReviewCheck = { id: string; passed: boolean; detail?: string };

export type ImproveTaskDetailResult = {
  improvedDescription: string;
  approved: boolean;
  automatedReview: { checks: AutomatedReviewCheck[] };
  source: 'llm' | 'fallback';
};

const MAX_OUT = 28000;
const MIN_OUT = 8;

@Injectable()
export class TaskDetailImprovementService {
  private readonly logger = new Logger(TaskDetailImprovementService.name);

  improve(dto: ImproveTaskDetailDto): Promise<ImproveTaskDetailResult> {
    return this.improveInternal(dto);
  }

  private async improveInternal(dto: ImproveTaskDetailDto): Promise<ImproveTaskDetailResult> {
    const mode = dto.mode || 'expand';
    let raw: string;
    let source: 'llm' | 'fallback' = 'fallback';

    try {
      raw = await this.callLlm(dto, mode);
      source = 'llm';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`LLM no disponible o error (${msg}). Usando fallback heurístico.`);
      raw = heuristicImprove(dto, mode);
      source = 'fallback';
    }

    const improvedDescription = clampText(raw.trim(), MAX_OUT);
    const automatedReview = this.runAutomatedReview(dto.description, improvedDescription, mode);
    const approved = automatedReview.checks.every((c) => c.passed);

    return {
      improvedDescription,
      approved,
      automatedReview,
      source,
    };
  }

  private async callLlm(dto: ImproveTaskDetailDto, mode: 'expand' | 'rewrite'): Promise<string> {
    const apiKey = process.env.TASK_DETAIL_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('NO_AI_KEY');
    }
    const base = (process.env.TASK_DETAIL_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.TASK_DETAIL_AI_MODEL || 'gpt-4o-mini';

    const system = [
      'Eres un asistente que mejora descripciones de tareas para equipos de producto o ingeniería.',
      'Debes mantener hechos y alcance; no inventes requisitos ni fechas.',
      'Responde solo con el texto mejorado de la descripción, sin preámbulos ni comillas.',
      mode === 'expand'
        ? 'Modo: EXPANDIR — añade claridad, criterios de aceptación implícitos y supuestos explícitos sin alargar de forma vacía.'
        : 'Modo: REESCRIBIR — redacta de forma más clara y ordenada; puedes reordenar pero conserva el significado.',
    ].join(' ');

    const userPayload = [
      dto.title && `Título de la tarea: ${dto.title}`,
      dto.context && `Contexto adicional:\n${dto.context}`,
      `Descripción actual:\n${dto.description}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const { data } = await axios.post(
      `${base}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPayload },
        ],
        temperature: 0.25,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45_000,
      },
    );

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new Error('EMPTY_LLM_RESPONSE');
    }
    return text;
  }

  private runAutomatedReview(
    original: string,
    improved: string,
    mode: 'expand' | 'rewrite',
  ): { checks: AutomatedReviewCheck[] } {
    const checks: AutomatedReviewCheck[] = [];

    const nonEmpty = improved.length >= MIN_OUT;
    checks.push({
      id: 'non_empty',
      passed: nonEmpty,
      detail: nonEmpty ? undefined : `La salida debe tener al menos ${MIN_OUT} caracteres.`,
    });

    const maxLen = improved.length <= MAX_OUT;
    checks.push({
      id: 'max_length',
      passed: maxLen,
      detail: maxLen ? undefined : `Supera el máximo de ${MAX_OUT} caracteres.`,
    });

    const noAiRefusal = !/\b(no puedo|cannot comply|i'm unable|as an ai)\b/i.test(improved);
    checks.push({
      id: 'no_refusal_pattern',
      passed: noAiRefusal,
      detail: noAiRefusal ? undefined : 'Se detectó un patrón de rechazo o evasión.',
    });

    if (mode === 'rewrite') {
      const a = normalizeForCompare(original);
      const b = normalizeForCompare(improved);
      const changed = a.length > 0 && a !== b;
      checks.push({
        id: 'rewrite_differs',
        passed: changed,
        detail: changed ? undefined : 'En modo reescritura la salida es demasiado similar al original.',
      });
    } else {
      const longer = improved.trim().length >= Math.min(original.trim().length * 1.05, original.trim().length + 40);
      checks.push({
        id: 'expand_substantive',
        passed: longer || original.trim().length < 40,
        detail:
          longer || original.trim().length < 40
            ? undefined
            : 'En modo expandir se espera mayor sustancia que el original.',
      });
    }

    return { checks };
  }
}

export function normalizeForCompare(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

export function clampText(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd();
}

/** Fallback sin red externa: estructura clara y secciones útiles. */
export function heuristicImprove(dto: ImproveTaskDetailDto, mode: 'expand' | 'rewrite'): string {
  const title = dto.title?.trim();
  const ctx = dto.context?.trim();
  const body = dto.description.trim();

  if (mode === 'rewrite') {
    const parts = [
      title && `## ${title}`,
      '### Descripción',
      body,
      ctx && '### Contexto',
      ctx,
    ].filter(Boolean) as string[];
    return parts.join('\n\n');
  }

  return [
    title && `## ${title}`,
    '### Resumen',
    body.slice(0, 2000) + (body.length > 2000 ? '…' : ''),
    '### Detalle ampliado',
    body,
    ctx && '### Contexto de negocio',
    ctx,
    '### Criterios sugeridos (revistar)',
    '- La descripción coincide con el alcance acordado.',
    '- No se introducen supuestos no validados con el solicitante.',
    '- Entregables y dependencias quedan identificables.',
  ]
    .filter(Boolean)
    .join('\n\n');
}
