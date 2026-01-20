# Control de Accesos e Identidad

## 1. Objetivo
Garantizar que el acceso a sistemas y datos sea autorizado, limitado y rastreable.

## 2. Alcance
Cuentas de correo, repositorios de codigo, servicios cloud, bases de datos,
paneles de administracion y herramientas SaaS.

## 3. Requisitos minimos
- **MFA obligatorio** para cuentas con acceso a datos confidenciales.
- Accesos por rol y necesidad de saber.
- Revocacion inmediata de accesos al terminar una relacion laboral o de servicio.
- Uso de credenciales unicas (no compartidas).

## 4. Gestion de altas, cambios y bajas
- **Alta:** aprobacion del Tech Lead y asignacion de rol minimo.
- **Cambio:** revisado y documentado en el registro de accesos.
- **Baja:** revocacion en 24 horas y verificacion por Responsable de Seguridad.

## 5. Contraseñas y llaves
- Longitud minima 12 caracteres o politica equivalente del proveedor.
- Rotacion cuando exista incidente o sospecha de compromiso.
- Llaves API almacenadas en gestores seguros y rotadas segun necesidad.

## 6. Evidencia requerida
- Lista de cuentas con MFA habilitado.
- Registro de altas/bajas de accesos.
- Configuracion de roles en proveedores clave.
