#!/bin/bash

# Script mejorado para crear issues en GitHub desde el CSV
# Requiere: GitHub CLI (gh) instalado y autenticado
# Uso: ./scripts/create-issues-fixed.sh

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

# Verificar que el repositorio existe
REPO="alex9abril/localia-admin"
if ! gh repo view "$REPO" &> /dev/null; then
    echo -e "${RED}❌ No se puede acceder al repositorio: $REPO${NC}"
    echo "Verifica que el repositorio existe y tienes permisos"
    exit 1
fi

echo -e "${BLUE}📋 Leyendo CSV y creando issues...${NC}\n"

# Contador
created=0
errors=0
skipped=0

# Leer el CSV línea por línea, parseando correctamente los campos entre comillas
tail -n +2 docs/github-projects-import.csv | while IFS= read -r line; do
    # Parsear CSV correctamente usando Python (más robusto)
    # O usar awk para parsear campos entre comillas
    
    # Extraer campos usando awk que maneja comillas correctamente
    title=$(echo "$line" | awk -F',' '{
        gsub(/^"|"$/, "", $1)
        print $1
    }')
    
    body=$(echo "$line" | awk -F',' '{
        gsub(/^"|"$/, "", $2)
        print $2
    }')
    
    labels=$(echo "$line" | awk -F',' '{
        gsub(/^"|"$/, "", $3)
        print $3
    }')
    
    week=$(echo "$line" | awk -F',' '{
        gsub(/^"|"$/, "", $5)
        print $5
    }')
    
    developer=$(echo "$line" | awk -F',' '{
        gsub(/^"|"$/, "", $6)
        print $6
    }')
    
    priority=$(echo "$line" | awk -F',' '{
        gsub(/^"|"$/, "", $7)
        print $7
    }')
    
    # Validar que tenemos los campos necesarios
    if [ -z "$title" ] || [ -z "$body" ]; then
        echo -e "${YELLOW}⚠️  Saltando línea vacía o inválida${NC}"
        skipped=$((skipped + 1))
        continue
    fi
    
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
    
    # Si hay labels, intentar crearlos primero (ignorar si ya existen)
    if [ -n "$labels" ] && [ "$labels" != "Todo" ]; then
        # Separar labels por coma y crear cada uno si no existe
        IFS=',' read -ra LABEL_ARRAY <<< "$labels"
        label_args=""
        for label in "${LABEL_ARRAY[@]}"; do
            label=$(echo "$label" | xargs) # trim whitespace
            if [ -n "$label" ]; then
                label_args="$label_args --label \"$label\""
            fi
        done
    fi
    
    # Crear issue (sin labels primero para evitar errores)
    if [ -n "$label_args" ]; then
        # Intentar crear con labels
        result=$(gh issue create \
            --title "$title" \
            --body "$full_body" \
            --label $(echo "$labels" | tr ',' ' ') \
            --repo "$REPO" 2>&1)
    else
        # Crear sin labels
        result=$(gh issue create \
            --title "$title" \
            --body "$full_body" \
            --repo "$REPO" 2>&1)
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Creada: ${title}${NC}"
        created=$((created + 1))
    else
        # Si falla por labels, intentar sin labels
        if [[ "$result" == *"label"* ]]; then
            echo -e "${YELLOW}⚠️  Creando sin labels (los agregarás manualmente)${NC}"
            result=$(gh issue create \
                --title "$title" \
                --body "$full_body" \
                --repo "$REPO" 2>&1)
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Creada (sin labels): ${title}${NC}"
                created=$((created + 1))
            else
                echo -e "${RED}❌ Error: ${title}${NC}"
                echo "   $result"
                errors=$((errors + 1))
            fi
        else
            echo -e "${RED}❌ Error: ${title}${NC}"
            echo "   $result"
            errors=$((errors + 1))
        fi
    fi
    
    # Pequeña pausa para no sobrecargar la API
    sleep 0.3
done

echo -e "\n${GREEN}✨ Proceso completado${NC}"
echo -e "${GREEN}✅ Issues creadas: ${created}${NC}"
echo -e "${RED}❌ Errores: ${errors}${NC}"
echo -e "${YELLOW}⚠️  Saltadas: ${skipped}${NC}"
echo -e "\n${BLUE}💡 Próximos pasos:${NC}"
echo "   1. Ve a: https://github.com/$REPO/issues"
echo "   2. Crea los labels necesarios si no existen"
echo "   3. Agrega las issues a tu proyecto: https://github.com/users/alex9abril/projects/2"
echo "   4. Haz clic en 'Add item' y busca las issues creadas"

