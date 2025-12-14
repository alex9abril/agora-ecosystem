# Configuración de Jenkins para Monorepo

Esta guía explica cómo configurar Jenkins para hacer deploy de múltiples proyectos (1 backend + 3 frontends) desde un solo repositorio, compilando solo los proyectos que tienen cambios.

## Estructura del Proyecto

```
agora-ecosystem/
├── apps/
│   ├── backend/          # Proyecto 1: Backend NestJS
│   ├── store-front/      # Proyecto 2: Frontend Next.js
│   ├── web-admin/        # Proyecto 3: Frontend Admin
│   └── web-cliente/      # Proyecto 4: Frontend Cliente
└── ...
```

## Estrategia: Path Filters en Jenkins

Cada job de Jenkins se configurará para:
1. Clonar todo el repositorio (una sola vez)
2. Detectar cambios solo en su directorio específico
3. Compilar solo su proyecto correspondiente
4. Hacer deploy solo si hay cambios

## Configuración de Jobs en Jenkins

### Job 1: Backend

**Nombre**: `agora-ecosystem-backend`

**Configuración de SCM (Source Code Management)**:
- **Repository URL**: `https://github.com/tu-usuario/agora-ecosystem.git`
- **Branches to build**: `*/main` (o la rama que uses)

**Build Triggers**:
- ✅ **Poll SCM** (opcional, para builds automáticos)
- ✅ **GitHub hook trigger for GITScm polling** (recomendado)

**Additional Behaviours** (en SCM):
- Agregar: **Polling ignores commits in certain paths**
  - **Included Regions**: 
    ```
    apps/backend/.*
    database/.*
    apps/backend/.*
    ```
  - **Excluded Regions**: (dejar vacío o excluir otros proyectos)

**Build Steps**:
```bash
#!/bin/bash
# Verificar si hay cambios en el backend
if git diff --name-only HEAD~1 HEAD | grep -q "^apps/backend/"; then
  echo "✅ Cambios detectados en backend"
  
  cd apps/backend
  npm install
  npm run build
  
  # Aquí va tu comando de deploy
  # Ejemplo: docker build, deploy a servidor, etc.
else
  echo "⏭️  No hay cambios en backend, saltando build"
  exit 0
fi
```

**Post-build Actions**:
- Enviar notificaciones (email, Slack, etc.)

---

### Job 2: Store Front

**Nombre**: `agora-ecosystem-store-front`

**Configuración de SCM**:
- Mismo repositorio que el backend

**Additional Behaviours**:
- **Included Regions**: 
  ```
  apps/store-front/.*
  ```

**Build Steps**:
```bash
#!/bin/bash
if git diff --name-only HEAD~1 HEAD | grep -q "^apps/store-front/"; then
  echo "✅ Cambios detectados en store-front"
  
  cd apps/store-front
  npm install
  npm run build
  
  # Deploy del frontend
else
  echo "⏭️  No hay cambios en store-front, saltando build"
  exit 0
fi
```

---

### Job 3: Web Admin

**Nombre**: `agora-ecosystem-web-admin`

**Configuración similar**, con:
- **Included Regions**: `apps/web-admin/.*`

**Build Steps**:
```bash
#!/bin/bash
if git diff --name-only HEAD~1 HEAD | grep -q "^apps/web-admin/"; then
  echo "✅ Cambios detectados en web-admin"
  
  cd apps/web-admin
  npm install
  npm run build
  
  # Deploy
else
  echo "⏭️  No hay cambios en web-admin, saltando build"
  exit 0
fi
```

---

### Job 4: Web Cliente

**Nombre**: `agora-ecosystem-web-cliente`

**Configuración similar**, con:
- **Included Regions**: `apps/web-cliente/.*`

---

## Alternativa: Pipeline Único con Parámetros

Si prefieres un solo pipeline que pueda compilar diferentes proyectos:

### Jenkinsfile (Pipeline as Code)

Crea un `Jenkinsfile` en la raíz del proyecto:

```groovy
pipeline {
    agent any
    
    parameters {
        choice(
            name: 'PROJECT',
            choices: ['backend', 'store-front', 'web-admin', 'web-cliente', 'all'],
            description: 'Proyecto a compilar'
        )
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Detect Changes') {
            steps {
                script {
                    def changedFiles = sh(
                        script: 'git diff --name-only HEAD~1 HEAD',
                        returnStdout: true
                    ).trim()
                    
                    env.CHANGED_FILES = changedFiles
                    echo "Archivos cambiados:\n${changedFiles}"
                }
            }
        }
        
        stage('Build Backend') {
            when {
                anyOf {
                    params.PROJECT == 'backend'
                    params.PROJECT == 'all'
                    expression {
                        env.CHANGED_FILES.contains('apps/backend/')
                    }
                }
            }
            steps {
                dir('apps/backend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Store Front') {
            when {
                anyOf {
                    params.PROJECT == 'store-front'
                    params.PROJECT == 'all'
                    expression {
                        env.CHANGED_FILES.contains('apps/store-front/')
                    }
                }
            }
            steps {
                dir('apps/store-front') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Web Admin') {
            when {
                anyOf {
                    params.PROJECT == 'web-admin'
                    params.PROJECT == 'all'
                    expression {
                        env.CHANGED_FILES.contains('apps/web-admin/')
                    }
                }
            }
            steps {
                dir('apps/web-admin') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Web Cliente') {
            when {
                anyOf {
                    params.PROJECT == 'web-cliente'
                    params.PROJECT == 'all'
                    expression {
                        env.CHANGED_FILES.contains('apps/web-cliente/')
                    }
                }
            }
            steps {
                dir('apps/web-cliente') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }
    }
    
    post {
        success {
            echo '✅ Build exitoso'
        }
        failure {
            echo '❌ Build falló'
        }
    }
}
```

---

## Script de Detección de Cambios Mejorado

Crea un script `scripts/check-changes.sh` para detectar cambios de forma más robusta:

```bash
#!/bin/bash
# scripts/check-changes.sh

PROJECT=$1
BASE_COMMIT=${2:-HEAD~1}
CURRENT_COMMIT=${3:-HEAD}

# Obtener archivos cambiados
CHANGED_FILES=$(git diff --name-only $BASE_COMMIT $CURRENT_COMMIT)

# Verificar si hay cambios en el proyecto
case $PROJECT in
    backend)
        if echo "$CHANGED_FILES" | grep -q "^apps/backend/\|^database/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    store-front)
        if echo "$CHANGED_FILES" | grep -q "^apps/store-front/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    web-admin)
        if echo "$CHANGED_FILES" | grep -q "^apps/web-admin/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    web-cliente)
        if echo "$CHANGED_FILES" | grep -q "^apps/web-cliente/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    *)
        echo "false"
        ;;
esac
```

Uso en Jenkins:
```bash
if [ "$(./scripts/check-changes.sh backend)" == "true" ]; then
  # Compilar backend
fi
```

---

## Recomendaciones

1. **Usar Path Filters**: La forma más eficiente para monorepos
2. **GitHub Webhooks**: Configurar webhooks para builds automáticos
3. **Caché de dependencias**: Usar `npm ci` y cachear `node_modules`
4. **Paralelización**: Los 4 jobs pueden ejecutarse en paralelo si hay cambios en múltiples proyectos
5. **Notificaciones**: Configurar notificaciones solo cuando hay builds reales

---

## Ejemplo de Configuración Completa con Docker

Si usas Docker, puedes optimizar aún más:

```bash
#!/bin/bash
PROJECT="backend"  # o store-front, web-admin, web-cliente

# Verificar cambios
if ! git diff --name-only HEAD~1 HEAD | grep -q "^apps/${PROJECT}/"; then
  echo "⏭️  No hay cambios en ${PROJECT}"
  exit 0
fi

# Build con Docker
docker build \
  -f apps/${PROJECT}/Dockerfile \
  -t agora-${PROJECT}:${BUILD_NUMBER} \
  --build-arg PROJECT_PATH=apps/${PROJECT} \
  .

# Deploy
docker push agora-${PROJECT}:${BUILD_NUMBER}
```

---

## Ventajas de este Enfoque

✅ **Eficiencia**: Solo compila lo que cambió  
✅ **Velocidad**: Builds más rápidos  
✅ **Recursos**: Menor uso de recursos del servidor  
✅ **Flexibilidad**: Puedes compilar proyectos individuales o todos  
✅ **Escalabilidad**: Fácil agregar nuevos proyectos

