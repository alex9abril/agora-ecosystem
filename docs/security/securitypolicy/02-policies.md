# Marco de Políticas de Seguridad (Agora)

## 1) Estrategia de Seguridad de la Información
- **Objetivo:** Proteger los activos de información y datos de clientes, habilitando los objetivos del negocio.
- **Alineación:** La estrategia se revisa al menos una vez al año contra objetivos del negocio.
- **Responsable:** Dirección General con un Responsable de Seguridad delegado (tiempo parcial).
- **Evidencia:** Este documento y notas de revisión anual.

## 2) Políticas de Seguridad (Base)
- **Objetivo:** Definir requisitos mínimos de seguridad para personas, procesos y tecnología.
- **Alcance:** Todo el personal, contratistas, proveedores y sistemas usados por Agora.
- **Aprobación:** Dirección General.
- **Periodicidad de revisión:** Anual o tras cambios mayores.

## 3) Roles y Responsabilidades
- **Responsable de Seguridad (tiempo parcial):** Dueño de la política, gestión de riesgos, coordinación de incidentes.
- **Tech Lead:** Requisitos de seguridad en desarrollo y supervisión de proveedores.
- **Todo el personal/contratistas:** Cumplir políticas y reportar incidentes.
- **Proveedores:** Cumplir controles de seguridad acordados.

## 4) KPIs de Seguridad
- **Ejemplos:** % de cumplimiento de parches, tasa de respaldo exitoso, MTTR de incidentes, cobertura de MFA.
- **Periodicidad:** Revisión trimestral.
- **Responsable:** Responsable de Seguridad.

## 5) Evaluación de Madurez
- **Objetivo:** Autoevaluación anual contra este cuestionario.
- **Resultado:** Brechas y plan de mejora.

## 6) Identificación y Priorización de Riesgos
- **Método:** Registro de riesgos con probabilidad e impacto.
- **Periodicidad:** Trimestral o tras cambios mayores.
- **Responsable:** Responsable de Seguridad con Tech Lead.

## 7) Plan de Remediación
- **Objetivo:** Dar seguimiento a acciones, responsables y fechas objetivo.
- **Periodicidad:** Seguimiento mensual hasta cierre.

## 8) Gestión de Vulnerabilidades y Pentesting
- **Pruebas internas:** Al menos anual o en releases mayores (con proveedor o servicio externo).
- **Pruebas externas:** Al menos anual para activos públicos.
- **Seguimiento:** Hallazgos documentados y remediados.

## 9) Inventario de Activos Públicos y Superficie de Ataque
- **Inventario:** Dominios, subdominios, IP públicas y servicios expuestos.
- **Monitoreo:** Revisión mensual o con herramienta de proveedor.

## 10) Gestión de Configuración Segura
- **Objetivo:** Detectar y corregir configuraciones inseguras en activos públicos.
- **Método:** Guías de hardening del proveedor y revisiones periódicas.

## 11) Documentación de Hallazgos Externos
- **Objetivo:** Registrar hallazgos de exposición externa y su remediación.
- **Responsable:** Responsable de Seguridad.

## 12) Métricas de Reducción de Riesgo Externo
- **Métrica:** Conteo y severidad de servicios expuestos en el tiempo.
- **Periodicidad:** Trimestral.

## 13) Programa de Concientización en Seguridad
- **Objetivo:** Capacitación anual mínima para personal/contratistas.
- **Temas:** Phishing, higiene de credenciales, manejo de datos.

## 14) Simulaciones de Phishing
- **Enfoque:** Simulación anual cuando sea viable; alternativa de capacitación si hay limitaciones de presupuesto.

## 15) Clasificación de Datos
- **Categorías:** Público, Interno, Confidencial (incluye datos de clientes y pagos).
- **Manejo:** Acceso restringido por rol; almacenamiento solo en proveedores aprobados.

## 16) Prevención de Fuga de Información (DLP)
- **Controles:** MFA, mínimo privilegio, compartición restringida, registro de accesos.
- **Proveedores:** Preferir proveedores con DLP integrado.

## 17) Monitoreo de Exfiltración
- **Objetivo:** Monitorear transferencias anómalas con logs del proveedor cuando existan.
- **Alcance:** Proveedores cloud, repositorios de código, almacenamiento.

## 18) Gestión de Incidentes de Fuga de Información
- **Proceso:** Registrar, clasificar, contener, notificar y revisar post-incidente.
- **Responsable:** Responsable de Seguridad con Dirección General.

## 19) Protección de Endpoints
- **Requisito:** Antivirus/EDR o equivalente en todos los endpoints gestionados.
- **Responsabilidad:** Cada miembro del equipo y dispositivos administrados por proveedor.

## 20) Visibilidad Centralizada de Seguridad
- **Objetivo:** Centralizar logs críticos de seguridad cuando sea posible (logs de proveedor cloud).
- **Responsable:** Tech Lead.

## 21) Alertas por Comportamientos Anómalos
- **Enfoque:** Uso de alertas del proveedor y notificaciones mínimas automatizadas.

## 22) Oportunidad de Respuesta a Incidentes
- **Objetivo:** Definir tiempos de respuesta por severidad (ej. críticos <24h).
- **Seguimiento:** Bitácora de incidentes.

## 23) Documentación de Respuesta a Incidentes
- **Requisito:** Documentar acciones, decisiones y resultados.

## 24) Medición de Reducción de Impacto
- **Métrica:** Tiempo de detección/contención e impacto del negocio comparado en el tiempo.

## 25) Inventario de Activos y Monitoreo Centralizado
- **Inventario:** Sistemas, herramientas SaaS y dispositivos críticos.
- **Monitoreo:** Disponibilidad básica cuando sea viable.

## 26) Detección Proactiva de Fallas
- **Enfoque:** Alertas del proveedor cloud y monitoreo de disponibilidad.

## 27) Gestión de Parches y Actualizaciones
- **Enfoque:** Gestionado por proveedores y actualizaciones automáticas del SO; seguimiento trimestral.

## 28) Evidencia de Mejoras Operativas
- **Método:** Registrar cambios que redujeron caídas o incidentes.

## 29) Política de Respaldos
- **Alcance:** Bases de datos, configuración y datos críticos del negocio.
- **Almacenamiento:** Nube cifrada con control de acceso.

## 30) Respaldos Automáticos
- **Requisito:** Respaldos automáticos con proveedores cuando exista soporte.

## 31) Pruebas de Restauración
- **Periodicidad:** Al menos anual o tras cambios mayores.

## 32) Medición de Mejora en Recuperación
- **Métrica:** Objetivos RPO/RTO y resultados reales de restauración.
