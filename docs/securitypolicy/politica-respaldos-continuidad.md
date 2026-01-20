# Politica de Respaldos y Continuidad

## 1. Objetivo
Garantizar la recuperacion de datos y continuidad del servicio ante fallas,
errores humanos o incidentes de seguridad.

## 2. Alcance
Bases de datos, configuraciones, repositorios de codigo, documentos criticos y
servicios subcontratados con informacion sensible.

## 3. Definiciones
- **Respaldo:** Copia de datos para restauracion.
- **RPO:** Maximo de datos que se pueden perder.
- **RTO:** Tiempo maximo para recuperar un servicio.

## 3. Responsables
- Tech Lead: define alcance tecnico.
- Proveedores: ejecutan respaldos segun contrato.
- Responsable de Seguridad: verifica cumplimiento.

## 4. Politica de respaldos
- Respaldo automatico cuando el proveedor lo soporte.
- Frecuencia minima: diaria para bases de datos criticas.
- Retencion minima: 30 dias (o segun limites del proveedor).
- Cifrado en reposo y en transito.
- Accesos restringidos por rol.
- Copias separadas de produccion cuando sea viable.

## 5. Objetivos de recuperacion
- **RPO:** 24 horas (objetivo inicial).
- **RTO:** 48 horas (objetivo inicial).

## 6. Procedimiento de restauracion (minimo)
1. Solicitar restauracion al proveedor o ejecutar procedimiento interno.
2. Validar integridad de datos y servicios.
3. Documentar tiempos reales y resultados.

## 7. Pruebas de restauracion
- Periodicidad: anual o posterior a cambios mayores.
- Resultado documentado con fecha y responsable.

## 8. Evidencia requerida
- Reportes de ejecucion de backups del proveedor.
- Registro de pruebas de restauracion.
- Bitacora de incidentes relacionados.
