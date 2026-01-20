# Plan de Respuesta a Incidentes de Seguridad

## 1. Objetivo
Establecer un proceso formal para detectar, contener, erradicar y recuperar
ante incidentes de seguridad, minimizando el impacto al negocio.

## 2. Alcance
Aplica a incidentes que involucren confidencialidad, integridad o disponibilidad
de sistemas, datos o servicios de Agora.

## 3. Tipos de incidentes cubiertos
- Acceso no autorizado a cuentas o datos.
- Exfiltracion o filtracion de datos sensibles.
- Compromiso de credenciales o llaves API.
- Caidas de servicio o degradacion severa por causa de seguridad.
- Malware o comportamiento anomalo en endpoints.

## 3. Clasificacion de severidad
- **Critico:** interrupcion total del servicio, fuga de datos sensibles.
- **Alto:** degradacion significativa o acceso no autorizado confirmado.
- **Medio:** impacto limitado o sospecha sin evidencia concluyente.
- **Bajo:** eventos menores sin impacto al negocio.

## 4. Roles clave
- Responsable de Seguridad: coordina y documenta.
- Tech Lead: contencion tecnica y comunicacion con proveedores.
- Direccion General: decisiones criticas y comunicaciones externas.

## 5. Flujo de respuesta
1. **Deteccion y reporte**
2. **Clasificacion y triage**
3. **Contencion**
4. **Erradicacion**
5. **Recuperacion**
6. **Lecciones aprendidas**

## 6. Fuentes de deteccion
- Alertas de proveedores (cloud, base de datos, repositorios).
- Reportes internos del equipo.
- Reportes de clientes o terceros.

## 6. Tiempos objetivo
- Critico: respuesta inicial <24 horas.
- Alto: respuesta inicial <48 horas.
- Medio/Bajo: respuesta inicial <5 dias habiles.

## 7. Contencion y erradicacion (minimo)
- Cambiar credenciales y revocar accesos comprometidos.
- Aislar servicios afectados si existe riesgo de propagacion.
- Coordinar con proveedores para acciones urgentes.

## 8. Evidencias y documentacion
Registrar: fecha, sistemas afectados, acciones realizadas, evidencias,
responsables, impacto y estado final. Usar la plantilla de bitacora:
`docs/securitypolicy/plantillas-registros.md`.

## 9. Comunicacion
- Notificar internamente a Direccion General.
- Notificar a proveedores cuando sean parte del incidente.
- Evaluar comunicacion externa si existe impacto en datos de clientes.

## 10. Pruebas
Ejercicios de mesa al menos una vez al ano.
