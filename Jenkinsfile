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
        string(
            name: 'SSH_HOST',
            defaultValue: 'tu-servidor-prod.com',
            description: 'Host del servidor de producción'
        )
        string(
            name: 'SSH_USER',
            defaultValue: 'jenkins',
            description: 'Usuario SSH para conexión'
        )
    }
    
    environment {
        // Rutas en el servidor
        DEPLOY_BASE = '/var/www/agora/prod'
        ENV_BASE = '/etc/agora'
        
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
    
    // Validar que existe package.json
    if (!fileExists("${appPath}/package.json")) {
        error("❌ No se encontró package.json en ${appPath}")
    }
    
    echo "📦 Instalando dependencias localmente..."
    dir(appPath) {
        sh """
            # Verificar Node version
            node --version || echo "⚠️  Node no encontrado, continuando..."
            npm --version || echo "⚠️  NPM no encontrado, continuando..."
            
            # Limpiar node_modules y package-lock si existe
            rm -rf node_modules package-lock.json
            
            # Instalar dependencias (incluyendo devDependencies para build)
            npm ci --production=false || npm install
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
        find \${TEMP_DIR} -name '.next' -type d -exec rm -rf {} + 2>/dev/null || true
        find \${TEMP_DIR} -name 'dist' -type d -exec rm -rf {} + 2>/dev/null || true
        find \${TEMP_DIR} -name '.cache' -type d -exec rm -rf {} + 2>/dev/null || true
        
        # Crear archivo tar para transferencia más eficiente
        cd \${TEMP_DIR}
        tar czf /tmp/${appName}-deploy.tar.gz .
        
        echo "✅ Archivos preparados en /tmp/${appName}-deploy.tar.gz"
    """
    
    echo "📤 Copiando archivos al servidor..."
    // Nota: Ajusta 'tu-ssh-credential-id' con el ID de tu credencial SSH en Jenkins
    sshagent(credentials: ['tu-ssh-credential-id']) {
        sh """
            # Copiar archivo tar al servidor
            scp -o StrictHostKeyChecking=no /tmp/${appName}-deploy.tar.gz ${params.SSH_USER}@${params.SSH_HOST}:/tmp/
            
            # Ejecutar deploy en el servidor
            ssh -o StrictHostKeyChecking=no ${params.SSH_USER}@${params.SSH_HOST} << 'ENDSSH'
                set -e
                
                echo "📦 Extrayendo archivos en ${deployPath}..."
                
                # Crear directorio si no existe
                sudo mkdir -p ${deployPath}
                
                # Backup del directorio actual (opcional, comentar si no se necesita)
                if [ -d ${deployPath} ] && [ "\$(ls -A ${deployPath})" ]; then
                    BACKUP_DIR="/tmp/agora-backup-${appName}-\$(date +%Y%m%d-%H%M%S)"
                    echo "💾 Creando backup en \${BACKUP_DIR}..."
                    sudo cp -r ${deployPath} \${BACKUP_DIR} || true
                fi
                
                # Limpiar directorio destino (mantener node_modules si existe para instalación más rápida)
                echo "🧹 Limpiando directorio destino..."
                cd ${deployPath}
                sudo find . -mindepth 1 ! -name 'node_modules' -exec rm -rf {} + 2>/dev/null || true
                
                # Extraer archivos nuevos
                echo "📂 Extrayendo archivos nuevos..."
                sudo tar xzf /tmp/${appName}-deploy.tar.gz -C ${deployPath}
                sudo rm -f /tmp/${appName}-deploy.tar.gz
                
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
                
                # Instalar dependencias de producción en el servidor
                echo "📦 Instalando dependencias en servidor..."
                cd ${deployPath}
                sudo -u jenkins npm ci --production=true || sudo -u jenkins npm install --production=true
                
                # Verificar que node_modules existe
                if [ ! -d ${deployPath}/node_modules ]; then
                    echo "❌ Error: node_modules no se creó correctamente"
                    exit 1
                fi
                
                # Asegurar permisos correctos
                echo "🔐 Ajustando permisos..."
                sudo chown -R jenkins:jenkins ${deployPath}
                sudo chmod -R 755 ${deployPath}
                sudo chmod 644 ${deployPath}/package.json ${deployPath}/package-lock.json 2>/dev/null || true
                
                echo "✅ Configuración completada en servidor"
            ENDSSH
        """
    }
    
    echo "🔄 Reiniciando servicio systemd..."
    sshagent(credentials: ['tu-ssh-credential-id']) {
        sh """
            ssh -o StrictHostKeyChecking=no ${params.SSH_USER}@${params.SSH_HOST} << 'ENDSSH'
                set -e
                
                # Verificar que el servicio existe
                if ! sudo systemctl list-unit-files | grep -q "${serviceName}"; then
                    echo "❌ Error: El servicio ${serviceName} no existe"
                    exit 1
                fi
                
                # Verificar estado actual del servicio
                echo "📊 Estado actual del servicio:"
                sudo systemctl status ${serviceName} --no-pager -l || true
                
                # Reiniciar el servicio
                echo "🔄 Reiniciando ${serviceName}..."
                sudo systemctl restart ${serviceName}
                
                # Esperar un momento para que el servicio inicie
                sleep 3
                
                # Verificar que el servicio está activo
                if sudo systemctl is-active --quiet ${serviceName}; then
                    echo "✅ Servicio ${serviceName} está activo"
                else
                    echo "❌ Error: El servicio ${serviceName} no está activo después del reinicio"
                    echo "📋 Estado del servicio:"
                    sudo systemctl status ${serviceName} --no-pager -l || true
                    echo "📋 Últimas líneas del log:"
                    sudo journalctl -u ${serviceName} -n 50 --no-pager || true
                    exit 1
                fi
                
                # Mostrar logs recientes
                echo "📋 Últimas líneas del log (últimos 20):"
                sudo journalctl -u ${serviceName} -n 20 --no-pager || true
                
                # Verificar que el puerto está escuchando
                echo "🔍 Verificando puerto ${port}..."
                if sudo netstat -tlnp | grep -q ":${port} " || sudo ss -tlnp | grep -q ":${port} "; then
                    echo "✅ Puerto ${port} está escuchando"
                else
                    echo "⚠️  Advertencia: Puerto ${port} no parece estar escuchando"
                fi
            ENDSSH
        """
    }
    
    // Limpiar archivo temporal local
    sh "rm -f /tmp/${appName}-deploy.tar.gz"
    
    echo "✅ Deploy de ${appName} completado exitosamente"
}
