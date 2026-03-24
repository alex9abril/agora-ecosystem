pipeline {
    agent any
    
    parameters {
        choice(
            name: 'APP_TO_DEPLOY',
            choices: ['all', 'backend', 'store-front', 'web-admin', 'web-local'],
            description: 'Aplicación a desplegar (all = todas)'
        )
        choice(
            name: 'DEPLOY_MODE',
            choices: ['auto', 'force'],
            description: 'auto = solo si hay cambios, force = siempre desplegar'
        )
    }
    
    environment {
        // Rutas en el servidor
        DEPLOY_BASE = '/var/www/agora/prod'
        ENV_BASE = '/etc/agora'
        
        // Configuración SSH (solo necesario si Jenkins está en otro servidor)
        // Si Jenkins está en el mismo servidor, dejar SSH_HOST vacío para ejecutar localmente
        // Si Jenkins está en otro servidor, configurar SSH_HOST y SSH_CREDENTIAL_ID como variables de entorno
        SSH_HOST = "${env.SSH_HOST ?: ''}"
        SSH_USER = "${env.SSH_USER ?: 'jenkins'}"
        SSH_CREDENTIAL_ID = "${env.SSH_CREDENTIAL_ID ?: ''}"
        
        // Rutas locales en el workspace
        WORKSPACE_BASE = "${WORKSPACE}"
        
        // Node version
        NODE_VERSION = '20'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.GIT_BRANCH = sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
                    echo "📝 Commit: ${env.GIT_COMMIT}"
                    echo "🌿 Branch: ${env.GIT_BRANCH}"
                }
            }
        }
        
        stage('Detect Changes') {
            when {
                expression { params.DEPLOY_MODE == 'auto' }
            }
            steps {
                script {
                    def previousCommit = sh(
                        script: 'git rev-parse HEAD~1 2>/dev/null || echo "HEAD"',
                        returnStdout: true
                    ).trim()
                    
                    // Detectar cambios usando el script o git diff directo
                    def backendChanged = false
                    def storeFrontChanged = false
                    def webAdminChanged = false
                    def webLocalChanged = false
                    
                    try {
                        backendChanged = sh(
                            script: "./scripts/check-changes.sh backend ${previousCommit} HEAD 2>/dev/null || echo 'false'",
                            returnStdout: true
                        ).trim() == "true"
                    } catch (Exception e) {
                        // Fallback: usar git diff directo
                        backendChanged = sh(
                            script: "git diff --name-only ${previousCommit} HEAD | grep -q '^apps/backend/' || git diff --name-only ${previousCommit} HEAD | grep -q '^database/' || echo ''",
                            returnStdout: true
                        ).trim() != ""
                    }
                    
                    try {
                        storeFrontChanged = sh(
                            script: "./scripts/check-changes.sh store-front ${previousCommit} HEAD 2>/dev/null || echo 'false'",
                            returnStdout: true
                        ).trim() == "true"
                    } catch (Exception e) {
                        storeFrontChanged = sh(
                            script: "git diff --name-only ${previousCommit} HEAD | grep -q '^apps/store-front/' || echo ''",
                            returnStdout: true
                        ).trim() != ""
                    }
                    
                    try {
                        webAdminChanged = sh(
                            script: "./scripts/check-changes.sh web-admin ${previousCommit} HEAD 2>/dev/null || echo 'false'",
                            returnStdout: true
                        ).trim() == "true"
                    } catch (Exception e) {
                        webAdminChanged = sh(
                            script: "git diff --name-only ${previousCommit} HEAD | grep -q '^apps/web-admin/' || echo ''",
                            returnStdout: true
                        ).trim() != ""
                    }
                    
                    try {
                        webLocalChanged = sh(
                            script: "./scripts/check-changes.sh web-local ${previousCommit} HEAD 2>/dev/null || echo 'false'",
                            returnStdout: true
                        ).trim() == "true"
                    } catch (Exception e) {
                        webLocalChanged = sh(
                            script: "git diff --name-only ${previousCommit} HEAD | grep -q '^apps/web-local/' || echo ''",
                            returnStdout: true
                        ).trim() != ""
                    }
                    
                    env.BACKEND_CHANGED = "${backendChanged}"
                    env.STORE_FRONT_CHANGED = "${storeFrontChanged}"
                    env.WEB_ADMIN_CHANGED = "${webAdminChanged}"
                    env.WEB_LOCAL_CHANGED = "${webLocalChanged}"
                    
                    echo "📊 Cambios detectados:"
                    echo "  Backend: ${backendChanged}"
                    echo "  Store Front: ${storeFrontChanged}"
                    echo "  Web Admin: ${webAdminChanged}"
                    echo "  Web Local: ${webLocalChanged}"
                    
                    // Si no hay cambios y es modo auto, abortar
                    if (!backendChanged && !storeFrontChanged && !webAdminChanged && !webLocalChanged) {
                        if (params.APP_TO_DEPLOY == 'all') {
                            echo "⏭️  No hay cambios detectados en ninguna app. Saltando deploy."
                            currentBuild.result = 'SUCCESS'
                            return
                        } else {
                            // Verificar si la app seleccionada tiene cambios
                            def selectedChanged = false
                            switch(params.APP_TO_DEPLOY) {
                                case 'backend':
                                    selectedChanged = backendChanged
                                    break
                                case 'store-front':
                                    selectedChanged = storeFrontChanged
                                    break
                                case 'web-admin':
                                    selectedChanged = webAdminChanged
                                    break
                                case 'web-local':
                                    selectedChanged = webLocalChanged
                                    break
                            }
                            if (!selectedChanged) {
                                echo "⏭️  No hay cambios detectados en ${params.APP_TO_DEPLOY}. Saltando deploy."
                                currentBuild.result = 'SUCCESS'
                                return
                            }
                        }
                    }
                }
            }
        }
        
        stage('Deploy Backend') {
            when {
                anyOf {
                    expression { 
                        params.APP_TO_DEPLOY == 'backend' || 
                        params.APP_TO_DEPLOY == 'all' ||
                        (params.DEPLOY_MODE == 'auto' && env.BACKEND_CHANGED == 'true')
                    }
                }
            }
            steps {
                script {
                    deployApp('backend', '4015')
                }
            }
        }
        
        stage('Deploy Store Front') {
            when {
                anyOf {
                    expression { 
                        params.APP_TO_DEPLOY == 'store-front' || 
                        params.APP_TO_DEPLOY == 'all' ||
                        (params.DEPLOY_MODE == 'auto' && env.STORE_FRONT_CHANGED == 'true')
                    }
                }
            }
            steps {
                script {
                    deployApp('store-front', '4016')
                }
            }
        }
        
        stage('Deploy Web Admin') {
            when {
                anyOf {
                    expression { 
                        params.APP_TO_DEPLOY == 'web-admin' || 
                        params.APP_TO_DEPLOY == 'all' ||
                        (params.DEPLOY_MODE == 'auto' && env.WEB_ADMIN_CHANGED == 'true')
                    }
                }
            }
            steps {
                script {
                    deployApp('web-admin', '4017')
                }
            }
        }
        
        stage('Deploy Web Local') {
            when {
                anyOf {
                    expression { 
                        params.APP_TO_DEPLOY == 'web-local' || 
                        params.APP_TO_DEPLOY == 'all' ||
                        (params.DEPLOY_MODE == 'auto' && env.WEB_LOCAL_CHANGED == 'true')
                    }
                }
            }
            steps {
                script {
                    deployApp('web-local', '4018')
                }
            }
        }
    }
    
    post {
        always {
            echo "🏁 Pipeline completado"
        }
        success {
            echo "✅ Deploy exitoso"
        }
        failure {
            echo "❌ Deploy falló"
        }
    }
}

// Función para desplegar una aplicación
def deployApp(String appName, String port) {
    echo "🚀 Iniciando deploy de ${appName}..."
    
    def appPath = "apps/${appName}"
    def deployPath = "${env.DEPLOY_BASE}/${appName}"
    def envFile = "${env.ENV_BASE}/${appName}.env"
    def serviceName = "agora-${appName}.service"
    // No usar /tmp entre dos bloques sh: en agentes por contenedor /tmp no persiste. El workspace sí.
    def deployTarball = "${env.WORKSPACE}/${appName}-deploy.tar.gz"
    
    // Detectar si es una aplicación frontend (Next.js)
    def isFrontend = appName in ['store-front', 'web-admin', 'web-local']
    
    // Pasar esta información como variable de entorno para usar en scripts shell
    env.IS_FRONTEND = isFrontend ? 'true' : 'false'
    
    // Validar que existe package.json
    if (!fileExists("${appPath}/package.json")) {
        error("❌ No se encontró package.json en ${appPath}")
    }
    
    if (isFrontend) {
        // Para frontend: NO hacer build local, se hará en el servidor con el .env correcto
        echo "📦 Frontend detectado: el build se hará en el servidor con el .env correcto"
    } else {
        // Para backend: hacer build local como antes
        echo "📦 Instalando dependencias localmente..."
        dir(appPath) {
            sh """
                # Verificar Node version
                node --version || echo "⚠️  Node no encontrado, continuando..."
                npm --version || echo "⚠️  NPM no encontrado, continuando..."
                
                # Limpiar node_modules (pero mantener package-lock.json si existe)
                rm -rf node_modules
                
                # Instalar dependencias (incluyendo devDependencies para build)
                # Si existe package-lock.json, usar npm ci, sino npm install
                if [ -f package-lock.json ]; then
                    npm ci --production=false
                else
                    npm install
                fi
            """
        }
        
        echo "🏗️  Compilando aplicación..."
        dir(appPath) {
            sh """
                # Verificar que existe script de build
                if grep -q '"build"' package.json; then
                    npm run build
                else
                    echo "⚠️  No se encontró script 'build' en package.json, saltando build"
                fi
            """
        }
    }
    
    echo "📤 Preparando archivos para deploy..."
    sh """
        # Crear directorio temporal para preparar el deploy
        TEMP_DIR=\$(mktemp -d)
        trap "rm -rf \${TEMP_DIR}" EXIT
        
        # Copiar todo el contenido de la app
        cp -r ${appPath}/* \${TEMP_DIR}/ 2>/dev/null || true
        cp -r ${appPath}/.[!.]* \${TEMP_DIR}/ 2>/dev/null || true
        
        # Excluir node_modules del deploy (se instalarán en el servidor)
        rm -rf \${TEMP_DIR}/node_modules
        
        # Excluir archivos de desarrollo y temporales
        find \${TEMP_DIR} -name '.env*' -not -name '.env.example' -delete 2>/dev/null || true
        find \${TEMP_DIR} -name '*.log' -delete 2>/dev/null || true
        find \${TEMP_DIR} -name '.git' -type d -exec rm -rf {} + 2>/dev/null || true
        find \${TEMP_DIR} -name '.cache' -type d -exec rm -rf {} + 2>/dev/null || true
        
        # Para frontend: eliminar .next si existe (se generará en el servidor con el .env correcto)
        # Para backend: NO eliminar dist - es necesario para backend compilado
        if [ "${isFrontend}" = "true" ]; then
            rm -rf \${TEMP_DIR}/.next 2>/dev/null || true
            echo "ℹ️  .next eliminado (se generará en el servidor con el .env correcto)"
        fi
        
        # Crear archivo tar en el workspace (persiste entre pasos sh del mismo build)
        cd \${TEMP_DIR}
        tar czf "${deployTarball}" .
        
        echo "✅ Archivos preparados en ${deployTarball}"
        ls -la "${deployTarball}"
    """
    
    echo "📤 Copiando archivos al servidor..."
    
    // Determinar si usar SSH o ejecutar localmente
    def useSSH = env.SSH_HOST && env.SSH_HOST != '' && env.SSH_HOST != 'localhost'
    
    if (useSSH && env.SSH_CREDENTIAL_ID) {
        // Usar SSH si está configurado
        withCredentials([sshUserPrivateKey(
            credentialsId: env.SSH_CREDENTIAL_ID,
            keyFileVariable: 'SSH_KEY',
            usernameVariable: 'SSH_USERNAME'
        )]) {
            sh """
                # Configurar permisos de la clave SSH
                chmod 600 \${SSH_KEY}
                
                # Copiar archivo tar al servidor
                scp -i \${SSH_KEY} -o StrictHostKeyChecking=no "${deployTarball}" \${SSH_USERNAME}@${env.SSH_HOST}:/tmp/
                
                # Ejecutar deploy en el servidor
                # Pasar IS_FRONTEND como variable de entorno en el comando SSH
                ssh -i \${SSH_KEY} -o StrictHostKeyChecking=no \${SSH_USERNAME}@${env.SSH_HOST} IS_FRONTEND=${isFrontend} bash << 'ENDSSH'
                set -e
                
                echo "📦 Extrayendo archivos en ${deployPath}..."
                
                # Limpiar directorio destino (mantener node_modules y .env si existen)
                # Para frontend: también mantener .next si existe (se regenerará después)
                echo "🧹 Limpiando directorio destino..."
                cd ${deployPath}
                if [ "${IS_FRONTEND}" = "true" ]; then
                    # Para frontend: borrar todo excepto node_modules, .env y .next (se regenerará)
                    find . -mindepth 1 ! -name 'node_modules' ! -name '.env' ! -name '.next' -exec rm -rf {} + 2>/dev/null || true
                else
                    # Para backend: borrar todo excepto node_modules y .env
                    find . -mindepth 1 ! -name 'node_modules' ! -name '.env' -exec rm -rf {} + 2>/dev/null || true
                fi
                
                # Configurar umask para permisos correctos (027 = grupo rwx, otros sin acceso)
                umask 027
                
                # Extraer archivos nuevos
                echo "📂 Extrayendo archivos nuevos..."
                tar xzf /tmp/${appName}-deploy.tar.gz -C ${deployPath}
                rm -f /tmp/${appName}-deploy.tar.gz
                
                # Aplicar permisos correctos: directorios 2750 (setgid + grupo rwx), archivos 640
                echo "🔐 Aplicando permisos correctos..."
                chgrp -R jenkins ${deployPath}
                find ${deployPath} -type d -exec chmod 2750 {} +
                find ${deployPath} -type f -exec chmod 640 {} +
                # Asegurar que el directorio base tenga permisos de ejecución
                chmod 2750 ${deployPath}
                
                # Verificar package.json
                if [ ! -f ${deployPath}/package.json ]; then
                    echo "❌ Error: No se encontró package.json en ${deployPath}"
                    exit 1
                fi
                
                # Verificar que el .env existe
                if [ ! -f ${envFile} ]; then
                    echo "❌ Error: No se encontró ${envFile}"
                    exit 1
                fi
                
                # Copiar archivo de entorno al directorio de deploy como .env
                echo "📋 Copiando archivo de entorno..."
                cp ${envFile} ${deployPath}/.env
                chgrp jenkins ${deployPath}/.env
                chmod 640 ${deployPath}/.env
                echo "✅ Archivo .env copiado desde ${envFile}"
                
                # Para frontend: instalar dependencias (con devDependencies para build) y hacer build
                # Para backend: solo instalar dependencias de producción
                echo "📦 Instalando dependencias en servidor..."
                cd ${deployPath}
                
                if [ -f package-lock.json ]; then
                    if [ "${IS_FRONTEND}" = "true" ]; then
                        # Frontend: necesita devDependencies para build
                        npm ci --production=false || npm install --production=false
                    else
                        # Backend: solo producción
                        npm ci --production=true || npm install --production=true
                    fi
                else
                    if [ "${IS_FRONTEND}" = "true" ]; then
                        npm install --production=false
                    else
                        npm install --production=true
                    fi
                fi
                
                # Verificar que node_modules existe
                if [ ! -d ${deployPath}/node_modules ]; then
                    echo "❌ Error: node_modules no se creó correctamente"
                    exit 1
                fi
                
                # Para frontend: hacer build en el servidor con el .env correcto
                if [ "${IS_FRONTEND}" = "true" ]; then
                    echo "🏗️  Compilando aplicación frontend en servidor con .env correcto..."
                    if grep -q '"build"' package.json; then
                        # Cargar variables de entorno del .env antes del build
                        # Usar . en lugar de source para compatibilidad con sh
                        set -a
                        . ${deployPath}/.env
                        set +a
                        
                        # Asegurar que NODE_ENV esté en producción para el build
                        export NODE_ENV=production
                        
                        # Mostrar variables de entorno críticas (sin valores sensibles)
                        echo "🔍 Variables de entorno para build:"
                        echo "  NODE_ENV=\${NODE_ENV}"
                        echo "  NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL:-no definida}"
                        
                        # Ejecutar build y capturar salida
                        echo "🏗️  Ejecutando npm run build..."
                        npm run build 2>&1 | tee /tmp/build-output.log || {
                            echo "❌ Error durante el build"
                            echo "Últimas líneas del log:"
                            tail -50 /tmp/build-output.log
                            exit 1
                        }
                        
                        # Verificar que el build se completó correctamente
                        if [ ! -d ${deployPath}/.next ]; then
                            echo "❌ Error: El build no generó la carpeta .next"
                            exit 1
                        fi
                        
                        if [ ! -d ${deployPath}/.next/static ]; then
                            echo "❌ Error: El build no generó la carpeta .next/static"
                            exit 1
                        fi
                        
                        # Verificar BUILD_ID
                        if [ ! -f ${deployPath}/.next/BUILD_ID ]; then
                            echo "❌ Error: BUILD_ID no encontrado después del build"
                            exit 1
                        fi
                        
                        BUILD_ID=\$(cat ${deployPath}/.next/BUILD_ID)
                        echo "✅ BUILD_ID generado: \${BUILD_ID}"
                        
                        # Verificar que existen archivos estáticos críticos
                        if [ ! -d ${deployPath}/.next/static/\${BUILD_ID} ]; then
                            echo "❌ Error: No se encontró directorio de build estático .next/static/\${BUILD_ID}"
                            exit 1
                        fi
                        
                        # Listar algunos archivos generados para verificación
                        echo "📋 Archivos estáticos generados:"
                        ls -la ${deployPath}/.next/static/\${BUILD_ID}/ 2>/dev/null | head -10 || echo "⚠️  No se pudieron listar archivos"
                        
                        echo "✅ Build completado exitosamente en servidor"
                        
                        # Aplicar permisos correctos a los archivos generados por el build
                        # Los archivos estáticos deben ser legibles por el proceso de Next.js
                        echo "🔐 Aplicando permisos a archivos del build..."
                        chgrp -R jenkins ${deployPath}/.next
                        find ${deployPath}/.next -type d -exec chmod 2750 {} +
                        find ${deployPath}/.next -type f -exec chmod 640 {} +
                        # Asegurar que .next y .next/static sean accesibles
                        chmod 2750 ${deployPath}/.next
                        chmod 2750 ${deployPath}/.next/static 2>/dev/null || true
                        # Los estáticos deben ser legibles por el proceso que sirve la app (Node o nginx)
                        find ${deployPath}/.next/static -type d -exec chmod 755 {} + 2>/dev/null || true
                        find ${deployPath}/.next/static -type f -exec chmod 644 {} + 2>/dev/null || true
                        # Verificar permisos finales
                        echo "🔍 Verificando permisos finales:"
                        ls -ld ${deployPath}/.next
                        ls -ld ${deployPath}/.next/static 2>/dev/null || echo "⚠️  .next/static no accesible"
                        
                        # Verificar que los archivos críticos son legibles
                        echo "🔍 Verificando legibilidad de archivos críticos:"
                        if [ -f ${deployPath}/.next/BUILD_ID ]; then
                            cat ${deployPath}/.next/BUILD_ID && echo "" || echo "⚠️  No se pudo leer BUILD_ID"
                        fi
                        if [ -d ${deployPath}/.next/static/\${BUILD_ID} ]; then
                            echo "✅ Directorio de build estático existe y es accesible"
                            # Verificar que hay archivos dentro
                            FILE_COUNT=\$(find ${deployPath}/.next/static/\${BUILD_ID} -type f | wc -l)
                            echo "📊 Archivos estáticos encontrados: \${FILE_COUNT}"
                            if [ "\${FILE_COUNT}" -eq 0 ]; then
                                echo "⚠️  Advertencia: No se encontraron archivos estáticos en .next/static/\${BUILD_ID}"
                            fi
                        else
                            echo "❌ Error: Directorio de build estático no existe: .next/static/\${BUILD_ID}"
                        fi
                    else
                        echo "⚠️  No se encontró script 'build' en package.json"
                    fi
                fi
                
                echo "✅ Configuración completada en servidor"
            ENDSSH
            """
        }
    } else {
        // Ejecutar localmente (Jenkins está en el mismo servidor)
        echo "🖥️  Ejecutando deploy localmente (sin SSH)..."
        sh """
            set -e
            
            echo "📦 Extrayendo archivos en ${deployPath}..."
            
            # Limpiar directorio destino (mantener node_modules y .env si existen)
            # Para frontend: también mantener .next si existe (se regenerará después)
            echo "🧹 Limpiando directorio destino..."
            cd ${deployPath}
            if [ "${env.IS_FRONTEND}" = "true" ]; then
                # Para frontend: borrar todo excepto node_modules, .env y .next (se regenerará)
                find . -mindepth 1 ! -name 'node_modules' ! -name '.env' ! -name '.next' -exec rm -rf {} + 2>/dev/null || true
            else
                # Para backend: borrar todo excepto node_modules y .env
                find . -mindepth 1 ! -name 'node_modules' ! -name '.env' -exec rm -rf {} + 2>/dev/null || true
            fi
            
            # Configurar umask para permisos correctos (027 = grupo rwx, otros sin acceso)
            umask 027
            
            # Extraer archivos nuevos
            echo "📂 Extrayendo archivos nuevos..."
            tar xzf "${deployTarball}" -C ${deployPath}
            rm -f "${deployTarball}"
            
            # Aplicar permisos correctos: directorios 2750 (setgid + grupo rwx), archivos 640
            echo "🔐 Aplicando permisos correctos..."
            chgrp -R jenkins ${deployPath}
            find ${deployPath} -type d -exec chmod 2750 {} +
            find ${deployPath} -type f -exec chmod 640 {} +
            # Asegurar que el directorio base tenga permisos de ejecución
            chmod 2750 ${deployPath}
            
            # Verificar package.json
            if [ ! -f ${deployPath}/package.json ]; then
                echo "❌ Error: No se encontró package.json en ${deployPath}"
                exit 1
            fi
            
            # Verificar que el .env existe
            if [ ! -f ${envFile} ]; then
                echo "❌ Error: No se encontró ${envFile}"
                exit 1
            fi
            
            # Copiar archivo de entorno al directorio de deploy como .env
            echo "📋 Copiando archivo de entorno..."
            cp ${envFile} ${deployPath}/.env
            chgrp jenkins ${deployPath}/.env
            chmod 640 ${deployPath}/.env
            echo "✅ Archivo .env copiado desde ${envFile}"
            
            # Para frontend: instalar dependencias (con devDependencies para build) y hacer build
            # Para backend: solo instalar dependencias de producción
            echo "📦 Instalando dependencias..."
            cd ${deployPath}
            
            if [ -f package-lock.json ]; then
                if [ "${env.IS_FRONTEND}" = "true" ]; then
                    # Frontend: necesita devDependencies para build
                    npm ci --production=false || npm install --production=false
                else
                    # Backend: solo producción
                    npm ci --production=true || npm install --production=true
                fi
            else
                if [ "${env.IS_FRONTEND}" = "true" ]; then
                    npm install --production=false
                else
                    npm install --production=true
                fi
            fi
            
            # Verificar que node_modules existe
            if [ ! -d ${deployPath}/node_modules ]; then
                echo "❌ Error: node_modules no se creó correctamente"
                exit 1
            fi
            
            # Para frontend: hacer build en el servidor con el .env correcto
            if [ "${env.IS_FRONTEND}" = "true" ]; then
                echo "🏗️  Compilando aplicación frontend en servidor con .env correcto..."
                if grep -q '"build"' package.json; then
                    # Cargar variables de entorno del .env antes del build
                    # Usar . en lugar de source para compatibilidad con sh
                    set -a
                    . ${deployPath}/.env
                    set +a
                    
                    # Asegurar que NODE_ENV esté en producción para el build
                    export NODE_ENV=production
                    
                    # Mostrar variables de entorno críticas (sin valores sensibles)
                    echo "🔍 Variables de entorno para build:"
                    echo "  NODE_ENV=\${NODE_ENV}"
                    echo "  NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL:-no definida}"
                    
                    # Ejecutar build y capturar salida
                    echo "🏗️  Ejecutando npm run build..."
                    npm run build 2>&1 | tee /tmp/build-output.log || {
                        echo "❌ Error durante el build"
                        echo "Últimas líneas del log:"
                        tail -50 /tmp/build-output.log
                        exit 1
                    }
                    
                    # Verificar que el build se completó correctamente
                    if [ ! -d ${deployPath}/.next ]; then
                        echo "❌ Error: El build no generó la carpeta .next"
                        exit 1
                    fi
                    
                    if [ ! -d ${deployPath}/.next/static ]; then
                        echo "❌ Error: El build no generó la carpeta .next/static"
                        exit 1
                    fi
                    
                    # Verificar BUILD_ID
                    if [ ! -f ${deployPath}/.next/BUILD_ID ]; then
                        echo "❌ Error: BUILD_ID no encontrado después del build"
                        exit 1
                    fi
                    
                    BUILD_ID=\$(cat ${deployPath}/.next/BUILD_ID)
                    echo "✅ BUILD_ID generado: \${BUILD_ID}"
                    
                    # Verificar que existen archivos estáticos críticos
                    if [ ! -d ${deployPath}/.next/static/\${BUILD_ID} ]; then
                        echo "❌ Error: No se encontró directorio de build estático .next/static/\${BUILD_ID}"
                        exit 1
                    fi
                    
                    # Listar algunos archivos generados para verificación
                    echo "📋 Archivos estáticos generados:"
                    ls -la ${deployPath}/.next/static/\${BUILD_ID}/ 2>/dev/null | head -10 || echo "⚠️  No se pudieron listar archivos"
                    
                    echo "✅ Build completado exitosamente en servidor"
                    
                    # Aplicar permisos correctos a los archivos generados por el build
                    # Los archivos estáticos deben ser legibles por el proceso de Next.js
                    echo "🔐 Aplicando permisos a archivos del build..."
                    chgrp -R jenkins ${deployPath}/.next
                    find ${deployPath}/.next -type d -exec chmod 2750 {} +
                    find ${deployPath}/.next -type f -exec chmod 640 {} +
                    # Asegurar que .next y .next/static sean accesibles
                    chmod 2750 ${deployPath}/.next
                    chmod 2750 ${deployPath}/.next/static 2>/dev/null || true
                    # Los estáticos deben ser legibles por el proceso que sirve la app (Node o nginx)
                    find ${deployPath}/.next/static -type d -exec chmod 755 {} + 2>/dev/null || true
                    find ${deployPath}/.next/static -type f -exec chmod 644 {} + 2>/dev/null || true
                    # Verificar permisos finales
                    echo "🔍 Verificando permisos finales:"
                    ls -ld ${deployPath}/.next
                    ls -ld ${deployPath}/.next/static 2>/dev/null || echo "⚠️  .next/static no accesible"
                    
                    # Verificar que los archivos críticos son legibles
                    echo "🔍 Verificando legibilidad de archivos críticos:"
                    if [ -f ${deployPath}/.next/BUILD_ID ]; then
                        cat ${deployPath}/.next/BUILD_ID && echo "" || echo "⚠️  No se pudo leer BUILD_ID"
                    fi
                    if [ -d ${deployPath}/.next/static/\${BUILD_ID} ]; then
                        echo "✅ Directorio de build estático existe y es accesible"
                        # Verificar que hay archivos dentro
                        FILE_COUNT=\$(find ${deployPath}/.next/static/\${BUILD_ID} -type f | wc -l)
                        echo "📊 Archivos estáticos encontrados: \${FILE_COUNT}"
                        if [ "\${FILE_COUNT}" -eq 0 ]; then
                            echo "⚠️  Advertencia: No se encontraron archivos estáticos en .next/static/\${BUILD_ID}"
                        fi
                    else
                        echo "❌ Error: Directorio de build estático no existe: .next/static/\${BUILD_ID}"
                    fi
                else
                    echo "⚠️  No se encontró script 'build' en package.json"
                fi
            fi
            
            echo "✅ Configuración completada localmente"
        """
    }
    
    // Limpiar artefacto en workspace (por si el deploy no lo borró)
    sh "rm -f '${deployTarball}'"
    
    echo "✅ Deploy de ${appName} completado exitosamente"
    echo "ℹ️  Nota: Reinicia el servicio ${serviceName} manualmente cuando estés listo"
}
