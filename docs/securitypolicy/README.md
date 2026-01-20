# Cuestionario de Políticas de Seguridad

## Contexto
- Tamaño de la empresa: Pequeña.
- Infraestructura: Totalmente subcontratada.
- Políticas formales actuales: Documentadas en `docs/securitypolicy/policies.md`.

## Alcance
Este documento captura las respuestas al cuestionario "Modelo Integral de Madurez TI y
Ciberseguridad" y el análisis técnico de soporte.

## Respuestas del cuestionario
Formato: **Sí / No / N/A** con análisis técnico y evidencia.

1. **Estrategia de Seguridad de la Información**
   - **Respuesta:** Sí
   - **Análisis técnico:** Existe estrategia documentada con objetivos, gobierno,
     riesgos y métricas. Está alineada al modelo de operación subcontratado y se
     revisa anualmente para asegurar continuidad con objetivos del negocio.
   - **Evidencia:** `docs/securitypolicy/estrategia-seguridad.md`.

2. **Políticas de Seguridad Documentadas**
   - **Respuesta:** Sí
   - **Análisis técnico:** Existe política marco y documentos específicos con
     objetivos, alcance, controles mínimos y evidencias requeridas.
   - **Evidencia:** `docs/securitypolicy/policies.md` y documentos específicos.

3. **Roles y Responsabilidades de Seguridad**
   - **Respuesta:** Sí
   - **Análisis técnico:** Roles y RACI definidos para dirección, responsable
     de seguridad, tech lead y proveedores.
   - **Evidencia:** `docs/securitypolicy/roles-responsabilidades.md`.

4. **KPIs de Seguridad**
   - **Respuesta:** Sí
   - **Análisis técnico:** KPIs definidos (inventario, hallazgos, backups, MTTR).
     La medición histórica se generará conforme se implementen controles.
   - **Evidencia:** `docs/securitypolicy/estrategia-seguridad.md`.

5. **Evaluación de Madurez TI**
   - **Respuesta:** Sí
   - **Análisis técnico:** Se estableció evaluación anual usando este mismo
     cuestionario con plan de mejora.
   - **Evidencia:** `docs/securitypolicy/estrategia-seguridad.md`.

6. **Identificación de Riesgos**
   - **Respuesta:** Sí
   - **Análisis técnico:** Metodología definida con registro de riesgos,
     probabilidad e impacto.
   - **Evidencia:** `docs/securitypolicy/gestion-riesgos.md`.

7. **Plan de Remediación**
   - **Respuesta:** Sí
   - **Análisis técnico:** Plan de remediación asociado al registro de riesgos
     con responsables, fechas objetivo y seguimiento.
   - **Evidencia:** `docs/securitypolicy/gestion-riesgos.md` y `docs/securitypolicy/plantillas-registros.md`.

8. **Pentesting Interno**
   - **Respuesta:** No
   - **Análisis técnico:** Política definida para ejecución anual; aún no se
     contrata proveedor.
   - **Evidencia:** `docs/securitypolicy/gestion-vulnerabilidades.md`.

9. **Pentesting Externo**
   - **Respuesta:** No
   - **Análisis técnico:** Política definida; primera evaluación externa en
     planeación.
   - **Evidencia:** `docs/securitypolicy/gestion-vulnerabilidades.md`.

10. **Inventario de Activos Públicos**
   - **Respuesta:** No
   - **Análisis técnico:** Se definió el inventario y campos mínimos; el listado
     está en elaboración.
   - **Evidencia:** `docs/securitypolicy/inventario-activos-publicos.md` y `docs/securitypolicy/plantillas-registros.md`.

11. **Monitoreo de Superficie de Ataque**
   - **Respuesta:** No
   - **Análisis técnico:** Actividad mensual definida; requiere herramienta o
     proveedor externo.
   - **Evidencia:** `docs/securitypolicy/inventario-activos-publicos.md`.

12. **Detección de Configuraciones Inseguras**
   - **Respuesta:** No
   - **Análisis técnico:** Se definió revisión de configuraciones seguras basada
     en guías de hardening del proveedor; pendiente de implementación.
   - **Evidencia:** `docs/securitypolicy/gestion-vulnerabilidades.md`.

13. **Documentación de Hallazgos Externos**
   - **Respuesta:** Sí
   - **Análisis técnico:** Proceso definido para registrar hallazgos y seguimiento.
   - **Evidencia:** `docs/securitypolicy/gestion-vulnerabilidades.md`.

14. **Reducción del Riesgo Externo**
   - **Respuesta:** No
   - **Análisis técnico:** Métrica definida pero sin línea base ni medición.
   - **Evidencia:** `docs/securitypolicy/estrategia-seguridad.md`.

15. **Programa de Concientización en Seguridad**
   - **Respuesta:** No
   - **Análisis técnico:** Programa definido con temas mínimos y periodicidad;
     primera sesión pendiente.
   - **Evidencia:** `docs/securitypolicy/concientizacion-seguridad.md`.

16. **Simulaciones de Phishing**
   - **Respuesta:** No
   - **Análisis técnico:** Simulación anual definida; dependerá de presupuesto.
   - **Evidencia:** `docs/securitypolicy/concientizacion-seguridad.md`.

17. **Identificación y Clasificación de Datos Sensibles**
   - **Respuesta:** Sí
   - **Análisis técnico:** Clasificación definida y controles mínimos de manejo.
   - **Evidencia:** `docs/securitypolicy/clasificacion-datos.md`.

18. **Controles de Prevención de Fuga de Información**
   - **Respuesta:** Sí
   - **Análisis técnico:** Controles mínimos definidos (MFA, mínimo privilegio,
     restricciones de compartición).
   - **Evidencia:** `docs/securitypolicy/clasificacion-datos.md` y `docs/securitypolicy/control-accesos-identidad.md`.

19. **Monitoreo de Intentos de Exfiltración**
   - **Respuesta:** No
   - **Análisis técnico:** Se requiere habilitar logs y alertas de proveedores.
   - **Evidencia:** `docs/securitypolicy/monitoreo-logs.md`.

20. **Gestión de Incidentes de Fuga de Información**
   - **Respuesta:** Sí
   - **Análisis técnico:** Plan de respuesta y documentación formal definidos.
   - **Evidencia:** `docs/securitypolicy/plan-respuesta-incidentes.md` y `docs/securitypolicy/plantillas-registros.md`.

21. **Cobertura de Protección Avanzada en Endpoints**
   - **Respuesta:** No
   - **Análisis técnico:** Requisito establecido; falta evidencia de cobertura total.
   - **Evidencia:** `docs/securitypolicy/policies.md` (sección 19).

22. **Visibilidad Centralizada de Eventos de Seguridad**
   - **Respuesta:** No
   - **Análisis técnico:** Centralización definida como objetivo; depende de logs
     disponibles en proveedores.
   - **Evidencia:** `docs/securitypolicy/monitoreo-logs.md`.

23. **Alertas por Comportamientos Anómalos**
   - **Respuesta:** No
   - **Análisis técnico:** Se requiere configurar alertas en proveedores y
     repositorios; pendiente de implementación.
   - **Evidencia:** `docs/securitypolicy/monitoreo-logs.md`.

24. **Atención Oportuna de Incidentes Críticos**
   - **Respuesta:** Sí
   - **Análisis técnico:** Tiempos objetivo definidos por severidad.
   - **Evidencia:** `docs/securitypolicy/plan-respuesta-incidentes.md`.

25. **Documentación de Respuesta a Incidentes**
   - **Respuesta:** Sí
   - **Análisis técnico:** Se exige bitácora con evidencias y acciones.
   - **Evidencia:** `docs/securitypolicy/plan-respuesta-incidentes.md`.

26. **Medición de Reducción del Impacto de Incidentes**
   - **Respuesta:** No
   - **Análisis técnico:** Se definio la metrica, pero falta linea base.
   - **Evidencia:** `docs/securitypolicy/plan-respuesta-incidentes.md`.

27. **Inventario y Monitoreo Centralizado de Activos TI**
   - **Respuesta:** No
   - **Análisis técnico:** Inventario definido, pero no consolidado ni monitoreado.
   - **Evidencia:** `docs/securitypolicy/inventario-activos-ti.md` y `docs/securitypolicy/plantillas-registros.md`.

28. **Detección Proactiva de Fallas**
   - **Respuesta:** No
   - **Análisis técnico:** Se requieren alertas y monitoreo en proveedores.
   - **Evidencia:** `docs/securitypolicy/monitoreo-logs.md`.

29. **Gestión Remota de Parches y Actualizaciones**
   - **Respuesta:** No
   - **Análisis técnico:** Politica definida; ejecucion depende de proveedores.
   - **Evidencia:** `docs/securitypolicy/gestion-parches.md`.

30. **Evidencia de Mejoras Operativas por Monitoreo Remoto**
   - **Respuesta:** No
   - **Análisis técnico:** Se documentara cuando exista monitoreo activo.
   - **Evidencia:** `docs/securitypolicy/monitoreo-logs.md`.

31. **Política Formal de Respaldos Documentada**
   - **Respuesta:** Sí
   - **Análisis técnico:** Politica de respaldos y continuidad con RPO/RTO
     y evidencia requerida.
   - **Evidencia:** `docs/securitypolicy/politica-respaldos-continuidad.md` y `docs/securitypolicy/plantillas-registros.md`.

32. **Respaldos Automáticos y Almacenamiento en la Nube**
   - **Respuesta:** No
   - **Análisis técnico:** Requisito definido; falta confirmar configuracion en proveedor.
   - **Evidencia:** `docs/securitypolicy/politica-respaldos-continuidad.md`.

33. **Pruebas Periódicas de Restauración de Respaldos**
   - **Respuesta:** No
   - **Análisis técnico:** Politica definida; primera prueba pendiente.
   - **Evidencia:** `docs/securitypolicy/politica-respaldos-continuidad.md`.

34. **Medición de Mejora en la Capacidad de Recuperación**
   - **Respuesta:** No
   - **Análisis técnico:** Metricas definidas; falta linea base.
   - **Evidencia:** `docs/securitypolicy/politica-respaldos-continuidad.md`.

## Brechas y acciones
- Completar inventarios (activos TI y activos publicos).
- Definir proveedor/herramienta para monitoreo y alertas.
- Ejecutar primera ronda de pruebas (pentesting y restauracion).
- Implementar programa basico de concientizacion.

## Registro de cambios
- 2026-01-20: Creado cuestionario inicial.
- 2026-01-20: Documentadas politicas y respuestas.
