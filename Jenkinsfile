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
        
        # Excluir archivos de desarrollo y temporales (pero NO dist ni .next, que son necesarios)
        find \${TEMP_DIR} -name '.env*' -not -name '.env.example' -delete 2>/dev/null || true
        find \${TEMP_DIR} -name '*.log' -delete 2>/dev/null || true
        find \${TEMP_DIR} -name '.git' -type d -exec rm -rf {} + 2>/dev/null || true
        find \${TEMP_DIR} -name '.cache' -type d -exec rm -rf {} + 2>/dev/null || true
        # NO eliminar dist - es necesario para backend compilado
        # NO eliminar .next - es necesario para Next.js (contiene BUILD_ID)
        
        # Crear archivo tar para transferencia más eficiente
        cd \${TEMP_DIR}
        tar czf /tmp/${appName}-deploy.tar.gz .
        
        echo "✅ Archivos preparados en /tmp/${appName}-deploy.tar.gz"
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
                scp -i \${SSH_KEY} -o StrictHostKeyChecking=no /tmp/${appName}-deploy.tar.gz \${SSH_USERNAME}@${env.SSH_HOST}:/tmp/
                
                # Ejecutar deploy en el servidor
                # Pasar IS_FRONTEND como variable de entorno en el comando SSH
                ssh -i \${SSH_KEY} -o StrictHostKeyChecking=no \${SSH_USERNAME}@${env.SSH_HOST} IS_FRONTEND=${isFrontend} bash << 'ENDSSH'
                set -e
                
                echo "📦 Extrayendo archivos en ${deployPath}..."
                
                # Limpiar directorio destino (mantener node_modules y .env si existen)
                echo "🧹 Limpiando directorio destino..."
                cd ${deployPath}
                find . -mindepth 1 ! -name 'node_modules' ! -name '.env' -exec rm -rf {} + 2>/dev/null || true
                
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
                        npm run build
                        echo "✅ Build completado en servidor"
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
            echo "🧹 Limpiando directorio destino..."
            cd ${deployPath}
            find . -mindepth 1 ! -name 'node_modules' ! -name '.env' -exec rm -rf {} + 2>/dev/null || true
            
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
                    npm run build
                    echo "✅ Build completado en servidor"
                else
                    echo "⚠️  No se encontró script 'build' en package.json"
                fi
            fi
            
            echo "✅ Configuración completada localmente"
        """
    }
    
    // Limpiar archivo temporal local
    sh "rm -f /tmp/${appName}-deploy.tar.gz"
    
    echo "✅ Deploy de ${appName} completado exitosamente"
    echo "ℹ️  Nota: Reinicia el servicio ${serviceName} manualmente cuando estés listo"
}
