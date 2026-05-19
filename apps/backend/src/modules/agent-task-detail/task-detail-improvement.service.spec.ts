import { ImproveTaskDetailDto } from './dto/improve-task-detail.dto';
import {
  TaskDetailImprovementService,
  heuristicImprove,
  normalizeForCompare,
} from './task-detail-improvement.service';

describe('normalizeForCompare', () => {
  it('ignora mayúsculas y espacios extra', () => {
    expect(normalizeForCompare('  Hola   Mundo  ')).toBe('hola mundo');
  });
});

describe('heuristicImprove', () => {
  it('expand añade secciones', () => {
    const dto: ImproveTaskDetailDto = {
      description: 'Arreglar bug en checkout.',
      title: 'Bug checkout',
      context: 'Prioridad alta',
    };
    const out = heuristicImprove(dto, 'expand');
    expect(out).toContain('Bug checkout');
    expect(out).toContain('Criterios sugeridos');
    expect(out.length).toBeGreaterThan(dto.description.length);
  });

  it('rewrite estructura título y cuerpo', () => {
    const dto: ImproveTaskDetailDto = { description: 'Solo texto.' };
    const out = heuristicImprove(dto, 'rewrite');
    expect(out).toContain('### Descripción');
    expect(out).toContain('Solo texto.');
  });
});

describe('TaskDetailImprovementService automated review', () => {
  const svc = new TaskDetailImprovementService();

  it('aprueba fallback típico en expand', async () => {
    process.env.TASK_DETAIL_AI_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    const res = await svc.improve({
      description: 'Implementar reporte de ventas por sucursal con exportación CSV.',
      title: 'Reporte ventas',
      mode: 'expand',
    });
    expect(res.improvedDescription.length).toBeGreaterThan(10);
    expect(res.source).toBe('fallback');
    expect(res.automatedReview.checks.find((c) => c.id === 'non_empty')?.passed).toBe(true);
  });

  it('rewrite con título produce salida distinta al cuerpo solo', async () => {
    process.env.TASK_DETAIL_AI_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    const res = await svc.improve({
      description: 'Hacer X y luego Y.',
      title: 'Tarea',
      mode: 'rewrite',
    });
    expect(res.source).toBe('fallback');
    expect(res.automatedReview.checks.find((c) => c.id === 'rewrite_differs')?.passed).toBe(true);
  });
});
