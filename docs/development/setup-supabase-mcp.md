# Configurar Supabase MCP en Cursor para ver resultados en el chat

Guía para que el asistente de Cursor pueda **ejecutar SQL en Supabase y mostrar los resultados en el chat**.

---

## 1. Dónde poner la configuración

Cursor puede leer MCP desde **proyecto** o **global**. Si en el chat no se usan las herramientas, prueba la ruta global.

### Opción A: Global (recomendada para que el agente use las herramientas)

- **macOS / Linux:** `~/.cursor/mcp.json`
- **Windows:** `%USERPROFILE%\.cursor\mcp.json`

Crea el archivo si no existe y pega:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

### Opción B: Solo en este proyecto

En la **raíz del repo** (junto a `apps/`, `database/`): `.cursor/mcp.json` con el mismo JSON de arriba.

---

## 2. Reiniciar Cursor por completo

Cierra Cursor (todas las ventanas) y vuelve a abrirlo. Abre este proyecto de nuevo.

---

## 3. Primera vez: autorizar Supabase

1. En Cursor ve a **Settings** (⌘+, o Ctrl+,) → **Cursor Settings** → **Tools & MCP**.
2. Deberías ver el servidor **supabase**. Si pide autorización, haz clic y **inicia sesión en Supabase** en el navegador.
3. Elige el **proyecto** de Supabase que usas para Agora (el que tiene tu base de datos). Así el MCP ejecutará las consultas en ese proyecto.

---

## 4. Comprobar que el MCP está activo

En **Settings → Cursor Settings → Tools & MCP**:

- El servidor **supabase** debe aparecer como **conectado** / verde.
- No desactives el servidor; tiene que estar habilitado para que el chat lo use.

---

## 5. Cómo pedir en el chat que muestre resultados

El agente tiene que usar las **herramientas** del MCP (por ejemplo `execute_sql`). Para que no las ignore:

1. **Usa el modo Agent** del chat (no solo “Chat” sin agente).
2. **Sé explícito** con que use Supabase/MCP, por ejemplo:
   - *“Usa el MCP de Supabase para ejecutar esta consulta y muéstrame el resultado: SELECT * FROM orders.orders LIMIT 5”*
   - *“Con las herramientas de Supabase, dime el estado de pago del pedido bdcad4ad-ed00-463b-a25e-aa105e9962f2”*
   - *“Ejecuta en Supabase (MCP) esta SQL y pega el resultado en el chat: [tu query]”*

Si solo dices “consulta Supabase…”, a veces el agente no elige el MCP; al decir **“usa el MCP de Supabase”** o **“ejecuta en Supabase con MCP”** aumenta la probabilidad de que llame a `execute_sql` y te muestre los resultados en el chat.

---

## 6. Si aun así no muestra resultados

- **Proyecto equivocado:** En la autorización del MCP asegúrate de haber seleccionado el proyecto correcto de Supabase (el de Agora).
- **Probar en Supabase:** Ve a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **SQL Editor**, ejecuta la misma query y comparte el resultado en el chat si necesitas ayuda.
- **Config global:** Si tenías solo `.cursor/mcp.json` en el proyecto, copia ese mismo JSON a `~/.cursor/mcp.json`, reinicia Cursor y prueba de nuevo en el chat.
- **Versión de Cursor:** Actualiza Cursor; en versiones recientes el soporte de MCP en el agente ha mejorado.

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Crear `~/.cursor/mcp.json` (o `.cursor/mcp.json` en el proyecto) con el JSON del servidor `supabase` (url `https://mcp.supabase.com/mcp`). |
| 2 | Reiniciar Cursor por completo. |
| 3 | Settings → Tools & MCP → autorizar Supabase y elegir el proyecto Agora. |
| 4 | En el chat (modo Agent), pedir explícitamente: *“Usa el MCP de Supabase para ejecutar [query] y muéstrame el resultado”*. |

Con esto, la configuración de Supabase MCP en Cursor queda lista para que los resultados de las consultas puedan mostrarse en el chat.
