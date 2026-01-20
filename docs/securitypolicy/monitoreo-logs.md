# Monitoreo y Logs de Seguridad

## 1. Objetivo
Tener visibilidad basica de eventos de seguridad y disponibilidad.

## 2. Alcance
Logs de proveedores cloud, repositorios de codigo, autenticacion y servicios
criticos utilizados por Agora.

## 3. Fuentes de logs
- Proveedor de hosting/app (si aplica)
- Bases de datos administradas
- Repositorios de codigo
- Herramientas de autenticacion
- Herramientas de almacenamiento y correo (si aplican)

## 4. Retencion
Se utiliza la retencion disponible del proveedor. Minimo objetivo: 30 dias.

## 5. Eventos minimos a registrar
- Inicios de sesion exitosos y fallidos.
- Cambios de configuracion en servicios criticos.
- Acceso a datos sensibles (cuando el proveedor lo permita).

## 6. Alertas
Se habilitan alertas por:
- accesos anómalos
- cambios en configuraciones criticas
- errores recurrentes en servicios

## 7. Revision
Revision mensual de alertas y eventos relevantes.

## 8. Evidencia
Capturas o reportes de alertas y configuraciones habilitadas.
