# 📋 Guía para Crear Issues Manualmente en GitHub Projects

Como GitHub Projects no tiene importación directa de CSV, aquí tienes una guía paso a paso para crear las issues manualmente de forma eficiente.

## 🚀 Opción 1: Usar GitHub CLI (Recomendado)

### Paso 1: Instalar GitHub CLI

**macOS:**
```bash
brew install gh
```

**Windows:**
Descarga desde: https://cli.github.com/

**Linux:**
```bash
sudo apt install gh
# o
sudo dnf install gh
```

### Paso 2: Autenticarse

```bash
gh auth login
```

Sigue las instrucciones para autenticarte.

### Paso 3: Ejecutar el Script

```bash
# Dar permisos de ejecución
chmod +x scripts/create-github-issues.sh

# Ejecutar el script
./scripts/create-github-issues.sh
```

El script creará todas las issues automáticamente. Luego puedes agregarlas a tu proyecto.

---

## 🖱️ Opción 2: Crear Issues Manualmente (Paso a Paso)

### Paso 1: Abrir el Repositorio

Ve a tu repositorio: `https://github.com/alex9abril/localia-admin`

### Paso 2: Crear Issues por Lotes

1. **Ve a la pestaña "Issues"**
2. **Haz clic en "New Issue"**
3. **Crea las issues semana por semana**

### Paso 3: Template Rápido

Para cada issue, usa este formato:

**Título:** (copiar del CSV)

**Body:**
```markdown
## Descripción
[Descripción de la tarea]

## Semana
[Semana 1/2/3/4]

## Desarrollador
[Dev1/Dev2/Dev3]

## Prioridad
[High/Medium/Low]

## Labels
[backend/mobile/web, setup/auth/orders/etc.]
```

### Paso 4: Crear Milestones

1. Ve a "Milestones" en la pestaña Issues
2. Crea 4 milestones:
   - **Semana 1: Setup y Fundamentos**
   - **Semana 2: Flujo Core de Pedidos**
   - **Semana 3: Sistema de Créditos y Panel Admin**
   - **Semana 4: Red Social Ecológica y Testing**

### Paso 5: Asignar Issues al Proyecto

1. Ve a tu proyecto: https://github.com/users/alex9abril/projects/2
2. Haz clic en "Add item"
3. Busca las issues creadas
4. Agrégales al proyecto

---

## 📊 Estructura Recomendada del Proyecto

### Crear Campos Personalizados

En tu proyecto de GitHub, agrega estos campos:

1. **Week** (Number): 1, 2, 3, 4
2. **Developer** (Single select): Dev1, Dev2, Dev3
3. **Priority** (Single select): High, Medium, Low

### Columnas del Board

1. **Backlog** - Todas las issues
2. **Semana 1** - Issues de semana 1
3. **Semana 2** - Issues de semana 2
4. **Semana 3** - Issues de semana 3
5. **Semana 4** - Issues de semana 4
6. **In Progress** - En desarrollo
7. **Testing** - En revisión
8. **Done** - Completadas

---

## 🎯 Issues Prioritarias (Crear Primero)

Si quieres empezar rápido, crea primero estas 10 issues críticas:

### Semana 1 (Críticas)
1. Setup Backend - NestJS/Express
2. Configuración Base de Datos
3. Sistema de Autenticación
4. Setup React Native
5. Setup Next.js/React

### Semana 2 (Críticas)
6. API de Pedidos - Modelos
7. Endpoints de Pedidos
8. App Cliente - Crear Pedido
9. App Repartidor - Aceptar Pedido
10. App Local - Gestión Pedidos

---

## 💡 Tips para Agilizar

1. **Usa templates:** Crea un template de issue y reutilízalo
2. **Crea por lotes:** Crea todas las issues de una semana a la vez
3. **Usa labels desde el inicio:** Asigna labels al crear cada issue
4. **Asigna milestones:** Asigna el milestone correspondiente
5. **Usa atajos:** `Ctrl+Space` para agregar items rápidamente en Projects

---

## 📝 Checklist de Creación

- [ ] Crear 4 Milestones
- [ ] Crear Labels necesarios
- [ ] Crear Issues de Semana 1 (12 issues)
- [ ] Crear Issues de Semana 2 (16 issues)
- [ ] Crear Issues de Semana 3 (12 issues)
- [ ] Crear Issues de Semana 4 (12 issues)
- [ ] Asignar todas las issues al proyecto
- [ ] Configurar campos personalizados (Week, Developer, Priority)
- [ ] Organizar issues en columnas por semana

---

**¿Necesitas ayuda?** Revisa el archivo `PROYECTO-4-SEMANAS.md` para ver todas las tareas detalladas.

