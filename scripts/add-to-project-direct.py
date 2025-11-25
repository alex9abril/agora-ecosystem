#!/usr/bin/env python3
"""
Script para agregar issues directamente al proyecto usando GraphQL API
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
REPO_NAME = "localia-admin"
REPO = f"{OWNER}/{REPO_NAME}"

def get_project_id():
    """Obtener el ID del proyecto usando GraphQL"""
    query = f"""
    {{
      user(login: "{OWNER}") {{
        projectV2(number: {PROJECT_NUMBER}) {{
          id
          title
        }}
      }}
    }}
    """
    
    try:
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={query}'],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        project = data.get('data', {}).get('user', {}).get('projectV2')
        if project:
            return project.get('id'), project.get('title')
        return None, None
    except Exception as e:
        print(f"{RED}❌ Error obteniendo proyecto: {e}{NC}")
        print(f"{YELLOW}   Output: {result.stdout if 'result' in locals() else 'N/A'}{NC}")
        print(f"{YELLOW}   Error: {result.stderr if 'result' in locals() else 'N/A'}{NC}")
        return None, None

def get_issue_node_id(issue_number):
    """Obtener el node ID de una issue"""
    query = f"""
    {{
      repository(owner: "{OWNER}", name: "{REPO_NAME}") {{
        issue(number: {issue_number}) {{
          id
          title
        }}
      }}
    }}
    """
    
    try:
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={query}'],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        issue = data.get('data', {}).get('repository', {}).get('issue')
        if issue:
            return issue.get('id'), issue.get('title')
        return None, None
    except Exception as e:
        return None, None

def add_issue_to_project(project_id, issue_node_id):
    """Agregar issue al proyecto"""
    mutation = f"""
    mutation {{
      addProjectV2ItemById(input: {{
        projectId: "{project_id}"
        contentId: "{issue_node_id}"
      }}) {{
        item {{
          id
        }}
      }}
    }}
    """
    
    try:
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={mutation}'],
            capture_output=True,
            text=True,
            check=True
        )
        return True, None
    except subprocess.CalledProcessError as e:
        stderr = e.stderr if hasattr(e, 'stderr') else str(e)
        # Si ya existe, no es un error
        if "already" in stderr.lower() or "duplicate" in stderr.lower():
            return True, "ya existe"
        return False, stderr
    except Exception as e:
        return False, str(e)

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
    
    # Obtener ID del proyecto
    print(f"{BLUE}📋 Obteniendo información del proyecto...{NC}")
    project_id, project_title = get_project_id()
    
    if not project_id:
        print(f"{RED}❌ No se pudo obtener el ID del proyecto{NC}")
        print(f"{YELLOW}💡 Verifica que:{NC}")
        print(f"   1. El proyecto existe: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}")
        print(f"   2. Tienes permisos para acceder al proyecto")
        print(f"   3. El proyecto es de tipo 'Project (beta)'")
        sys.exit(1)
    
    print(f"{GREEN}✅ Proyecto encontrado: {project_title} (ID: {project_id[:20]}...){NC}\n")
    
    # Obtener todas las issues
    print(f"{BLUE}📋 Obteniendo issues...{NC}")
    issues = get_all_issues()
    print(f"{GREEN}✅ Encontradas {len(issues)} issues{NC}\n")
    
    if not issues:
        print(f"{YELLOW}⚠️  No hay issues para agregar{NC}")
        sys.exit(0)
    
    # Agregar issues al proyecto
    print(f"{BLUE}📝 Agregando issues al proyecto...{NC}\n")
    
    added = 0
    skipped = 0
    errors = 0
    
    for i, issue in enumerate(issues, 1):
        issue_number = issue['number']
        issue_title = issue['title']
        
        print(f"[{i}/{len(issues)}] 📝 #{issue_number}: {issue_title[:50]}...", end=" ")
        
        # Obtener node ID de la issue
        issue_node_id, _ = get_issue_node_id(issue_number)
        if not issue_node_id:
            print(f"{RED}❌ No se pudo obtener node ID{NC}")
            errors += 1
            continue
        
        # Agregar al proyecto
        success, message = add_issue_to_project(project_id, issue_node_id)
        
        if success:
            if message == "ya existe":
                print(f"{YELLOW}⚠️  Ya existe{NC}")
                skipped += 1
            else:
                print(f"{GREEN}✅ Agregada{NC}")
                added += 1
        else:
            print(f"{RED}❌ Error{NC}")
            if message:
                print(f"   {RED}{message[:100]}{NC}")
            errors += 1
        
        # Pausa para no sobrecargar la API
        time.sleep(0.5)
    
    # Resumen
    print(f"\n{GREEN}✨ Proceso completado{NC}")
    print(f"{GREEN}✅ Issues agregadas: {added}{NC}")
    print(f"{YELLOW}⚠️  Ya existían: {skipped}{NC}")
    print(f"{RED}❌ Errores: {errors}{NC}")
    print(f"\n{BLUE}💡 Ve a tu proyecto: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}{NC}")

if __name__ == "__main__":
    main()

