---
name: ux-usability-review
description: Revisión de código/producto enfocada en usabilidad y experiencia de usuario. Propone mejoras a nivel uso, no técnico.
---

# Agente de revisión: usabilidad y experiencia (UX)

Usa este skill cuando el usuario pida una **revisión desde usabilidad**, **experiencia de usuario**, **UX** o **mejoras para el usuario final**, y no una revisión técnica de código.

## Objetivo

Revisar flujos, pantallas o producto desde la perspectiva de quien usa la app y entregar **propuestas de mejora concretas** en lenguaje de uso, priorizables y accionables.

## Pasos

1. **Delimitar alcance**
   - Si el usuario no lo indica: preguntar si la revisión es de una pantalla, un flujo (ej. checkout, alta de producto) o de toda la app.
   - Revisar el código/UI relevante (componentes, páginas, textos, estados).

2. **Evaluar con criterios de usabilidad (no técnicos)**
   - **Claridad**: ¿Se entiende qué hacer y qué significa cada elemento?
   - **Flujos**: ¿Los pasos son lógicos? ¿Hay pasos de más o de menos?
   - **Mensajes y copy**: ¿Los textos guían? ¿Errores y avisos son claros y accionables?
   - **Feedback**: ¿Hay confirmación de acciones? ¿Estados de carga o espera?
   - **Consistencia**: ¿Mismos patrones y lenguaje en la app?
   - **Jerarquía**: ¿Lo importante destaca? ¿Se puede escanear la pantalla?
   - **Carga cognitiva**: ¿Demasiada información a la vez? ¿Falta agrupación?
   - **Errores y bordes**: ¿Qué pasa si falla algo o no hay datos? ¿Se explica y se ofrece salida?

3. **No evaluar**
   - Calidad de código, arquitectura, rendimiento, seguridad ni naming técnico (salvo si impacta directamente lo que ve/hace el usuario).

4. **Entregar reporte**
   - Lista de propuestas con: **Problema** (qué vive el usuario) → **Dónde** (pantalla/flujo) → **Propuesta** (qué mejorar) → **Prioridad** (crítica / importante / mejora).
   - Redactar en lenguaje orientado al uso; evitar jerga técnica en las propuestas. Si hace falta detalle técnico, ponerlo entre paréntesis o en una sección aparte.

## Ejemplo de uso

Usuario: *"Revisa la pantalla de detalle de producto desde usabilidad."*

Respuesta: aplicar los pasos anteriores sobre esa pantalla y devolver un listado corto de mejoras (ej. "En móvil el botón Agregar al carrito queda fuera de vista" → Dónde: detalle de producto → Propuesta: fijar barra de acciones al fondo en móvil → Prioridad: importante).

## Regla relacionada

Si existe la regla **ux-usability-review** en el proyecto, úsala como criterio detallado para qué evaluar y cómo redactar.
