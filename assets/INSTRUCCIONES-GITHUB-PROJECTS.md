# 📋 Instrucciones para Importar a GitHub Projects

## Opción 1: Importar desde CSV (Recomendado)

1. **Abre tu proyecto en GitHub:**
   - Ve a: https://github.com/users/alex9abril/projects/2
   - O crea un nuevo proyecto en tu repositorio

2. **Importar desde CSV:**
   - En GitHub Projects, haz clic en "..." (menú)
   - Selecciona "Import" o "Import from CSV"
   - Sube el archivo `github-projects-import.csv`
   - GitHub creará automáticamente las issues

3. **Organizar por Milestones/Sprints:**
   - Crea 4 Milestones (Semana 1, Semana 2, Semana 3, Semana 4)
   - Asigna cada issue al milestone correspondiente según la columna "Week"

## Opción 2: Crear Issues Manualmente

Usa el documento `PROYECTO-4-SEMANAS.md` como referencia y crea las issues manualmente organizadas por:

- **Milestones:** Semana 1, Semana 2, Semana 3, Semana 4
- **Labels:** backend, mobile, web, setup, auth, orders, localcoins, social, etc.
- **Assignees:** Dev1, Dev2, Dev3

## Opción 3: Usar GitHub CLI

```bash
# Instalar GitHub CLI si no lo tienes
# brew install gh (macOS)
# o descarga desde: https://cli.github.com/

# Autenticarse
gh auth login

# Crear issues desde CSV (requiere script personalizado)
# Puedes usar el CSV como base para crear issues programáticamente
```

## Estructura Recomendada del Proyecto

### Columnas del Board:
1. **Backlog** - Tareas pendientes
2. **Semana 1** - En progreso semana 1
3. **Semana 2** - En progreso semana 2
4. **Semana 3** - En progreso semana 3
5. **Semana 4** - En progreso semana 4
6. **Testing** - En revisión/testing
7. **Done** - Completadas

### Labels Sugeridos:
- `backend` - Tareas de backend
- `mobile` - Tareas de móvil
- `web` - Tareas de web
- `setup` - Setup inicial
- `auth` - Autenticación
- `orders` - Sistema de pedidos
- `localcoins` - Sistema de créditos
- `payments` - Pagos
- `social` - Red social
- `testing` - Testing
- `documentation` - Documentación
- `high` - Prioridad alta
- `medium` - Prioridad media
- `low` - Prioridad baja

### Milestones:
- **Semana 1: Setup y Fundamentos** (Fecha inicio - Fecha fin semana 1)
- **Semana 2: Flujo Core de Pedidos** (Fecha inicio - Fecha fin semana 2)
- **Semana 3: Sistema de Créditos y Panel Admin** (Fecha inicio - Fecha fin semana 3)
- **Semana 4: Red Social Ecológica y Testing** (Fecha inicio - Fecha fin semana 4)

## Asignación de Desarrolladores

- **Dev1:** Todas las tareas con label `backend`
- **Dev2:** Todas las tareas con label `mobile`
- **Dev3:** Todas las tareas con label `web`

## Seguimiento Semanal

Cada lunes:
1. Revisar tareas completadas de la semana anterior
2. Mover tareas de la semana actual a "En progreso"
3. Actualizar estimaciones si es necesario
4. Revisar bloqueadores

Cada viernes:
1. Actualizar estado de tareas
2. Mover tareas completadas a "Done"
3. Documentar bloqueadores
4. Planificar siguiente semana

## Notas Importantes

- El **Proyecto Wallet** es un proyecto separado y NO está incluido en este plan
- Las tareas están estimadas para 40 horas semanales por desarrollador
- Las prioridades pueden ajustarse según necesidades del proyecto
- Algunas tareas pueden requerir colaboración entre desarrolladores

## Archivos Disponibles

1. **PROYECTO-4-SEMANAS.md** - Plan detallado con descripciones completas
2. **github-projects-import.csv** - Archivo CSV para importar directamente
3. **INSTRUCCIONES-GITHUB-PROJECTS.md** - Este archivo

---

**¿Necesitas ayuda?** Revisa la documentación de GitHub Projects: https://docs.github.com/en/issues/planning-and-tracking-with-projects

