import ContextualLink from './ContextualLink';

export default function ViewAllProductsCta() {
  return (
    <section className="mt-12 mb-4" aria-label="Ver todos los productos">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-[#111] px-6 py-10 md:px-10 md:py-12">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-20"
          style={{
            background:
              'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.35) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2">
              Catálogo completo
            </p>
            <h3 className="font-display text-2xl md:text-3xl font-semibold text-white leading-tight">
              Ver todos los productos
            </h3>
            <p className="mt-2 text-[15px] text-neutral-300">
              Explora el inventario completo de la sucursal y filtra por categoría cuando lo necesites.
            </p>
          </div>
          <ContextualLink
            href="/products"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-black text-[15px] font-semibold hover:bg-neutral-100 transition-colors whitespace-nowrap"
          >
            Ver todos
          </ContextualLink>
        </div>
      </div>
    </section>
  );
}
