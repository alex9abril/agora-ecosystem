#!/bin/bash

# Script para crear issues en GitHub desde el CSV
# Requiere: GitHub CLI (gh) instalado y autenticado
# Uso: ./scripts/create-github-issues.sh

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Creando issues para LOCALIA Project${NC}\n"

# Verificar que gh está instalado
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) no está instalado${NC}"
    echo "Instala desde: https://cli.github.com/"
    exit 1
fi

# Verificar autenticación
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás autenticado en GitHub CLI${NC}"
    echo "Ejecuta: gh auth login"
    exit 1
fi

# Leer el CSV y crear issues
# Skip header line, process each line
tail -n +2 docs/github-projects-import.csv | while IFS=',' read -r title body labels status week developer priority; do
    # Limpiar comillas de los campos
    title=$(echo "$title" | sed 's/^"//;s/"$//')
    body=$(echo "$body" | sed 's/^"//;s/"$//')
    labels=$(echo "$labels" | sed 's/^"//;s/"$//')
    week=$(echo "$week" | sed 's/^"//;s/"$//')
    developer=$(echo "$developer" | sed 's/^"//;s/"$//')
    priority=$(echo "$priority" | sed 's/^"//;s/"$//')
    
    # Crear body completo para la issue
    full_body="## Descripción
${body}

## Semana
${week}

## Desarrollador
${developer}

## Prioridad
${priority}

---
*Creado automáticamente desde el plan de proyecto*"

    # Crear la issue
    echo -e "${YELLOW}📝 Creando: ${title}${NC}"
    
    # Crear issue con labels
    issue_number=$(gh issue create \
        --title "$title" \
        --body "$full_body" \
        --label "$labels" \
        --repo alex9abril/localia-admin 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Creada: ${title}${NC}"
        echo "   Issue: $issue_number"
    else
        echo -e "${RED}❌ Error creando: ${title}${NC}"
        echo "   Error: $issue_number"
    fi
    
    # Pequeña pausa para no sobrecargar la API
    sleep 0.5
done

echo -e "\n${GREEN}✨ Proceso completado${NC}"
echo -e "${YELLOW}💡 Ahora puedes agregar estas issues a tu proyecto de GitHub${NC}"
echo "   Ve a: https://github.com/users/alex9abril/projects/2"
echo "   Haz clic en 'Add item' y busca las issues creadas"

