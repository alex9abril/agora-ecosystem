#!/usr/bin/env python3
"""
Script para crear issues en GitHub desde CSV
Requiere: GitHub CLI (gh) instalado y autenticado
"""

import csv
import subprocess
import sys
import time
from pathlib import Path

# Colores para output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def check_gh_installed():
    """Verificar que GitHub CLI está instalado"""
    try:
        subprocess.run(['gh', '--version'], 
                      capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"{RED}❌ GitHub CLI (gh) no está instalado{NC}")
        print("Instala desde: https://cli.github.com/")
        return False

def check_gh_auth():
    """Verificar autenticación de GitHub"""
    try:
        subprocess.run(['gh', 'auth', 'status'], 
                      capture_output=True, check=True)
        return True
    except subprocess.CalledProcessError:
        print(f"{YELLOW}⚠️  No estás autenticado en GitHub CLI{NC}")
        print("Ejecuta: gh auth login")
        return False

def create_issue(title, body, labels, repo):
    """Crear una issue en GitHub"""
    try:
        # Preparar comando
        cmd = ['gh', 'issue', 'create',
               '--title', title,
               '--body', body,
               '--repo', repo]
        
        # Agregar labels si existen
        if labels and labels.strip():
            # Separar labels por coma
            label_list = [l.strip() for l in labels.split(',') if l.strip()]
            for label in label_list:
                cmd.extend(['--label', label])
        
        # Crear issue
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # Si falla por labels, intentar sin labels
        if 'label' in e.stderr.lower():
            try:
                cmd = ['gh', 'issue', 'create',
                       '--title', title,
                       '--body', body,
                       '--repo', repo]
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                return True, result.stdout.strip() + " (sin labels - agrégalos manualmente)"
            except:
                return False, e.stderr.strip()
        return False, e.stderr.strip()

def main():
    print(f"{GREEN}🚀 Creando issues para LOCALIA Project{NC}\n")
    
    # Verificaciones
    if not check_gh_installed():
        sys.exit(1)
    
    if not check_gh_auth():
        sys.exit(1)
    
    repo = "alex9abril/localia-admin"
    csv_path = Path("docs/github-projects-import.csv")
    
    if not csv_path.exists():
        print(f"{RED}❌ No se encontró el archivo: {csv_path}{NC}")
        sys.exit(1)
    
    print(f"{BLUE}📋 Leyendo CSV y creando issues...{NC}\n")
    
    created = 0
    errors = 0
    skipped = 0
    
    # Leer CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            title = row['Title'].strip()
            body_text = row['Body'].strip()
            labels = row['Labels'].strip()
            week = row['Week'].strip()
            developer = row['Developer'].strip()
            priority = row['Priority'].strip()
            
            # Validar campos requeridos
            if not title or not body_text:
                print(f"{YELLOW}⚠️  Saltando línea vacía o inválida{NC}")
                skipped += 1
                continue
            
            # Crear body completo
            full_body = f"""## Descripción
{body_text}

## Semana
{week}

## Desarrollador
{developer}

## Prioridad
{priority}

---
*Creado automáticamente desde el plan de proyecto*"""
            
            # Crear issue
            print(f"{YELLOW}📝 Creando: {title}{NC}")
            success, message = create_issue(title, full_body, labels, repo)
            
            if success:
                print(f"{GREEN}✅ Creada: {title}{NC}")
                if "sin labels" in message:
                    print(f"   {YELLOW}⚠️  {message}{NC}")
                created += 1
            else:
                print(f"{RED}❌ Error: {title}{NC}")
                print(f"   {message}")
                errors += 1
            
            # Pausa para no sobrecargar la API
            time.sleep(0.3)
    
    # Resumen
    print(f"\n{GREEN}✨ Proceso completado{NC}")
    print(f"{GREEN}✅ Issues creadas: {created}{NC}")
    print(f"{RED}❌ Errores: {errors}{NC}")
    print(f"{YELLOW}⚠️  Saltadas: {skipped}{NC}")
    print(f"\n{BLUE}💡 Próximos pasos:{NC}")
    print(f"   1. Ve a: https://github.com/{repo}/issues")
    print(f"   2. Crea los labels necesarios si no existen:")
    print(f"      - backend, mobile, web")
    print(f"      - setup, auth, orders, localcoins, social")
    print(f"      - high, medium, low")
    print(f"   3. Agrega las issues a tu proyecto:")
    print(f"      https://github.com/users/alex9abril/projects/2")
    print(f"   4. Haz clic en 'Add item' y busca las issues creadas")

if __name__ == "__main__":
    main()

