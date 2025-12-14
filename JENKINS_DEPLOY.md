# Guía de Deploy con Jenkins - Producción

Este documento explica cómo configurar y usar el pipeline de Jenkins para desplegar las aplicaciones en el servidor de producción.

## Requisitos Previos

1. **Jenkins configurado** con acceso SSH al servidor de producción
2. **Credenciales SSH** configuradas en Jenkins (ID: `tu-ssh-credential-id`)
3. **Node.js 20.x** y **npm 10.x** instalados en el servidor
4. **Servicios systemd** configurados y funcionando
5. **Permisos sudo** para el usuario Jenkins en el servidor

## Estructura del Servidor

```
/var/www/agora/prod/
├── backend/          # Puerto 4015
├── store-front/      # Puerto 4016
├── web-admin/        # Puerto 4017
└── web-local/        # Puerto 4018

/etc/agora/
├── backend.env       # Variables de entorno (root:jenkins, 640)
├── store-front.env
├── web-admin.env
└── web-local.env
```

## Configuración de Jenkins

### 1. Crear Pipeline Job

1. En Jenkins, crear un nuevo **Pipeline** job
2. Nombre sugerido: `agora-ecosystem-deploy`
3. Configurar el repositorio Git

### 2. Configurar Credenciales SSH

1. Ir a **Manage Jenkins > Credentials**
2. Agregar credencial SSH con:
   - **Kind**: SSH Username with private key
   - **ID**: `tu-ssh-credential-id` (o cambiar en Jenkinsfile)
   - **Username**: `jenkins`
   - **Private Key**: Agregar la clave privada SSH

### 3. Configurar Variables de Entorno en Jenkins

El pipeline usa variables de entorno para la configuración SSH. Configúralas en:

**Opción 1: Variables globales (recomendado)**
1. Ir a **Manage Jenkins > System Configuration > Global properties**
2. Marcar **Environment variables**
3. Agregar:
   - `SSH_HOST`: Host del servidor de producción (ej: `192.168.1.100` o `servidor-prod.com`)
   - `SSH_USER`: Usuario SSH (default: `jenkins`)
   - `SSH_CREDENTIAL_ID`: ID de la credencial SSH en Jenkins (ej: `ssh-prod-agora`)

**Opción 2: Variables del Job**
1. En la configuración del job, ir a **Build Environment**
2. Marcar **Use secret text(s) or file(s)**
3. Agregar las variables necesarias

### 4. Parámetros del Pipeline

El pipeline tiene los siguientes parámetros (configurables al ejecutar):

- **APP_TO_DEPLOY**: 
  - `all`: Desplegar todas las apps
  - `backend`, `store-front`, `web-admin`, `web-local`: Desplegar solo una app
  
- **DEPLOY_MODE**:
  - `auto`: Solo desplegar si hay cambios detectados
  - `force`: Siempre desplegar (ignora detección de cambios)

## Proceso de Deploy

### Para cada aplicación, el pipeline:

1. **Valida** que existe `package.json`
2. **Instala dependencias** localmente (incluyendo devDependencies para build)
3. **Compila** la aplicación (`npm run build`)
4. **Prepara archivos** excluyendo node_modules y archivos temporales
5. **Transfiere** archivos al servidor vía SSH/SCP
6. **Extrae archivos** en el directorio destino
7. **Instala dependencias de producción** en el servidor
8. **Ajusta permisos** (jenkins:jenkins)
9. **Reinicia el servicio systemd** correspondiente
10. **Verifica** que el servicio está activo y el puerto escuchando

## Ejecución Manual

### Desplegar todas las apps:
```
APP_TO_DEPLOY: all
DEPLOY_MODE: force
```

### Desplegar solo backend:
```
APP_TO_DEPLOY: backend
DEPLOY_MODE: auto
```

### Desplegar solo si hay cambios:
```
APP_TO_DEPLOY: all
DEPLOY_MODE: auto
```

## Configuración de Servicios Systemd

Ejemplo de servicio (`/etc/systemd/system/agora-backend.service`):

```ini
[Unit]
Description=Agora Backend Service
After=network.target

[Service]
Type=simple
User=jenkins
Group=jenkins
WorkingDirectory=/var/www/agora/prod/backend
EnvironmentFile=/etc/agora/backend.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Repetir para cada app cambiando:
- `Description`
- `WorkingDirectory`
- `EnvironmentFile`
- Nombre del archivo: `agora-<app>.service`

## Permisos Requeridos en el Servidor

El usuario `jenkins` necesita:

1. **Permisos de escritura** en `/var/www/agora/prod/*`
2. **Permisos de lectura** en `/etc/agora/*.env` (640, owner: root, group: jenkins)
3. **Permisos sudo** para `systemctl restart agora-*.service`

Configurar sudoers (`/etc/sudoers.d/jenkins`):
```
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl restart agora-backend.service
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl restart agora-store-front.service
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl restart agora-web-admin.service
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl restart agora-web-local.service
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl status agora-*.service
jenkins ALL=(ALL) NOPASSWD: /bin/journalctl -u agora-*.service
jenkins ALL=(ALL) NOPASSWD: /bin/netstat -tlnp
jenkins ALL=(ALL) NOPASSWD: /bin/ss -tlnp
```

## Troubleshooting

### Error: "No se encontró package.json"
- Verificar que la app existe en `apps/<app-name>/`
- Verificar que el checkout del repositorio fue exitoso

### Error: "El servicio no está activo"
- Revisar logs: `sudo journalctl -u agora-<app>.service -n 50`
- Verificar que el .env existe y tiene las variables correctas
- Verificar que el puerto no está en uso por otro proceso

### Error: "Permission denied"
- Verificar permisos en `/var/www/agora/prod/*`
- Verificar que el usuario jenkins tiene acceso al .env
- Verificar permisos sudo configurados

### Error: "Puerto no está escuchando"
- Verificar que el servicio inició correctamente
- Verificar que el puerto en el .env es correcto
- Verificar que no hay firewall bloqueando el puerto

## Mejoras Futuras

- [ ] Agregar rollback automático si el servicio no inicia
- [ ] Agregar health checks después del deploy
- [ ] Agregar notificaciones (Slack, Email)
- [ ] Agregar métricas de tiempo de deploy
- [ ] Agregar tests antes del deploy

