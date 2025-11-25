#!/usr/bin/env python3
"""
Script para agregar labels a las issues basándose en el CSV
Requiere: GitHub CLI (gh) instalado y autenticado
"""

import csv
import subprocess
import sys
import json
import time
from pathlib import Path

# Colores
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'

REPO = "alex9abril/localia-admin"

def get_all_issues():
    """Obtener todas las issues del repositorio"""
    try:
        result = subprocess.run(
            ['gh', 'issue', 'list', '--repo', REPO, '--state', 'all', '--json', 'number,title'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        print(f"{RED}❌ Error obteniendo issues: {e}{NC}")
        return []

def add_labels_to_issue(issue_number, labels):
    """Agregar labels a una issue"""
    if not labels or not labels.strip():
        return True, "sin labels"
    
    label_list = [l.strip() for l in labels.split(',') if l.strip()]
    
    for label in label_list:
        try:
            subprocess.run(
                ['gh', 'issue', 'edit', str(issue_number), '--add-label', label, '--repo', REPO],
                capture_output=True,
                check=True
            )
        except subprocess.CalledProcessError as e:
            # Si el label no existe, continuar
            stderr_str = e.stderr.decode('utf-8') if isinstance(e.stderr, bytes) else str(e.stderr)
            if "label" in stderr_str.lower() and "not found" in stderr_str.lower():
                continue
            return False, stderr_str
    
    return True, None

def main():
    print(f"{GREEN}🚀 Agregando labels a las issues{NC}\n")
    
    csv_path = Path("docs/github-projects-import.csv")
    if not csv_path.exists():
        print(f"{RED}❌ No se encontró el archivo: {csv_path}{NC}")
        sys.exit(1)
    
    # Obtener todas las issues
    print(f"{BLUE}📋 Obteniendo issues del repositorio...{NC}")
    all_issues = get_all_issues()
    print(f"{GREEN}✅ Encontradas {len(all_issues)} issues{NC}\n")
    
    # Crear diccionario de issues por título
    issues_by_title = {issue['title']: issue['number'] for issue in all_issues}
    
    # Leer CSV y agregar labels
    print(f"{BLUE}📋 Leyendo CSV y agregando labels...{NC}\n")
    
    updated = 0
    not_found = 0
    errors = 0
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            title = row['Title'].strip()
            labels = row['Labels'].strip()
            
            if title in issues_by_title:
                issue_number = issues_by_title[title]
                print(f"{YELLOW}📝 Actualizando #{issue_number}: {title[:50]}...{NC}")
                
                success, message = add_labels_to_issue(issue_number, labels)
                
                if success:
                    if message == "sin labels":
                        print(f"   {YELLOW}⚠️  Sin labels para agregar{NC}")
                    else:
                        print(f"   {GREEN}✅ Labels agregados: {labels}{NC}")
                    updated += 1
                else:
                    print(f"   {RED}❌ Error: {message}{NC}")
                    errors += 1
            else:
                print(f"{YELLOW}⚠️  Issue no encontrada: {title[:50]}...{NC}")
                not_found += 1
            
            time.sleep(0.2)
    
    # Resumen
    print(f"\n{GREEN}✨ Proceso completado{NC}")
    print(f"{GREEN}✅ Issues actualizadas: {updated}{NC}")
    print(f"{YELLOW}⚠️  No encontradas: {not_found}{NC}")
    print(f"{RED}❌ Errores: {errors}{NC}")

if __name__ == "__main__":
    main()

