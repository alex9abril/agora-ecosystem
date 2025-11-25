#!/usr/bin/env python3
"""
Script para generar un diagrama de Gantt del proyecto LOCALIA
Genera archivos en formato Mermaid y CSV para importar en herramientas de Gantt
"""

import csv
import json
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

# Colores
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

REPO = "alex9abril/localia-admin"
START_DATE = datetime(2025, 1, 13)  # Lunes de la semana 1 (ajusta según tu fecha de inicio)

def get_issues_by_week():
    """Obtener issues organizadas por semana y desarrollador"""
    try:
        result = subprocess.run(
            ['gh', 'issue', 'list', '--repo', REPO, '--state', 'all', '--json', 'number,title,body'],
            capture_output=True,
            text=True,
            check=True
        )
        issues = json.loads(result.stdout)
        
        issues_by_week_dev = {
            1: {'Dev1': [], 'Dev2': [], 'Dev3': []},
            2: {'Dev1': [], 'Dev2': [], 'Dev3': []},
            3: {'Dev1': [], 'Dev2': [], 'Dev3': []},
            4: {'Dev1': [], 'Dev2': [], 'Dev3': []}
        }
        
        for issue in issues:
            body = issue.get('body', '')
            week = None
            developer = None
            
            # Extraer semana y desarrollador del body
            lines = body.split('\n')
            for i, line in enumerate(lines):
                if '## Semana' in line and i + 1 < len(lines):
                    try:
                        week = int(lines[i + 1].strip())
                    except ValueError:
                        pass
                if '## Desarrollador' in line and i + 1 < len(lines):
                    developer = lines[i + 1].strip()
            
            if week and developer and week in issues_by_week_dev:
                if developer in issues_by_week_dev[week]:
                    issues_by_week_dev[week][developer].append(issue)
        
        return issues_by_week_dev
    except Exception as e:
        print(f"Error: {e}")
        return None

def calculate_week_dates(week_number):
    """Calcular fechas de inicio y fin de una semana"""
    start = START_DATE + timedelta(weeks=week_number - 1)
    end = start + timedelta(days=4)  # Viernes
    return start, end

def generate_mermaid_gantt(issues_by_week_dev):
    """Generar diagrama de Gantt en formato Mermaid"""
    mermaid = """gantt
    title LOCALIA - Plan de Desarrollo 4 Semanas
    dateFormat YYYY-MM-DD
    section Semana 1
"""
    
    # Semana 1
    start1, end1 = calculate_week_dates(1)
    for dev in ['Dev1', 'Dev2', 'Dev3']:
        issues = issues_by_week_dev[1][dev]
        for issue in issues[:5]:  # Limitar para que no sea muy largo
            title = issue['title'].replace('"', "'")[:40]
            mermaid += f"    {title} :{dev.lower()}, {start1.strftime('%Y-%m-%d')}, 5d\n"
    
    mermaid += "\n    section Semana 2\n"
    start2, end2 = calculate_week_dates(2)
    for dev in ['Dev1', 'Dev2', 'Dev3']:
        issues = issues_by_week_dev[2][dev]
        for issue in issues[:5]:
            title = issue['title'].replace('"', "'")[:40]
            mermaid += f"    {title} :{dev.lower()}, {start2.strftime('%Y-%m-%d')}, 5d\n"
    
    mermaid += "\n    section Semana 3\n"
    start3, end3 = calculate_week_dates(3)
    for dev in ['Dev1', 'Dev2', 'Dev3']:
        issues = issues_by_week_dev[3][dev]
        for issue in issues[:5]:
            title = issue['title'].replace('"', "'")[:40]
            mermaid += f"    {title} :{dev.lower()}, {start3.strftime('%Y-%m-%d')}, 5d\n"
    
    mermaid += "\n    section Semana 4\n"
    start4, end4 = calculate_week_dates(4)
    for dev in ['Dev1', 'Dev2', 'Dev3']:
        issues = issues_by_week_dev[4][dev]
        for issue in issues[:5]:
            title = issue['title'].replace('"', "'")[:40]
            mermaid += f"    {title} :{dev.lower()}, {start4.strftime('%Y-%m-%d')}, 5d\n"
    
    return mermaid

def generate_csv_gantt(issues_by_week_dev):
    """Generar CSV para importar en herramientas de Gantt (ProjectLibre, MS Project, etc.)"""
    rows = []
    
    for week in [1, 2, 3, 4]:
        start, end = calculate_week_dates(week)
        for dev in ['Dev1', 'Dev2', 'Dev3']:
            issues = issues_by_week_dev[week][dev]
            for issue in issues:
                rows.append({
                    'Task Name': issue['title'],
                    'Start Date': start.strftime('%Y-%m-%d'),
                    'End Date': end.strftime('%Y-%m-%d'),
                    'Duration': '5 days',
                    'Developer': dev,
                    'Week': week,
                    'Issue Number': issue['number']
                })
    
    return rows

def generate_detailed_gantt_markdown(issues_by_week_dev):
    """Generar un documento Markdown con el Gantt detallado"""
    md = """# 📊 Diagrama de Gantt - LOCALIA MVP (4 Semanas)

## 📅 Fechas del Proyecto

"""
    
    for week in [1, 2, 3, 4]:
        start, end = calculate_week_dates(week)
        md += f"### Semana {week}: {start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}\n\n"
        
        for dev in ['Dev1', 'Dev2', 'Dev3']:
            issues = issues_by_week_dev[week][dev]
            if issues:
                md += f"#### {dev}\n\n"
                for issue in issues:
                    md += f"- **#{issue['number']}** {issue['title']}\n"
                md += "\n"
    
    md += """
## 📈 Diagrama de Gantt (Mermaid)

```mermaid
"""
    md += generate_mermaid_gantt(issues_by_week_dev)
    md += "```\n\n"
    
    md += """
## 📝 Notas

- Cada semana tiene 5 días laborables (Lunes a Viernes)
- Las tareas están distribuidas entre 3 desarrolladores
- Total: 4 semanas = 20 días laborables
- Horas estimadas: 160h por desarrollador = 480h totales

## 🔗 Enlaces

- [Issues en GitHub](https://github.com/alex9abril/localia-admin/issues)
- [Proyecto en GitHub](https://github.com/users/alex9abril/projects/2)
"""
    
    return md

def main():
    print(f"{GREEN}🚀 Generando diagrama de Gantt{NC}\n")
    
    # Obtener issues organizadas
    print(f"{BLUE}📋 Obteniendo issues...{NC}")
    issues_by_week_dev = get_issues_by_week()
    if not issues_by_week_dev:
        print(f"❌ Error obteniendo issues")
        return
    
    total = sum(len(issues) for week in issues_by_week_dev.values() for issues in week.values())
    print(f"{GREEN}✅ Procesando {total} issues{NC}\n")
    
    # Generar archivos
    print(f"{BLUE}📝 Generando archivos...{NC}")
    
    # 1. Mermaid Gantt
    mermaid_content = generate_mermaid_gantt(issues_by_week_dev)
    Path("docs/gantt.mmd").write_text(mermaid_content, encoding='utf-8')
    print(f"{GREEN}✅ Creado: docs/gantt.mmd{NC}")
    
    # 2. CSV para importar
    csv_rows = generate_csv_gantt(issues_by_week_dev)
    with open("docs/gantt-import.csv", 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Task Name', 'Start Date', 'End Date', 'Duration', 'Developer', 'Week', 'Issue Number'])
        writer.writeheader()
        writer.writerows(csv_rows)
    print(f"{GREEN}✅ Creado: docs/gantt-import.csv{NC}")
    
    # 3. Markdown detallado
    md_content = generate_detailed_gantt_markdown(issues_by_week_dev)
    Path("docs/GANTT-CHART.md").write_text(md_content, encoding='utf-8')
    print(f"{GREEN}✅ Creado: docs/GANTT-CHART.md{NC}")
    
    print(f"\n{GREEN}✨ Proceso completado{NC}")
    print(f"\n{BLUE}💡 Archivos generados:{NC}")
    print(f"   1. docs/gantt.mmd - Para visualizar en GitHub o editores Markdown")
    print(f"   2. docs/gantt-import.csv - Para importar en ProjectLibre, MS Project, etc.")
    print(f"   3. docs/GANTT-CHART.md - Documento completo con el Gantt")
    print(f"\n{BLUE}📅 Fecha de inicio del proyecto: {START_DATE.strftime('%d/%m/%Y')}{NC}")
    print(f"{BLUE}📅 Fecha de fin del proyecto: {(START_DATE + timedelta(weeks=4, days=-1)).strftime('%d/%m/%Y')}{NC}")

if __name__ == "__main__":
    main()

