#!/usr/bin/env python3
"""
Script para agregar issues al proyecto de GitHub
Requiere: GitHub CLI (gh) instalado y autenticado
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

PROJECT_NUMBER = 2  # Número del proyecto
OWNER = "alex9abril"
REPO = "alex9abril/localia-admin"

def get_project_id():
    """Obtener el ID del proyecto"""
    try:
        # Obtener información del proyecto
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={{user(login:"{OWNER}"){{projectV2(number:{PROJECT_NUMBER}){{id}}}}}}'],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        project_id = data['data']['user']['projectV2']['id']
        return project_id
    except Exception as e:
        print(f"{RED}❌ Error obteniendo ID del proyecto: {e}{NC}")
        return None

def get_issues_by_week():
    """Obtener todas las issues y organizarlas por semana"""
    try:
        # Obtener todas las issues abiertas
        result = subprocess.run(
            ['gh', 'issue', 'list', '--repo', REPO, '--state', 'all', '--json', 'number,title,body'],
            capture_output=True,
            text=True,
            check=True
        )
        issues = json.loads(result.stdout)
        
        # Organizar por semana basándose en el body
        issues_by_week = {1: [], 2: [], 3: [], 4: []}
        
        for issue in issues:
            body = issue.get('body', '')
            # Buscar "## Semana" en el body
            if '## Semana' in body:
                lines = body.split('\n')
                for i, line in enumerate(lines):
                    if '## Semana' in line and i + 1 < len(lines):
                        week_str = lines[i + 1].strip()
                        try:
                            week = int(week_str)
                            if week in issues_by_week:
                                issues_by_week[week].append(issue)
                                break
                        except ValueError:
                            pass
        
        return issues_by_week
    except Exception as e:
        print(f"{RED}❌ Error obteniendo issues: {e}{NC}")
        return None

def add_issue_to_project(project_id, issue_id):
    """Agregar una issue al proyecto"""
    try:
        mutation = f"""
        mutation {{
            addProjectV2ItemById(input: {{
                projectId: "{project_id}"
                contentId: "{issue_id}"
            }}) {{
                item {{
                    id
                }}
            }}
        }}
        """
        
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={mutation}'],
            capture_output=True,
            text=True,
            check=True
        )
        return True, None
    except subprocess.CalledProcessError as e:
        # Si la issue ya está en el proyecto, ignorar el error
        if "already exists" in e.stderr.lower() or "already added" in e.stderr.lower():
            return True, "ya existe"
        return False, e.stderr
    except Exception as e:
        return False, str(e)

def get_issue_node_id(issue_number):
    """Obtener el node ID de una issue"""
    try:
        query = f"""
        {{
            repository(owner: "{OWNER}", name: "localia-admin") {{
                issue(number: {issue_number}) {{
                    id
                }}
            }}
        }}
        """
        
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={query}'],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        return data['data']['repository']['issue']['id']
    except Exception as e:
        return None

def main():
    print(f"{GREEN}🚀 Agregando issues al proyecto de GitHub{NC}\n")
    
    # Obtener ID del proyecto
    print(f"{BLUE}📋 Obteniendo información del proyecto...{NC}")
    project_id = get_project_id()
    if not project_id:
        print(f"{RED}❌ No se pudo obtener el ID del proyecto{NC}")
        sys.exit(1)
    
    print(f"{GREEN}✅ Proyecto encontrado: {project_id}{NC}\n")
    
    # Obtener issues organizadas por semana
    print(f"{BLUE}📋 Obteniendo issues...{NC}")
    issues_by_week = get_issues_by_week()
    if not issues_by_week:
        print(f"{RED}❌ No se pudieron obtener las issues{NC}")
        sys.exit(1)
    
    total_issues = sum(len(issues) for issues in issues_by_week.values())
    print(f"{GREEN}✅ Encontradas {total_issues} issues organizadas por semana{NC}\n")
    
    # Agregar issues al proyecto
    added = 0
    skipped = 0
    errors = 0
    
    for week, issues in issues_by_week.items():
        print(f"{YELLOW}📅 Semana {week}: {len(issues)} issues{NC}")
        
        for issue in issues:
            issue_number = issue['number']
            issue_title = issue['title']
            
            print(f"   📝 Agregando: #{issue_number} - {issue_title[:50]}...")
            
            # Obtener node ID de la issue
            issue_node_id = get_issue_node_id(issue_number)
            if not issue_node_id:
                print(f"   {RED}❌ No se pudo obtener node ID{NC}")
                errors += 1
                continue
            
            # Agregar al proyecto
            success, message = add_issue_to_project(project_id, issue_node_id)
            
            if success:
                if message == "ya existe":
                    print(f"   {YELLOW}⚠️  Ya existe en el proyecto{NC}")
                    skipped += 1
                else:
                    print(f"   {GREEN}✅ Agregada{NC}")
                    added += 1
            else:
                print(f"   {RED}❌ Error: {message}{NC}")
                errors += 1
            
            # Pausa para no sobrecargar la API
            time.sleep(0.5)
        
        print()
    
    # Resumen
    print(f"{GREEN}✨ Proceso completado{NC}")
    print(f"{GREEN}✅ Issues agregadas: {added}{NC}")
    print(f"{YELLOW}⚠️  Ya existían: {skipped}{NC}")
    print(f"{RED}❌ Errores: {errors}{NC}")
    print(f"\n{BLUE}💡 Ve a tu proyecto: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}{NC}")

if __name__ == "__main__":
    main()

