#!/usr/bin/env python3
"""
Script simplificado para agregar issues al proyecto
Usa la API REST de GitHub Projects
"""

import subprocess
import sys
import json
import time

# Colores
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'

PROJECT_NUMBER = 2
OWNER = "alex9abril"
REPO = "alex9abril/localia-admin"

def get_project_info():
    """Obtener información del proyecto usando la API REST"""
    try:
        # Obtener proyectos del usuario
        result = subprocess.run(
            ['gh', 'api', f'users/{OWNER}/projects'],
            capture_output=True,
            text=True,
            check=True
        )
        projects = json.loads(result.stdout)
        
        # Buscar el proyecto número 2
        for project in projects:
            if project.get('number') == PROJECT_NUMBER:
                return project
        
        return None
    except Exception as e:
        print(f"{RED}❌ Error: {e}{NC}")
        return None

def get_all_issues():
    """Obtener todas las issues"""
    try:
        result = subprocess.run(
            ['gh', 'issue', 'list', '--repo', REPO, '--state', 'all', '--json', 'number,title,body'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        print(f"{RED}❌ Error: {e}{NC}")
        return []

def main():
    print(f"{GREEN}🚀 Agregando issues al proyecto de GitHub{NC}\n")
    print(f"{YELLOW}⚠️  Nota: GitHub Projects requiere agregar issues manualmente desde la interfaz web{NC}\n")
    print(f"{BLUE}📋 Generando lista de issues para agregar...{NC}\n")
    
    # Obtener todas las issues
    issues = get_all_issues()
    print(f"{GREEN}✅ Encontradas {len(issues)} issues{NC}\n")
    
    # Organizar por semana
    issues_by_week = {1: [], 2: [], 3: [], 4: []}
    
    for issue in issues:
        body = issue.get('body', '')
        if '## Semana' in body:
            lines = body.split('\n')
            for i, line in enumerate(lines):
                if '## Semana' in line and i + 1 < len(lines):
                    try:
                        week = int(lines[i + 1].strip())
                        if week in issues_by_week:
                            issues_by_week[week].append(issue)
                            break
                    except ValueError:
                        pass
    
    # Generar reporte
    print(f"{BLUE}📊 Issues organizadas por semana:{NC}\n")
    for week in [1, 2, 3, 4]:
        print(f"{YELLOW}📅 Semana {week}: {len(issues_by_week[week])} issues{NC}")
        for issue in issues_by_week[week][:5]:  # Mostrar primeras 5
            print(f"   - #{issue['number']}: {issue['title'][:50]}")
        if len(issues_by_week[week]) > 5:
            print(f"   ... y {len(issues_by_week[week]) - 5} más")
        print()
    
    # Generar archivo con instrucciones
    instructions = f"""# 📋 Instrucciones para Agregar Issues al Proyecto

## 🔗 Enlace al Proyecto
https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}

## 📝 Pasos para Agregar Issues

1. Ve a tu proyecto: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}
2. Haz clic en "Add item" (o presiona `Ctrl+Space`)
3. Busca cada issue por número o título
4. Agrégala al proyecto

## 📊 Issues por Semana

"""
    
    for week in [1, 2, 3, 4]:
        instructions += f"### Semana {week} ({len(issues_by_week[week])} issues)\n\n"
        for issue in issues_by_week[week]:
            instructions += f"- [#{issue['number']}](https://github.com/{REPO}/issues/{issue['number']}) - {issue['title']}\n"
        instructions += "\n"
    
    instructions += f"""
## 🚀 Método Rápido

Puedes copiar y pegar estos números de issues en la búsqueda del proyecto:

**Semana 1:**
{', '.join([f"#{i['number']}" for i in issues_by_week[1]])}

**Semana 2:**
{', '.join([f"#{i['number']}" for i in issues_by_week[2]])}

**Semana 3:**
{', '.join([f"#{i['number']}" for i in issues_by_week[3]])}

**Semana 4:**
{', '.join([f"#{i['number']}" for i in issues_by_week[4]])}
"""
    
    with open("docs/AGREGAR-ISSUES-PROYECTO.md", 'w', encoding='utf-8') as f:
        f.write(instructions)
    
    print(f"{GREEN}✅ Archivo generado: docs/AGREGAR-ISSUES-PROYECTO.md{NC}")
    print(f"\n{BLUE}💡 Siguiente paso:{NC}")
    print(f"   1. Abre: docs/AGREGAR-ISSUES-PROYECTO.md")
    print(f"   2. Sigue las instrucciones para agregar las issues manualmente")
    print(f"   3. O ve directamente a: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}")

if __name__ == "__main__":
    main()

