/**
 * Portal de Documentación para Desarrolladores — Ágora Developers
 *
 * Documentación técnica conceptual dirigida a los equipos de desarrollo / IT
 * de los distribuidores. Explica el flujo del ecosistema, cómo funcionan las
 * integraciones a nivel conceptual y qué datos de producto necesita la
 * plataforma. No expone endpoints ni APIs públicas (aún no disponibles); el
 * enfoque es el contrato de datos y los modelos de integración a medida.
 *
 * Ruta: http://localhost:3008/documentacion
 */

import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DocShell } from '../components/documentacion/DocShell';

/* -------------------------------------------------------------------------- */
/*  Estructura de navegación (menús agrupados, estilo developer docs)         */
/* -------------------------------------------------------------------------- */

type NavItem = { id: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Introducción',
    items: [
      { id: 'bienvenida', label: 'Bienvenida' },
      { id: 'a-quien-va-dirigido', label: 'A quién va dirigido' },
      { id: 'conceptos-clave', label: 'Conceptos clave' },
      { id: 'arquitectura', label: 'Arquitectura del ecosistema' },
    ],
  },
  {
    title: 'Flujo de la plataforma',
    items: [
      { id: 'proceso-agora', label: 'Procesos e integraciones →' },
      { id: 'flujo-extremo-a-extremo', label: 'Flujo de extremo a extremo' },
      { id: 'actores-roles', label: 'Actores y roles' },
      { id: 'contextos-tienda', label: 'Contextos de tienda' },
      { id: 'ciclo-pedido', label: 'Ciclo de un pedido' },
    ],
  },
  {
    title: 'Datos de producto',
    items: [
      { id: 'modelo-producto', label: 'Modelo de producto' },
      { id: 'contrato-datos', label: 'Contrato de datos' },
      { id: 'compatibilidad', label: 'Compatibilidad de vehículos' },
      { id: 'logistica-datos', label: 'Datos logísticos' },
    ],
  },
  {
    title: 'Integraciones',
    items: [
      { id: 'como-integramos', label: 'Cómo integramos' },
      { id: 'sincronizacion-catalogo', label: 'Sincronización de catálogo' },
      { id: 'pagos', label: 'Pagos' },
      { id: 'logistica-envios', label: 'Logística y envíos' },
    ],
  },
  {
    title: 'Construir a medida',
    items: [
      { id: 'modulos-adicionales', label: 'Módulos adicionales' },
      { id: 'proceso-onboarding', label: 'Proceso de integración' },
    ],
  },
  {
    title: 'Referencia',
    items: [
      { id: 'glosario', label: 'Glosario' },
      { id: 'buenas-practicas', label: 'Buenas prácticas de datos' },
      { id: 'soporte', label: 'Soporte' },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/* -------------------------------------------------------------------------- */
/*  Primitivas de UI                                                          */
/* -------------------------------------------------------------------------- */

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-slate-100 pb-14 pt-2">
      {eyebrow && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-toyota-red">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-[28px] font-bold leading-tight text-slate-900">
        <a href={`#${id}`} className="group inline-flex items-center gap-2">
          {title}
          <span className="text-slate-300 opacity-0 transition group-hover:opacity-100">#</span>
        </a>
      </h2>
      <div className="prose-docs mt-5 max-w-none text-[15px] leading-7 text-slate-600">
        {children}
      </div>
    </section>
  );
}

function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'warn' | 'note';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: { bar: 'bg-blue-500', bg: 'bg-blue-50/60', text: 'text-blue-900', icon: 'ℹ' },
    warn: { bar: 'bg-amber-500', bg: 'bg-amber-50/70', text: 'text-amber-900', icon: '!' },
    note: { bar: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-700', icon: '✎' },
  }[type];
  return (
    <div className={`my-5 flex gap-3 rounded-r-lg ${styles.bg} px-4 py-3.5`}>
      <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-full ${styles.bar} text-center text-[11px] font-bold leading-5 text-white`}>
        {styles.icon}
      </div>
      <div className={`text-[14px] leading-6 ${styles.text}`}>
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };
  return (
    <div className="group my-5 overflow-hidden rounded-xl border border-slate-800 bg-[#0d1424]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {language || 'texto'}
        </span>
        <button
          onClick={copy}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-6 text-slate-200" style={{ fontFamily: MONO }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[13px] text-toyota-red"
      style={{ fontFamily: MONO }}
    >
      {children}
    </code>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (React.ReactNode)[][];
}) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((c) => (
              <th key={c} className="border-b border-slate-200 px-4 py-2.5 font-semibold text-slate-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((cell, j) => (
                <td key={j} className="border-b border-slate-100 px-4 py-2.5 text-slate-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConceptCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <h4 className="font-display text-[15px] font-semibold text-slate-900">{title}</h4>
      <p className="mt-1.5 text-[13.5px] leading-6 text-slate-500">{children}</p>
    </div>
  );
}

function FlowStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-12">
      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white">
        {n}
      </div>
      <h4 className="font-display text-[15px] font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-[14px] leading-6 text-slate-600">{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Página                                                                     */
/* -------------------------------------------------------------------------- */

export default function DocumentacionPage() {
  const [active, setActive] = useState<string>(ALL_ITEMS[0].id);
  const [query, setQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Scroll-spy: marca la sección visible en el sidebar y el TOC.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    ALL_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return NAV_GROUPS;
    const q = query.toLowerCase();
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const handleNav = (id: string) => {
    setMobileNavOpen(false);
    if (id === 'proceso-agora') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Head>
        <title>Documentación para desarrolladores — Ágora Developers</title>
        <meta
          name="description"
          content="Documentación técnica de Ágora para los equipos de desarrollo de distribuidores: flujo, integraciones y datos de producto."
        />
        <meta name="robots" content="noindex" />
      </Head>

      <DocShell
        active="documentacion"
        headerExtra={
          <>
            <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex md:w-72">
              <span className="text-slate-400">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en la documentación"
                className="w-full bg-transparent text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              aria-label="Abrir menú"
            >
              ☰
            </button>
          </>
        }
      >
        <div className="mx-auto flex max-w-[1320px] gap-8 bg-white px-5">
          {/* -------------------------------------------------------------- */}
          {/*  Sidebar de navegación (menús agrupados)                       */}
          {/* -------------------------------------------------------------- */}
          <aside
            className={`${
              mobileNavOpen ? 'block' : 'hidden'
            } fixed inset-x-0 top-16 z-30 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-slate-200 bg-white px-5 py-6 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:border-0 lg:px-0`}
          >
            <nav className="space-y-7">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {group.title}
                  </div>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = active === item.id;
                      const isExternal = item.id === 'proceso-agora';
                      return (
                        <li key={item.id}>
                          {isExternal ? (
                            <Link
                              href="/documentacion/proceso"
                              className="block w-full rounded-md px-2 py-1.5 text-left text-[13.5px] font-semibold text-violet-700 transition hover:bg-violet-50 hover:text-violet-900"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleNav(item.id)}
                              className={`block w-full rounded-md px-2 py-1.5 text-left text-[13.5px] transition ${
                                isActive
                                  ? 'bg-red-50 font-semibold text-toyota-red'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {item.label}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* -------------------------------------------------------------- */}
          {/*  Contenido principal                                           */}
          {/* -------------------------------------------------------------- */}
          <main className="min-w-0 max-w-4xl flex-1 py-12">
            {/* Hero */}
            <div className="mb-12 border-b border-slate-100 pb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Documentación técnica · v1.0
              </div>
              <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight text-slate-900">
                Integra tu catálogo con Ágora
              </h1>
              <p className="mt-4 max-w-2xl text-[17px] leading-7 text-slate-600">
                Guía conceptual para los equipos técnicos de los distribuidores. Aquí explicamos
                cómo funciona el ecosistema de extremo a extremo, cómo se conectan las
                integraciones y qué datos de tus productos necesitamos para llevarlos a la tienda.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/documentacion/proceso"
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-blue-50 px-4 py-3 text-[14px] font-semibold text-violet-800 transition hover:border-violet-300 hover:shadow-sm"
                >
                  Ver procesos e integraciones de Agora →
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ConceptCard title="① Entiende el flujo">
                  De tu catálogo maestro a la venta y la entrega, paso a paso.
                </ConceptCard>
                <ConceptCard title="② Prepara tus datos">
                  El contrato de datos de producto que la plataforma espera recibir.
                </ConceptCard>
                <ConceptCard title="③ Define la integración">
                  Conectores y módulos a medida construidos junto con tu equipo.
                </ConceptCard>
              </div>
            </div>

            {/* ============================ INTRODUCCIÓN ===================== */}

            <Section id="bienvenida" eyebrow="Introducción" title="Bienvenida">
              <p>
                <strong>Ágora</strong> es un marketplace y tienda en línea de refacciones y
                accesorios que conecta a clientes y distribuidores en un mismo ecosistema. Cada
                distribuidor —también llamado sucursal dentro de la plataforma— puede tener su
                propia tienda o agruparse con otros bajo un grupo empresarial, mientras el cliente
                compra en un contexto global, por grupo, por sucursal o por marca de vehículo.
              </p>
              <p>
                Esta documentación está pensada para que tu equipo de desarrollo entienda{' '}
                <em>cómo encaja tu operación dentro de Ágora</em> sin necesidad de conocer los
                detalles internos de la plataforma. Nos enfocamos en tres cosas: el{' '}
                <strong>flujo</strong>, las <strong>integraciones</strong> y los{' '}
                <strong>datos de producto</strong>.
              </p>
              <Callout type="note" title="Sobre el alcance de esta guía">
                Es una guía <strong>conceptual</strong>. Describe modelos, contratos de datos y
                comportamientos esperados, no una referencia de endpoints. La especificación
                técnica concreta de cada integración se acuerda y entrega durante el proceso de
                onboarding con tu equipo.
              </Callout>
            </Section>

            <Section id="a-quien-va-dirigido" eyebrow="Introducción" title="A quién va dirigido">
              <p>
                Este material está dirigido al <strong>equipo técnico o de desarrollo del
                distribuidor</strong>: las personas responsables del sistema de gestión (DMS / ERP),
                del catálogo maestro y de la operación de datos. No es necesario ser experto en
                Ágora; sí ayuda conocer cómo está estructurado el catálogo de productos de tu lado.
              </p>
              <DataTable
                columns={['Perfil', 'Qué encontrará aquí']}
                rows={[
                  ['Desarrollador / IT del distribuidor', 'El contrato de datos y los modelos de integración para exponer tu catálogo.'],
                  ['Responsable de catálogo', 'Qué campos son obligatorios y cómo se mapean tus categorías al catálogo de Ágora.'],
                  ['Líder de operación', 'El flujo de extremo a extremo y los roles que intervienen en un pedido.'],
                ]}
              />
            </Section>

            <Section id="conceptos-clave" eyebrow="Introducción" title="Conceptos clave">
              <p>
                Antes de entrar al detalle, conviene alinear el vocabulario. Estos son los conceptos
                que se repiten a lo largo de la documentación:
              </p>
              <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ConceptCard title="Distribuidor (sucursal)">
                  La misma entidad: el negocio que tiene el producto en almacén, lo publica y surte
                  el pedido. «Distribuidor» y «sucursal» son dos nombres para lo mismo según el
                  contexto.
                </ConceptCard>
                <ConceptCard title="Grupo empresarial">
                  Organización que agrupa varios distribuidores (sucursales) bajo una misma
                  identidad y configuración heredable.
                </ConceptCard>
                <ConceptCard title="Catálogo maestro (global)">
                  El conjunto de productos visible para todo el ecosistema. Sobre él, cada
                  distribuidor decide qué ofrece y a qué precio.
                </ConceptCard>
                <ConceptCard title="Disponibilidad">
                  Precio, stock y visibilidad que un distribuidor define localmente para cada
                  producto que ofrece.
                </ConceptCard>
                <ConceptCard title="SKU">
                  Identificador único del producto en tu sistema. Es la llave con la que cruzamos tu
                  catálogo contra el de Ágora.
                </ConceptCard>
                <ConceptCard title="Compatibilidad">
                  La relación entre una refacción/accesorio y los vehículos (marca, modelo, año,
                  motor) en los que encaja.
                </ConceptCard>
              </div>
              <Callout type="note" title="Distribuidor = sucursal">
                A lo largo de esta guía verás ambos términos. Se refieren a la{' '}
                <strong>misma entidad</strong>: el negocio que mantiene inventario y vende. Usamos
                «distribuidor» desde la perspectiva de tu operación y «sucursal» cuando hablamos de
                su tienda dentro de Ágora.
              </Callout>
            </Section>

            <Section id="arquitectura" eyebrow="Introducción" title="Arquitectura del ecosistema">
              <p>
                Ágora es un ecosistema modular compuesto por varias aplicaciones que comparten un
                mismo backend y una base de datos central. Como integrador, no necesitas operar
                estas piezas; te las mostramos para que ubiques dónde encaja tu catálogo.
              </p>
              <DataTable
                columns={['Pieza', 'Rol en el ecosistema']}
                rows={[
                  [<><strong>Tienda (store-front)</strong></>, 'Lo que ve el cliente: catálogo, fichas de producto, carrito y checkout.'],
                  [<><strong>Panel de administración</strong></>, 'Donde los distribuidores (sucursales) gestionan productos, precios, stock y pedidos.'],
                  [<><strong>Backend / servicios</strong></>, 'Núcleo de negocio: catálogo, pedidos, usuarios e integraciones.'],
                  [<><strong>Apps de operación</strong></>, 'Aplicaciones de cliente y de reparto para el ciclo de entrega.'],
                ]}
              />
              <Callout type="info" title="Tu punto de contacto">
                Para un distribuidor, el punto de integración es siempre tu{' '}
                <strong>catálogo de productos</strong> y su disponibilidad. Todo lo demás
                —presentación, pagos, entrega— lo resuelve la plataforma.
              </Callout>
            </Section>

            {/* ============================ FLUJO =========================== */}

            <Section id="flujo-extremo-a-extremo" eyebrow="Flujo de la plataforma" title="Flujo de extremo a extremo">
              <p>
                A grandes rasgos, así viaja un producto desde tu almacén hasta las manos del
                cliente. Cada etapa tiene un responsable distinto y la plataforma se encarga de
                orquestarlas.
              </p>
              <div className="my-6 space-y-7">
                <FlowStep n={1} title="Catálogo maestro del distribuidor">
                  Tú mantienes tu catálogo en tu DMS/ERP: SKUs, nombres, categorías, precios de
                  referencia y stock.
                </FlowStep>
                <FlowStep n={2} title="Ingesta hacia Ágora">
                  Ese catálogo se incorpora al catálogo global de Ágora mediante un conector. Cada
                  producto se cruza por SKU con el maestro de la plataforma.
                </FlowStep>
                <FlowStep n={3} title="Disponibilidad del distribuidor">
                  Cada distribuidor (sucursal) define qué productos ofrece, con qué precio y stock.
                  Un mismo producto puede tener condiciones distintas en cada tienda.
                </FlowStep>
                <FlowStep n={4} title="Presentación al cliente">
                  El producto aparece en la tienda con su ficha, imágenes y compatibilidad. El
                  cliente filtra por su vehículo y ve solo lo que le sirve.
                </FlowStep>
                <FlowStep n={5} title="Pedido y pago">
                  El cliente arma su carrito y paga. La plataforma confirma el pedido y notifica al
                  distribuidor que surte.
                </FlowStep>
                <FlowStep n={6} title="Logística y entrega">
                  Se calcula el envío con los datos del producto y se coordina la entrega hasta el
                  cliente final.
                </FlowStep>
              </div>
              <CodeBlock
                language="diagrama"
                code={`Distribuidor (DMS/ERP)
        │   catálogo maestro · SKUs · precio · stock
        ▼
   [ Conector / Ingesta ]
        │   cruce por SKU
        ▼
  Catálogo global de Ágora ──► Disponibilidad del distribuidor (precio · stock)
        │
        ▼
     Tienda (cliente)  ──►  Carrito  ──►  Pago  ──►  Logística  ──►  Entrega`}
              />
            </Section>

            <Section id="actores-roles" eyebrow="Flujo de la plataforma" title="Actores y roles">
              <p>Estos son los actores que participan en el ecosistema y su responsabilidad:</p>
              <DataTable
                columns={['Actor', 'Responsabilidad']}
                rows={[
                  [<><strong>Cliente</strong></>, 'Busca por vehículo, compra y recibe el producto.'],
                  [<><strong>Distribuidor (sucursal)</strong></>, 'Provee el catálogo, publica disponibilidad/precio/stock y surte el pedido desde su almacén.'],
                  [<><strong>Grupo empresarial</strong></>, 'Agrupa y configura varios distribuidores (sucursales) de forma centralizada.'],
                  [<><strong>Operación / reparto</strong></>, 'Coordina y ejecuta la entrega al cliente final.'],
                ]}
              />
            </Section>

            <Section id="contextos-tienda" eyebrow="Flujo de la plataforma" title="Contextos de tienda">
              <p>
                Un mismo catálogo se puede comprar desde cuatro <strong>contextos</strong>. El
                contexto define qué productos y precios ve el cliente. Es relevante para tu equipo
                porque un producto tuyo puede mostrarse en más de uno.
              </p>
              <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ConceptCard title="Global">
                  Vista general con productos de todos los distribuidores del ecosistema.
                </ConceptCard>
                <ConceptCard title="Grupo">
                  La tienda de un grupo empresarial y los distribuidores (sucursales) asociados.
                </ConceptCard>
                <ConceptCard title="Sucursal">
                  La mini-tienda de un distribuidor específico, con su propio precio y stock.
                </ConceptCard>
                <ConceptCard title="Marca de vehículo">
                  Vista filtrada por marca (p. ej. Toyota, Nissan) a través del ecosistema.
                </ConceptCard>
              </div>
            </Section>

            <Section id="ciclo-pedido" eyebrow="Flujo de la plataforma" title="Ciclo de un pedido">
              <p>
                Desde tu perspectiva, lo importante es que un pedido nace cuando el cliente paga y
                dispara una notificación al responsable de surtirlo. Estos son los estados típicos:
              </p>
              <CodeBlock
                language="estados"
                code={`creado  →  pagado  →  confirmado  →  en_preparacion  →  enviado  →  entregado
                                   │
                                   └─►  cancelado / reembolsado`}
              />
              <Callout type="note">
                El cálculo y la cotización de las etapas de <Field>enviado</Field> y{' '}
                <Field>entregado</Field> los resuelve Ágora con los datos logísticos del producto
                (peso y dimensiones), que la propia plataforma gestiona.
              </Callout>
            </Section>

            {/* ============================ DATOS DE PRODUCTO =============== */}

            <Section id="modelo-producto" eyebrow="Datos de producto" title="Modelo de producto">
              <p>
                La plataforma soporta distintos <strong>tipos de producto</strong>. El tipo
                determina qué información adicional es relevante (por ejemplo, la compatibilidad
                aplica a refacciones y accesorios, no a servicios).
              </p>
              <DataTable
                columns={['Tipo', 'Descripción', 'Compatibilidad', 'Envío']}
                rows={[
                  [<Field>refaccion</Field>, 'Pieza de repuesto o componente', 'Sí', 'Sí'],
                  [<Field>accesorio</Field>, 'Personalización o mejora', 'Sí', 'Sí'],
                  [<Field>fluido</Field>, 'Aceites, líquidos y lubricantes', 'Opcional', 'Sí'],
                  [<Field>servicio_instalacion</Field>, 'Instalación profesional', 'No', 'No'],
                  [<Field>servicio_mantenimiento</Field>, 'Mantenimiento o reparación', 'No', 'No'],
                ]}
              />
            </Section>

            <Section id="contrato-datos" eyebrow="Datos de producto" title="Contrato de datos">
              <p>
                Este es el <strong>contrato de datos</strong> que esperamos por producto: la forma
                conceptual en la que necesitamos recibir tu información. No es un esquema interno de
                la plataforma, sino el conjunto de campos que tu equipo debe poder exponer o exportar.
              </p>
              <CodeBlock
                language="json"
                code={`{
  "sku": "FIL-AIR-TOY-001",          // requerido · identificador único
  "nombre": "Filtro de Aire Original",
  "tipo": "refaccion",               // requerido · ver tabla de tipos
  "categoria": "Motor > Filtros",    // requerido
  "marca_producto": "Toyota",        // marca del producto/fabricante
  "precio": 450.00,                  // requerido · precio de referencia
  "moneda": "MXN",
  "stock": 24,
  "disponible": true,
  "descripcion": "Filtro de aire de alto flujo, equivalente OEM."
}`}
              />
              <p className="mt-2">Campos por nivel de obligatoriedad:</p>
              <DataTable
                columns={['Campo', 'Obligatorio', 'Notas']}
                rows={[
                  [<Field>sku</Field>, 'Sí', 'Único y estable en el tiempo. Es la llave del cruce.'],
                  [<Field>nombre</Field>, 'Sí', 'Descriptivo y orientado a búsqueda del cliente.'],
                  [<Field>tipo</Field>, 'Sí', 'Uno de los tipos soportados.'],
                  [<Field>categoria</Field>, 'Sí', 'Mapeable al catálogo de categorías de Ágora.'],
                  [<Field>precio</Field>, 'Sí', 'Precio de referencia; el distribuidor puede ajustarlo.'],
                  [<Field>marca_producto</Field>, 'Recomendado', 'Marca o fabricante del producto.'],
                  [<Field>descripcion</Field>, 'Recomendado', 'Texto descriptivo orientado al cliente.'],
                ]}
              />
              <Callout type="info" title="Esto lo aporta Ágora, no tú">
                La <strong>compatibilidad de vehículos</strong>, las{' '}
                <strong>especificaciones técnicas</strong> (número de parte OEM, garantía), los{' '}
                <strong>datos logísticos</strong> (peso y dimensiones) y las{' '}
                <strong>imágenes</strong> son parte de lo que Ágora resuelve y enriquece a partir de
                tu catálogo. Tu equipo no necesita proveerlos en el contrato de datos.
              </Callout>
              <Callout type="warn" title="Estabilidad del SKU">
                El <Field>sku</Field> es el ancla de toda la integración. Si cambia, perdemos la
                trazabilidad entre tu producto y el de Ágora. Mantenlo único e inmutable.
              </Callout>
            </Section>

            <Section id="compatibilidad" eyebrow="Datos de producto" title="Compatibilidad de vehículos">
              <Callout type="info" title="De esto se encarga Ágora">
                La compatibilidad de vehículos <strong>la resuelve la plataforma</strong> a partir de
                tu catálogo. Tu equipo no necesita declararla en el contrato de datos. Te explicamos
                cómo funciona solo para que entiendas qué hace Ágora con tus productos.
              </Callout>
              <p>
                Para refacciones y accesorios, la compatibilidad es lo que permite que un cliente
                seleccione su vehículo y vea únicamente lo que le sirve. Ágora la modela de forma{' '}
                <strong>jerárquica</strong>, de lo más general a lo más específico:
              </p>
              <CodeBlock
                language="jerarquía"
                code={`Marca  →  Modelo  →  Año / Generación  →  Motor / Transmisión`}
              />
              <p>Según el detalle disponible, Ágora establece la compatibilidad en distintos niveles:</p>
              <DataTable
                columns={['Nivel', 'Cuándo aplica', 'Ejemplo']}
                rows={[
                  ['Universal', 'Aplica a cualquier vehículo', 'Tapetes universales'],
                  ['Por marca', 'Toda una marca', 'Accesorio para toda la línea Toyota'],
                  ['Por modelo', 'Marca + modelo', 'Pieza para Corolla'],
                  ['Por año', 'Rango de años/generación', 'Corolla 2020–2023'],
                  ['Por motor', 'Especificación exacta', 'Filtro para motor 2ZR-FE'],
                ]}
              />
            </Section>

            <Section id="logistica-datos" eyebrow="Datos de producto" title="Datos logísticos">
              <Callout type="info" title="De esto se encarga Ágora">
                Los <strong>datos logísticos</strong> (peso y dimensiones) que se usan para cotizar
                el envío <strong>los gestiona la plataforma</strong>. Tu equipo no necesita
                incluirlos en el contrato de datos.
              </Callout>
              <p>
                Para productos físicos (refacciones, accesorios, fluidos), Ágora utiliza el peso y
                las dimensiones para cotizar el envío con las paqueterías. Estos datos forman parte
                del enriquecimiento que la plataforma hace sobre tu catálogo; en los servicios
                (instalación, mantenimiento) no aplican, porque no se envían físicamente.
              </p>
            </Section>

            {/* ============================ INTEGRACIONES =================== */}

            <Section id="como-integramos" eyebrow="Integraciones" title="Cómo integramos">
              <Callout type="warn" title="Sobre las integraciones disponibles hoy">
                Actualmente <strong>no exponemos una API pública autoservicio</strong> a la que tu
                sistema se conecte por su cuenta. Cada integración se implementa como un{' '}
                <strong>conector a medida</strong>, construido y operado junto con tu equipo a partir
                del contrato de datos de esta guía. Una capa de integración autoservicio está en el
                horizonte del producto.
              </Callout>
              <p>
                En la práctica, la integración consiste en acordar <em>cómo</em> tu catálogo llega a
                Ágora y <em>con qué reglas</em> se transforma. Estos son los modelos de intercambio
                habituales:
              </p>
              <DataTable
                columns={['Modelo', 'Cómo funciona', 'Cuándo conviene']}
                rows={[
                  ['Exportación periódica', 'Generas un archivo (JSON/CSV) que se ingiere por lotes.', 'Catálogos que cambian a diario o por turnos.'],
                  ['Conector a tu sistema', 'Construimos un módulo que lee tu DMS/ERP con reglas tuyas.', 'Operaciones que requieren sincronización frecuente.'],
                  ['Carga asistida', 'Tu equipo entrega el catálogo y operación lo procesa.', 'Arranque, pilotos o catálogos pequeños.'],
                ]}
              />
              <p>
                En todos los casos partimos del mismo contrato de datos y aplicamos{' '}
                <strong>reglas de transformación por distribuidor</strong> (normalización de SKU,
                ajustes de precio, mapeo de tiendas) sin tocar tu sistema de origen.
              </p>
            </Section>

            <Section id="sincronizacion-catalogo" eyebrow="Integraciones" title="Sincronización de catálogo">
              <p>
                La sincronización del catálogo es el corazón de la integración. Conceptualmente sigue
                cuatro fases, diseñadas para ser <strong>auditables</strong> y{' '}
                <strong>reprocesables</strong> ante errores:
              </p>
              <div className="my-6 space-y-7">
                <FlowStep n={1} title="Ingesta">
                  Recibimos tu catálogo y guardamos el registro original tal cual llegó (para
                  auditoría y trazabilidad).
                </FlowStep>
                <FlowStep n={2} title="Transformación">
                  Aplicamos tus reglas: normalización de SKU, ajuste de precio y mapeo de tienda.
                </FlowStep>
                <FlowStep n={3} title="Cruce y actualización">
                  Cada SKU se cruza con el maestro de Ágora y se actualiza la disponibilidad del
                  distribuidor (precio, stock, disponible).
                </FlowStep>
                <FlowStep n={4} title="Monitoreo">
                  Se registran resultados y discrepancias (p. ej. SKU no encontrado) para reprocesar
                  solo lo que falló, sin afectar lo ya sincronizado.
                </FlowStep>
              </div>
              <p>El resultado de cada lote es un resumen accionable:</p>
              <CodeBlock
                language="json"
                code={`{
  "lote": "2026-06-08T03:00Z",
  "distribuidor": "tu-distribuidor",
  "procesados": 1280,
  "insertados": 35,
  "actualizados": 1230,
  "fallidos": 15,
  "errores": [
    { "sku": "XYZ-999", "motivo": "SKU no encontrado en el maestro" }
  ]
}`}
              />
              <Callout type="info" title="Multidistribuidor por diseño">
                La misma infraestructura atiende a varios distribuidores con reglas aisladas. Tu
                catálogo nunca afecta el de otro y cada lote es independiente.
              </Callout>
            </Section>

            <Section id="pagos" eyebrow="Integraciones" title="Pagos">
              <p>
                El cobro al cliente lo resuelve la plataforma a través de su pasarela de pagos.{' '}
                <strong>Ágora ya cuenta con integraciones de pago en funcionamiento</strong>, así que
                como distribuidor no necesitas integrar nada para empezar a vender: tu
                responsabilidad termina en mantener producto, precio de referencia y stock.
              </p>
              <Callout type="info" title="Personalizable a tu arquitectura">
                Si tu operación usa una pasarela o procesador de pagos específico, podemos{' '}
                <strong>personalizar la integración</strong> para conectar el que ya utilizas en tu
                arquitectura. Se evalúa durante el onboarding como un módulo a medida.
              </Callout>
              <Callout type="note">
                Los datos que tú aportas —precio y disponibilidad— alimentan el carrito; el cobro,
                la facturación y el flujo de pago son responsabilidad de la plataforma.
              </Callout>
            </Section>

            <Section id="logistica-envios" eyebrow="Integraciones" title="Logística y envíos">
              <p>
                El cálculo de envío y la coordinación con paqueterías son parte del flujo de pedido y
                los <strong>gestiona la plataforma de extremo a extremo</strong>.{' '}
                <strong>Ágora ya tiene integraciones activas con proveedores de paquetería</strong>,
                de modo que Ágora resuelve los datos logísticos del producto (peso y dimensiones) y
                la cotización del envío sin que tu equipo tenga que integrar nada.
              </p>
              <Callout type="info" title="¿Usas otro proveedor de envíos?">
                No trabajamos con todas las paqueterías, pero el modelo es extensible:{' '}
                <strong>podemos integrar el proveedor de logística que tu distribuidora ya utiliza</strong>.
                Se incorpora como un módulo a medida durante el onboarding.
              </Callout>
              <CodeBlock
                language="flujo"
                code={`Producto (peso + dimensiones)  +  Origen (distribuidor)  +  Destino (cliente)
                          ▼
              Cotización de envío  →  Guía  →  Seguimiento  →  Entrega`}
              />
            </Section>

            {/* ============================ A MEDIDA ======================== */}

            <Section id="modulos-adicionales" eyebrow="Construir a medida" title="Módulos adicionales">
              <p>
                Ágora es modular por diseño. Más allá de la sincronización de catálogo, podemos{' '}
                <strong>construir módulos adicionales</strong> adaptados a la operación de tu
                distribuidora. Si tu equipo tiene una necesidad específica, es candidata a convertirse
                en un módulo.
              </p>
              <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ConceptCard title="Conectores a tu DMS/ERP">
                  Lectura directa de tu sistema con las reglas de negocio de tu operación.
                </ConceptCard>
                <ConceptCard title="Reglas de precio y promociones">
                  Ajustes, márgenes o promociones específicas por distribuidor o temporada.
                </ConceptCard>
                <ConceptCard title="Tableros de monitoreo">
                  Métricas de sincronización: latencia, errores y throughput por distribuidor.
                </ConceptCard>
                <ConceptCard title="Reportería a medida">
                  Exportaciones y reportes alineados a tus indicadores internos.
                </ConceptCard>
              </div>
              <Callout type="info">
                ¿Tienes un caso que no está en esta lista? Cuéntanoslo. La arquitectura está pensada
                para extenderse con nuevos módulos sin romper lo existente.
              </Callout>
            </Section>

            <Section id="proceso-onboarding" eyebrow="Construir a medida" title="Proceso de integración">
              <p>
                Así es como acompañamos a tu equipo desde la primera conversación hasta tener tu
                catálogo en producción:
              </p>
              <div className="my-6 space-y-7">
                <FlowStep n={1} title="Descubrimiento">
                  Revisamos cómo está estructurado tu catálogo y qué datos puedes exponer.
                </FlowStep>
                <FlowStep n={2} title="Definición del contrato">
                  Acordamos el formato de intercambio y las reglas de transformación de tu caso.
                </FlowStep>
                <FlowStep n={3} title="Piloto">
                  Integramos un subconjunto de productos y validamos el cruce, los precios y la
                  compatibilidad.
                </FlowStep>
                <FlowStep n={4} title="Producción">
                  Escalamos al catálogo completo y activamos el monitoreo de la sincronización.
                </FlowStep>
              </div>
              <Callout type="note" title="Empezar es sencillo">
                Para arrancar el descubrimiento solo necesitamos una muestra de tu catálogo y a la
                persona técnica que lo conoce. El resto se define en el camino.
              </Callout>
            </Section>

            {/* ============================ REFERENCIA ====================== */}

            <Section id="glosario" eyebrow="Referencia" title="Glosario">
              <DataTable
                columns={['Término', 'Definición']}
                rows={[
                  ['Catálogo maestro', 'Conjunto global de productos visible para todo el ecosistema.'],
                  ['Disponibilidad', 'Precio, stock y visibilidad que un distribuidor (sucursal) define para un producto.'],
                  ['Contrato de datos', 'Conjunto de campos esperados por producto para integrar.'],
                  ['Lote', 'Conjunto de productos que llega y se procesa de forma conjunta.'],
                  ['Cruce', 'Emparejamiento de un SKU tuyo con el producto del maestro de Ágora.'],
                  ['Conector', 'Módulo a medida que lleva tu catálogo a la plataforma.'],
                ]}
              />
            </Section>

            <Section id="buenas-practicas" eyebrow="Referencia" title="Buenas prácticas de datos">
              <ul className="my-4 list-disc space-y-2 pl-5 text-[15px] text-slate-600">
                <li>Mantén el <Field>sku</Field> único, estable e inmutable a lo largo del tiempo.</li>
                <li>Usa nombres de producto descriptivos y orientados a la búsqueda del cliente.</li>
                <li>Mantén precio y stock actualizados; son los datos que cambian con más frecuencia.</li>
                <li>Mapea tus categorías al catálogo de Ágora desde el inicio para evitar reprocesos.</li>
                <li>Versiona tus exportaciones: facilita auditar qué se sincronizó y cuándo.</li>
              </ul>
            </Section>

            <Section id="soporte" eyebrow="Referencia" title="Soporte">
              <p>
                ¿Listo para integrar tu catálogo o tienes dudas técnicas sobre esta guía? Tu punto de
                contacto es el equipo de integraciones de Ágora. Comparte una muestra de tu catálogo y
                te acompañamos en el descubrimiento.
              </p>
              <div className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="font-display text-[16px] font-semibold text-slate-900">
                  Equipo de Integraciones · Ágora
                </div>
                <p className="mt-1 text-[14px] text-slate-600">
                  Escríbenos con el asunto <Field>Integración de catálogo</Field> e incluye el nombre
                  de tu distribuidora y una muestra representativa de productos.
                </p>
              </div>
              <p className="text-[13px] text-slate-400">
                Esta documentación es conceptual y puede evolucionar conforme se liberan nuevos
                módulos e integraciones.
              </p>
            </Section>

            <footer className="mt-12 flex flex-col items-start justify-between gap-3 pt-8 text-[13px] text-slate-400 sm:flex-row sm:items-center">
              <span>© {new Date().getFullYear()} Ágora · Documentación para desarrolladores</span>
              <a href="#bienvenida" className="text-slate-500 hover:text-slate-900">Volver al inicio ↑</a>
            </footer>
          </main>
        </div>
      </DocShell>
    </>
  );
}
