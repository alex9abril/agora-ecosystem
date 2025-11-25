# Análisis de Preguntas Estratégicas - LOCALIA MVP

> **Propósito:** Este documento explica el contexto, importancia y casos prácticos de cada pregunta estratégica que debe resolver el Product Owner. Incluye referencias a cómo otras aplicaciones similares resuelven estos problemas.

---

## Políticas de Cancelación y Penalizaciones

### 1. ¿Hay penalización si un local cancela un pedido ya confirmado? ¿Cuál es el monto/porcentaje?

**¿Por qué es importante?**
- Protege al cliente de cancelaciones injustificadas
- Incentiva a los locales a cumplir con los pedidos aceptados
- Genera confianza en la plataforma

**Caso práctico:**
Un local acepta un pedido de $500 MXN, pero luego se da cuenta que no tiene todos los ingredientes. Si cancela sin penalización, el cliente queda sin su pedido y sin compensación. Si hay penalización (ej: 10% = $50 MXN), el local piensa dos veces antes de cancelar.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Legal** valida términos y condiciones
- **Equipo Financiero** define el monto/porcentaje

**¿Qué pasa si no lo controlamos?**
- Locales cancelan pedidos sin consecuencias
- Clientes pierden confianza en la plataforma
- Aumenta la tasa de cancelaciones
- Pérdida de ingresos para la plataforma

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Penaliza a restaurantes con descuentos en comisiones futuras o suspensión temporal
- **Rappi:** Cobra multa al restaurante que cancela después de aceptar
- **DoorDash:** Sistema de penalizaciones que afecta el ranking del restaurante

---

### 2. ¿Hay penalización si un repartidor cancela después de aceptar? ¿Cuál es el monto/porcentaje?

**¿Por qué es importante?**
- Asegura que los repartidores cumplan con los pedidos aceptados
- Evita que los clientes queden esperando sin entrega
- Mantiene la calidad del servicio

**Caso práctico:**
Un repartidor acepta un pedido pero luego recibe una mejor oferta de otra plataforma y cancela. El cliente queda esperando y el local tiene que esperar a otro repartidor, retrasando la entrega.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Operaciones** define tiempos y montos

**¿Qué pasa si no lo controlamos?**
- Repartidores cancelan sin consecuencias
- Retrasos en entregas
- Mala experiencia del cliente
- Pérdida de confianza en la plataforma

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Penaliza con reducción de calificación y menos pedidos disponibles
- **Rappi:** Sistema de penalizaciones que afecta el acceso a pedidos premium
- **DiDi Food:** Penaliza con suspensión temporal si cancela múltiples pedidos

---

### 3. ¿Hay penalización si un cliente cancela después de que el local aceptó? ¿Cuál es el monto/porcentaje?

**¿Por qué es importante?**
- Protege al local de cancelaciones injustificadas
- Compensa al local por el tiempo y recursos invertidos
- Evita abusos de clientes

**Caso práctico:**
Un cliente ordena comida, el local la prepara, pero el cliente cancela porque encontró otra opción. El local pierde tiempo, ingredientes y potencial venta.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Legal** valida términos y condiciones

**¿Qué pasa si no lo controlamos?**
- Clientes cancelan sin consecuencias
- Locales pierden dinero y tiempo
- Desconfianza de locales en la plataforma
- Pérdida de socios comerciales

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Cobra al cliente si cancela después de que el restaurante acepta
- **Rappi:** Cobra penalización proporcional al tiempo transcurrido
- **DoorDash:** Cobra al cliente si cancela después de que el restaurante empieza a preparar

---

### 4. ¿Cuánto tiempo tiene el cliente para cancelar sin penalización después de crear el pedido?

**¿Por qué es importante?**
- Balance entre protección al cliente y protección al local
- Define cuándo el pedido se considera "comprometido"
- Evita cancelaciones tardías que afectan al local

**Caso práctico:**
Un cliente crea un pedido a las 2:00 PM. Si tiene 5 minutos para cancelar sin penalización, puede cambiar de opinión rápidamente. Si tiene 30 minutos, el local puede haber empezado a preparar.

**Quién lo resuelve:**
- **Product Owner** define el tiempo
- **Equipo de Operaciones** valida tiempos realistas

**¿Qué pasa si no lo controlamos?**
- Sin tiempo definido, confusión sobre cuándo se puede cancelar
- Disputas entre clientes y locales
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** 1-2 minutos después de crear el pedido
- **Rappi:** 3-5 minutos después de crear el pedido
- **DoorDash:** Hasta que el restaurante acepta (generalmente 1-3 minutos)

---

### 5. ¿Cuánto tiempo tiene el local para cancelar sin penalización después de recibir el pedido?

**¿Por qué es importante?**
- Permite al local evaluar si puede cumplir el pedido
- Protege al local de pedidos imposibles de cumplir
- Define cuándo el local se compromete con el pedido

**Caso práctico:**
Un local recibe un pedido grande a las 8:00 PM cuando está a punto de cerrar. Si tiene 2 minutos para cancelar sin penalización, puede rechazarlo. Si tiene 10 minutos, puede haber aceptado y luego cancelar con penalización.

**Quién lo resuelve:**
- **Product Owner** define el tiempo
- **Equipo de Operaciones** valida tiempos operativos

**¿Qué pasa si no lo controlamos?**
- Locales cancelan tarde, afectando al cliente
- Confusión sobre cuándo se puede cancelar
- Mala experiencia del cliente

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** El restaurante puede rechazar antes de aceptar sin penalización
- **Rappi:** 2-3 minutos después de recibir el pedido
- **DoorDash:** Hasta que acepta el pedido (no hay penalización si rechaza antes)

---

### 6. ¿Qué pasa si el local no acepta un pedido en X minutos? ¿Se cancela automáticamente?

**¿Por qué es importante?**
- Evita que los clientes esperen indefinidamente
- Libera el pedido para otros locales (si aplica)
- Define tiempos de respuesta esperados

**Caso práctico:**
Un cliente hace un pedido a las 7:00 PM. El local no responde. Si no hay cancelación automática, el cliente espera indefinidamente. Si hay cancelación automática después de 5 minutos, el cliente puede buscar otra opción.

**Quién lo resuelve:**
- **Product Owner** define el tiempo y la acción
- **Equipo de Operaciones** valida tiempos operativos

**¿Qué pasa si no lo controlamos?**
- Clientes esperan indefinidamente
- Mala experiencia del usuario
- Pedidos "huérfanos" en el sistema

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Cancela automáticamente después de 2-3 minutos si no acepta
- **Rappi:** Cancela automáticamente después de 3-5 minutos
- **DoorDash:** Cancela automáticamente después de 2 minutos si no acepta

---

### 7. ¿Hay límite de cancelaciones por día/semana para locales, repartidores o clientes?

**¿Por qué es importante?**
- Previene abusos del sistema
- Protege la calidad del servicio
- Identifica usuarios problemáticos

**Caso práctico:**
Un local cancela 10 pedidos al día sin penalización. Esto afecta a múltiples clientes y la reputación de la plataforma. Si hay un límite (ej: 3 cancelaciones por día), se identifica el problema.

**Quién lo resuelve:**
- **Product Owner** define los límites
- **Equipo de Operaciones** monitorea y aplica

**¿Qué pasa si no lo controlamos?**
- Usuarios abusan del sistema
- Degradación de la calidad del servicio
- Pérdida de confianza en la plataforma

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Límite de cancelaciones que afecta el ranking
- **Rappi:** Sistema de penalizaciones progresivas
- **DoorDash:** Suspensión temporal después de múltiples cancelaciones

---

## Políticas de Reembolsos

### 8. ¿Cuándo se reembolsa automáticamente vs cuándo requiere aprobación manual?

**¿Por qué es importante?**
- Balance entre velocidad y control
- Protege contra fraudes
- Define procesos claros

**Caso práctico:**
Un cliente cancela un pedido dentro del tiempo permitido → Reembolso automático. Un local cancela un pedido después de prepararlo → Requiere aprobación manual para verificar la situación.

**Quién lo resuelve:**
- **Product Owner** define los casos
- **Equipo Financiero** define los procesos
- **Equipo de Soporte** maneja aprobaciones manuales

**¿Qué pasa si no lo controlamos?**
- Reembolsos fraudulentos
- Pérdidas financieras
- Procesos lentos o confusos

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Reembolso automático para cancelaciones del cliente, manual para disputas
- **Rappi:** Automático para cancelaciones dentro del tiempo permitido
- **DoorDash:** Automático para cancelaciones del restaurante, manual para disputas

---

### 9. ¿Cuánto tiempo tarda un reembolso en procesarse?

**¿Por qué es importante?**
- Expectativas claras del cliente
- Cumplimiento con regulaciones financieras
- Confianza en la plataforma

**Caso práctico:**
Un cliente cancela un pedido y espera su reembolso. Si tarda 24 horas, está bien. Si tarda 7 días, el cliente puede perder confianza.

**Quién lo resuelve:**
- **Product Owner** define el tiempo
- **Equipo Financiero** valida tiempos técnicos
- **Equipo Legal** valida cumplimiento regulatorio

**¿Qué pasa si no lo controlamos?**
- Clientes insatisfechos
- Quejas y disputas
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** 3-5 días hábiles
- **Rappi:** 24-48 horas
- **DoorDash:** 3-7 días hábiles

---

### 10. ¿Se reembolsa en LocalCoins o en dinero real?

**¿Por qué es importante?**
- Define la política de reembolsos
- Afecta la experiencia del cliente
- Impacta el flujo de caja

**Caso práctico:**
Un cliente compró LocalCoins con tarjeta y luego cancela un pedido. ¿Recibe LocalCoins de vuelta o dinero real? Si recibe LocalCoins, puede sentirse "atrapado" en el sistema.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Financiero** valida impacto
- **Equipo Legal** valida términos

**¿Qué pasa si no lo controlamos?**
- Confusión sobre reembolsos
- Insatisfacción del cliente
- Disputas

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Reembolso al método de pago original
- **Rappi:** Reembolso al método de pago original
- **DoorDash:** Reembolso al método de pago original

---

### 11. ¿Qué pasa si el pedido se cancela después de que el local empezó a prepararlo?

**¿Por qué es importante?**
- Compensa al local por recursos invertidos
- Define responsabilidades claras
- Protege a ambas partes

**Caso práctico:**
Un local acepta un pedido y empieza a prepararlo. El cliente cancela 10 minutos después. El local ya invirtió ingredientes y tiempo. ¿Quién paga? ¿Se reembolsa al cliente completo o parcial?

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Legal** valida términos

**¿Qué pasa si no lo controlamos?**
- Pérdidas para el local
- Disputas entre cliente y local
- Pérdida de socios comerciales

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Si el restaurante ya empezó a preparar, el cliente paga parcialmente
- **Rappi:** Reembolso parcial si el restaurante ya empezó
- **DoorDash:** Reembolso completo solo si cancela antes de que empiece a preparar

---

### 12. ¿Se reembolsa el costo de envío si el pedido se cancela?

**¿Por qué es importante?**
- Define qué se reembolsa
- Afecta la experiencia del cliente
- Impacta costos operativos

**Caso práctico:**
Un cliente paga $50 de envío + $200 de comida. Si cancela, ¿recibe $250 o solo $200? Si el repartidor ya fue asignado, el costo de envío ya se incurrió.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Confusión sobre reembolsos
- Insatisfacción del cliente
- Pérdidas operativas

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Reembolso completo incluyendo envío si cancela a tiempo
- **Rappi:** Reembolso del envío solo si cancela antes de asignar repartidor
- **DoorDash:** Reembolso completo si cancela antes de que el restaurante acepte

---

## Reglas de Disponibilidad y Horarios

### 13. ¿Los locales pueden cerrar temporalmente durante el día sin penalización?

**¿Por qué es importante?**
- Permite flexibilidad operativa
- Protege contra abusos
- Define disponibilidad esperada

**Caso práctico:**
Un local necesita cerrar 30 minutos para resolver un problema técnico. Si puede hacerlo sin penalización, tiene flexibilidad. Si hay penalización, puede verse forzado a mantener abierto y afectar la calidad.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Operaciones** valida casos de uso

**¿Qué pasa si no lo controlamos?**
- Locales cierran sin aviso, afectando clientes
- O locales se ven forzados a mantener abierto cuando no pueden operar bien
- Mala experiencia del cliente

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Permite cerrar temporalmente, pero afecta el ranking si es frecuente
- **Rappi:** Permite cerrar sin penalización si es por menos de 2 horas
- **DoorDash:** Permite cerrar, pero notifica a clientes con pedidos pendientes

---

### 14. ¿Cuánto tiempo de anticipación necesita un local para cerrar sin afectar pedidos pendientes?

**¿Por qué es importante?**
- Protege a clientes con pedidos en proceso
- Permite planificación
- Define expectativas claras

**Caso práctico:**
Un local quiere cerrar a las 9:00 PM. Si necesita 30 minutos de anticipación, puede cerrar a las 8:30 PM sin afectar pedidos. Si necesita 2 horas, debe planificar mejor.

**Quién lo resuelve:**
- **Product Owner** define el tiempo
- **Equipo de Operaciones** valida tiempos operativos

**¿Qué pasa si no lo controlamos?**
- Locales cierran con pedidos pendientes
- Clientes afectados
- Mala experiencia

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** 1 hora de anticipación para cerrar sin afectar pedidos
- **Rappi:** 30 minutos de anticipación
- **DoorDash:** 1 hora de anticipación

---

### 15. ¿Qué pasa si un local está "abierto" pero no acepta pedidos por X tiempo?

**¿Por qué es importante?**
- Identifica problemas operativos
- Protege la experiencia del cliente
- Define disponibilidad real

**Caso práctico:**
Un local está marcado como "abierto" pero no acepta pedidos durante 2 horas. Los clientes intentan ordenar pero no pueden. Esto genera frustración.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Operaciones** monitorea y aplica

**¿Qué pasa si no lo controlamos?**
- Clientes frustrados
- Pérdida de confianza
- Locales "fantasma" en la plataforma

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Cierra automáticamente si no acepta pedidos por 30 minutos
- **Rappi:** Notifica al local y cierra si no responde
- **DoorDash:** Cierra automáticamente después de 1 hora sin aceptar

---

### 16. ¿Hay horarios mínimos de operación obligatorios para locales?

**¿Por qué es importante?**
- Asegura disponibilidad para clientes
- Define expectativas
- Protege la calidad del servicio

**Caso práctico:**
Un local solo opera 2 horas al día. Los clientes no saben cuándo está disponible. Si hay un mínimo (ej: 4 horas al día), hay más disponibilidad.

**Quién lo resuelve:**
- **Product Owner** define los horarios mínimos
- **Equipo de Operaciones** valida viabilidad

**¿Qué pasa si no lo controlamos?**
- Locales con disponibilidad muy limitada
- Clientes no pueden encontrar opciones
- Mala experiencia del usuario

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** No hay mínimo obligatorio, pero afecta el ranking
- **Rappi:** Recomienda mínimo 4 horas al día
- **DoorDash:** No hay mínimo, pero locales con más horas tienen mejor visibilidad

---

### 17. ¿Los repartidores pueden estar "disponibles" pero rechazar todos los pedidos?

**¿Por qué es importante?**
- Identifica repartidores problemáticos
- Protege la calidad del servicio
- Define disponibilidad real

**Caso práctico:**
Un repartidor marca "disponible" pero rechaza 10 pedidos seguidos. Esto afecta la asignación de entregas y la experiencia del cliente.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Operaciones** monitorea y aplica

**¿Qué pasa si no lo controlamos?**
- Repartidores "fantasma" en el sistema
- Retrasos en entregas
- Mala experiencia del cliente

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Penaliza con menos pedidos disponibles si rechaza muchos
- **Rappi:** Suspende temporalmente si rechaza más del 50% de pedidos
- **DiDi Food:** Afecta el ranking y acceso a pedidos premium

---

## Políticas de Precios y Comisiones

### 18. ¿Cuál es la comisión que LOCALIA cobra a los locales por pedido?

**¿Por qué es importante?**
- Define el modelo de negocio
- Afecta la viabilidad financiera
- Impacta la competitividad

**Caso práctico:**
Un local vende un pedido de $500. Si LOCALIA cobra 15% ($75), el local recibe $425. Si cobra 25% ($125), el local recibe $375. Esto afecta si el local quiere usar la plataforma.

**Quién lo resuelve:**
- **Product Owner** define la comisión
- **Equipo Financiero** valida viabilidad
- **Equipo de Negocios** compara con competencia

**¿Qué pasa si no lo controlamos?**
- Sin modelo de ingresos claro
- Locales no saben cuánto pagarán
- Pérdida de viabilidad financiera

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** 15-30% dependiendo del plan
- **Rappi:** 20-25% por pedido
- **DoorDash:** 15-30% dependiendo del plan

---

### 19. ¿La comisión es fija o porcentual?

**¿Por qué es importante?**
- Afecta cómo se calcula
- Impacta diferentes tipos de pedidos
- Define el modelo de ingresos

**Caso práctico:**
Un pedido de $100 vs uno de $1000. Si la comisión es fija ($20), el local paga lo mismo. Si es porcentual (15%), paga $15 vs $150. Esto afecta qué tipo de pedidos son más rentables.

**Quién lo resuelve:**
- **Product Owner** define el modelo
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Modelo de ingresos confuso
- Locales no entienden los costos
- Pérdida de transparencia

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Porcentual (15-30%)
- **Rappi:** Porcentual (20-25%)
- **DoorDash:** Porcentual (15-30%) o fija en algunos planes

---

### 20. ¿Hay comisión mínima o máxima?

**¿Por qué es importante?**
- Protege a LOCALIA de pedidos muy pequeños
- Protege a locales de comisiones muy altas
- Define límites razonables

**Caso práctico:**
Un pedido de $20. Si la comisión es 15% ($3), puede no cubrir los costos operativos. Si hay mínimo de $5, se cubre. Un pedido de $2000 con 25% = $500, puede ser excesivo.

**Quién lo resuelve:**
- **Product Owner** define los límites
- **Equipo Financiero** valida viabilidad

**¿Qué pasa si no lo controlamos?**
- Pérdidas en pedidos pequeños
- Comisiones excesivas en pedidos grandes
- Pérdida de competitividad

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Comisión mínima de $2-3 USD
- **Rappi:** Comisión mínima de $20 MXN
- **DoorDash:** Comisión mínima de $2-3 USD

---

### 21. ¿Los locales pueden ver la comisión antes de aceptar el pedido?

**¿Por qué es importante?**
- Transparencia en el proceso
- Permite toma de decisiones informada
- Construye confianza

**Caso práctico:**
Un local recibe un pedido de $500. Si puede ver que la comisión es $75 (15%), puede decidir si acepta o no. Si no puede verlo, acepta sin saber cuánto recibirá.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de UX** diseña la interfaz

**¿Qué pasa si no lo controlamos?**
- Locales aceptan sin saber cuánto recibirán
- Desconfianza
- Pérdida de socios comerciales

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Muestra comisión después de aceptar
- **Rappi:** Muestra comisión estimada antes de aceptar
- **DoorDash:** Muestra comisión en el resumen del pedido

---

### 22. ¿Cuál es el costo de envío que se cobra al cliente? ¿Es fijo o variable por distancia?

**¿Por qué es importante?**
- Define el precio para el cliente
- Afecta la competitividad
- Impacta la experiencia del usuario

**Caso práctico:**
Un cliente ordena de un local a 0.5 km vs otro a 2.5 km. Si el envío es fijo ($30), ambos pagan lo mismo. Si es variable ($10/km), pagan $5 vs $25. Esto afecta qué locales elige el cliente.

**Quién lo resuelve:**
- **Product Owner** define el modelo
- **Equipo Financiero** valida viabilidad
- **Equipo de Operaciones** valida costos reales

**¿Qué pasa si no lo controlamos?**
- Precios no competitivos
- Pérdida de clientes
- Pérdidas operativas

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Variable por distancia (aproximadamente $1-2 USD/km)
- **Rappi:** Fijo o variable dependiendo de la zona
- **DoorDash:** Variable por distancia y tiempo

---

### 23. ¿Quién define el precio del envío: LOCALIA o el local?

**¿Por qué es importante?**
- Define quién controla el precio
- Afecta la competitividad
- Impacta la experiencia del cliente

**Caso práctico:**
Un local quiere cobrar $50 de envío, pero LOCALIA cobra $30. Si el local define, puede ser más caro. Si LOCALIA define, es consistente pero puede no cubrir costos del local.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Precios inconsistentes
- Confusión del cliente
- Pérdida de competitividad

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** La plataforma define el precio
- **Rappi:** La plataforma define, pero el local puede ajustar
- **DoorDash:** La plataforma define el precio base

---

### 24. ¿Hay descuentos por volumen para locales que hacen muchos pedidos?

**¿Por qué es importante?**
- Incentiva a locales activos
- Recompensa volumen
- Afecta la retención

**Caso práctico:**
Un local hace 100 pedidos al mes vs otro que hace 10. Si hay descuento por volumen (ej: 15% → 12% después de 50 pedidos), el local activo paga menos comisión.

**Quién lo resuelve:**
- **Product Owner** define los descuentos
- **Equipo Financiero** valida viabilidad

**¿Qué pasa si no lo controlamos?**
- Sin incentivos para volumen
- Locales no tienen razón para crecer
- Pérdida de retención

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Planes con comisiones reducidas por volumen
- **Rappi:** Descuentos progresivos por volumen mensual
- **DoorDash:** Planes premium con comisiones reducidas

---

## Reglas de Repartidores

### 25. ¿Cuántos pedidos puede aceptar un repartidor simultáneamente?

**¿Por qué es importante?**
- Afecta la eficiencia
- Impacta tiempos de entrega
- Define capacidad operativa

**Caso práctico:**
Un repartidor acepta 1 pedido a la vez vs 3 a la vez. Con 1, es más lento pero más controlado. Con 3, es más eficiente pero puede retrasar entregas si no planifica bien.

**Quién lo resuelve:**
- **Product Owner** define el límite
- **Equipo de Operaciones** valida capacidad real

**¿Qué pasa si no lo controlamos?**
- Repartidores sobrecargados
- Retrasos en entregas
- Mala experiencia del cliente

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Hasta 2-3 pedidos simultáneos
- **Rappi:** Hasta 2 pedidos simultáneos
- **DiDi Food:** Hasta 2-3 pedidos simultáneos

---

### 26. ¿Hay un radio máximo de entrega para repartidores?

**¿Por qué es importante?**
- Define la zona de cobertura
- Afecta tiempos de entrega
- Protege la calidad del servicio

**Caso práctico:**
Un repartidor acepta un pedido a 5 km de distancia. Si el máximo es 3 km, no puede aceptarlo. Esto mantiene entregas rápidas y eficientes.

**Quién lo resuelve:**
- **Product Owner** define el radio
- **Equipo de Operaciones** valida tiempos reales

**¿Qué pasa si no lo controlamos?**
- Entregas muy lejanas
- Retrasos excesivos
- Mala experiencia del cliente

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Radio máximo de 5-7 km
- **Rappi:** Radio máximo de 3-5 km
- **DiDi Food:** Radio máximo de 5 km

---

### 27. ¿Qué pasa si un repartidor acepta un pedido pero no lo recoge en X tiempo?

**¿Por qué es importante?**
- Protege al cliente de esperas excesivas
- Define tiempos de recogida
- Asegura cumplimiento

**Caso práctico:**
Un repartidor acepta un pedido pero no lo recoge en 30 minutos. El cliente espera y la comida se enfría. Si hay un tiempo máximo (ej: 15 minutos), se puede reasignar.

**Quién lo resuelve:**
- **Product Owner** define el tiempo y la acción
- **Equipo de Operaciones** valida tiempos reales

**¿Qué pasa si no lo controlamos?**
- Clientes esperan indefinidamente
- Comida fría o en mal estado
- Mala experiencia

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Reasigna después de 10-15 minutos
- **Rappi:** Reasigna después de 15 minutos
- **DiDi Food:** Reasigna después de 10 minutos

---

### 28. ¿Hay penalización si un repartidor tarda más de X tiempo en entregar?

**¿Por qué es importante?**
- Incentiva entregas rápidas
- Protege la calidad del servicio
- Define expectativas

**Caso práctico:**
Un repartidor tarda 45 minutos en entregar un pedido que debería tardar 20 minutos. Si hay penalización, se incentiva a ser más rápido. Si no, puede ser lento sin consecuencias.

**Quién lo resuelve:**
- **Product Owner** define la penalización
- **Equipo de Operaciones** valida tiempos reales

**¿Qué pasa si no lo controlamos?**
- Entregas lentas
- Mala experiencia del cliente
- Pérdida de calidad

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Afecta el ranking y acceso a pedidos
- **Rappi:** Penaliza con menos pedidos disponibles
- **DiDi Food:** Afecta la calificación

---

### 29. ¿Los repartidores pueden rechazar pedidos sin penalización? ¿Cuántos por día?

**¿Por qué es importante?**
- Permite flexibilidad
- Previene abusos
- Define límites razonables

**Caso práctico:**
Un repartidor rechaza 20 pedidos al día sin penalización. Esto afecta la asignación de entregas. Si hay límite (ej: 5 rechazos por día), se controla el abuso.

**Quién lo resuelve:**
- **Product Owner** define el límite
- **Equipo de Operaciones** monitorea

**¿Qué pasa si no lo controlamos?**
- Repartidores rechazan sin consecuencias
- Dificultad para asignar entregas
- Mala experiencia del cliente

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Puede rechazar, pero afecta el ranking
- **Rappi:** Límite de 10 rechazos por día
- **DiDi Food:** Puede rechazar, pero afecta acceso a pedidos premium

---

### 30. ¿Hay incentivos para repartidores que aceptan más pedidos o entregan más rápido?

**¿Por qué es importante?**
- Incentiva buen desempeño
- Recompensa comportamiento positivo
- Mejora la calidad del servicio

**Caso práctico:**
Un repartidor que acepta muchos pedidos y entrega rápido vs uno que rechaza muchos. Si hay incentivos (ej: bonos, mejor acceso a pedidos), se motiva el buen desempeño.

**Quién lo resuelve:**
- **Product Owner** define los incentivos
- **Equipo Financiero** valida viabilidad

**¿Qué pasa si no lo controlamos?**
- Sin motivación para buen desempeño
- Calidad del servicio inconsistente
- Pérdida de repartidores activos

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Bonos por volumen y calificaciones altas
- **Rappi:** Acceso a pedidos premium y bonos
- **DiDi Food:** Bonos por entregas rápidas y volumen

---

## Políticas de Stock e Inventario

### 31. ¿Qué pasa si un cliente ordena un producto que ya no está disponible?

**¿Por qué es importante?**
- Define el proceso cuando falta stock
- Protege al cliente
- Protege al local

**Caso práctico:**
Un cliente ordena un producto que el local marcó como "agotado" pero el sistema no actualizó. El local acepta el pedido pero no tiene el producto. ¿Qué pasa?

**Quién lo resuelve:**
- **Product Owner** define el proceso
- **Equipo de Operaciones** valida casos

**¿Qué pasa si no lo controlamos?**
- Pedidos con productos no disponibles
- Clientes insatisfechos
- Disputas

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** El restaurante puede marcar como "no disponible" y el cliente recibe notificación
- **Rappi:** El restaurante puede cancelar el item y ofrecer alternativa
- **DoorDash:** El restaurante puede marcar como "agotado" antes de aceptar

---

### 32. ¿El local puede marcar productos como "agotado" en tiempo real?

**¿Por qué es importante?**
- Permite actualización inmediata
- Evita pedidos de productos no disponibles
- Mejora la experiencia

**Caso práctico:**
Un local se queda sin un producto a las 7:00 PM. Si puede marcarlo como "agotado" inmediatamente, los clientes no pueden ordenarlo. Si no puede, siguen recibiendo pedidos de ese producto.

**Quién lo resuelve:**
- **Product Owner** define la funcionalidad
- **Equipo Técnico** implementa

**¿Qué pasa si no lo controlamos?**
- Pedidos de productos no disponibles
- Clientes insatisfechos
- Trabajo extra para el local

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Sí, puede marcar como "no disponible" en tiempo real
- **Rappi:** Sí, puede actualizar disponibilidad en tiempo real
- **DoorDash:** Sí, puede marcar como "agotado" en tiempo real

---

### 33. ¿Hay penalización si un local acepta un pedido pero luego dice que no tiene el producto?

**¿Por qué es importante?**
- Incentiva a mantener stock actualizado
- Protege al cliente
- Define responsabilidades

**Caso práctico:**
Un local acepta un pedido pero luego dice que no tiene un producto. El cliente espera y luego tiene que cancelar o aceptar un reemplazo. Si hay penalización, el local se esfuerza más en mantener stock actualizado.

**Quién lo resuelve:**
- **Product Owner** define la penalización
- **Equipo de Operaciones** aplica

**¿Qué pasa si no lo controlamos?**
- Locales no mantienen stock actualizado
- Clientes insatisfechos
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Penaliza con descuento en comisión o suspensión
- **Rappi:** Penaliza con reducción de ranking
- **DoorDash:** Penaliza con afectación al rating

---

### 34. ¿El sistema debe validar stock antes de permitir agregar al carrito?

**¿Por qué es importante?**
- Previene pedidos de productos no disponibles
- Mejora la experiencia del cliente
- Reduce problemas operativos

**Caso práctico:**
Un cliente agrega un producto al carrito, pero cuando intenta hacer el pedido, ya no está disponible. Si el sistema valida antes de agregar, evita este problema.

**Quién lo resuelve:**
- **Product Owner** define la validación
- **Equipo Técnico** implementa

**¿Qué pasa si no lo controlamos?**
- Clientes agregan productos no disponibles
- Frustración al hacer checkout
- Mala experiencia

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Valida stock antes de agregar al carrito
- **Rappi:** Valida stock en tiempo real
- **DoorDash:** Valida stock antes de permitir checkout

---

## Reglas de Zonas de Cobertura

### 35. ¿Qué pasa si un cliente está en el límite del radio de 3 km? ¿Se permite el pedido?

**¿Por qué es importante?**
- Define límites claros
- Afecta la disponibilidad
- Impacta la experiencia del usuario

**Caso práctico:**
Un cliente está a 2.9 km de un local (dentro del radio) vs 3.1 km (fuera del radio). Si el límite es estricto, el segundo no puede ordenar. Si hay margen (ej: 3.2 km), puede ordenar.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Técnico** implementa la validación

**¿Qué pasa si no lo controlamos?**
- Confusión sobre límites
- Clientes frustrados
- Entregas fuera del radio prometido

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Límite estricto con margen de 0.2 km
- **Rappi:** Límite estricto de 3 km
- **DoorDash:** Límite estricto con validación GPS

---

### 36. ¿Los locales pueden definir su propia zona de cobertura o es fija (3 km)?

**¿Por qué es importante?**
- Define flexibilidad operativa
- Afecta la disponibilidad
- Impacta la experiencia

**Caso práctico:**
Un local quiere cubrir solo 1.5 km porque tiene pocos repartidores. Si puede definir su zona, tiene más control. Si es fija a 3 km, debe cubrir toda el área.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Operaciones** valida casos

**¿Qué pasa si no lo controlamos?**
- Locales cubren áreas que no pueden manejar
- O locales limitan demasiado su cobertura
- Pérdida de flexibilidad

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Zona fija definida por la plataforma
- **Rappi:** Zona fija de 3-5 km
- **DoorDash:** Zona fija definida por la plataforma

---

### 37. ¿Qué pasa si un cliente se mueve fuera del radio después de crear el pedido?

**¿Por qué es importante?**
- Define responsabilidades
- Protege al repartidor
- Afecta la entrega

**Caso práctico:**
Un cliente crea un pedido desde su casa (dentro del radio), pero luego se mueve a otra ubicación (fuera del radio). El repartidor intenta entregar pero el cliente no está en la dirección original.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Legal** valida términos

**¿Qué pasa si no lo controlamos?**
- Entregas fallidas
- Pérdidas para repartidores
- Disputas

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** El pedido se entrega a la dirección original registrada
- **Rappi:** El cliente puede actualizar la dirección antes de que se asigne repartidor
- **DoorDash:** El pedido se entrega a la dirección original

---

## Políticas de Propinas

### 38. ¿Hay propina sugerida automática? ¿Qué porcentaje?

**¿Por qué es importante?**
- Aumenta propinas para repartidores
- Mejora ingresos de repartidores
- Define expectativas

**Caso práctico:**
Un cliente completa un pedido de $200. Si hay propina sugerida del 10% ($20), es más probable que agregue propina. Si no hay sugerencia, puede olvidar agregar propina.

**Quién lo resuelve:**
- **Product Owner** define el porcentaje
- **Equipo de UX** diseña la interfaz

**¿Qué pasa si no lo controlamos?**
- Menos propinas
- Repartidores menos motivados
- Pérdida de calidad del servicio

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Sugiere 15%, 20%, 25%
- **Rappi:** Sugiere 10%, 15%, 20%
- **DoorDash:** Sugiere 15%, 18%, 20%

---

### 39. ¿La propina va 100% al repartidor o se divide con el local?

**¿Por qué es importante?**
- Define quién recibe la propina
- Afecta la motivación
- Impacta la experiencia

**Caso práctico:**
Un cliente da $50 de propina. Si va 100% al repartidor, recibe $50. Si se divide 70/30, recibe $35 y el local $15. Esto afecta la motivación del repartidor.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Confusión sobre quién recibe la propina
- Desconfianza
- Pérdida de motivación

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** 100% al repartidor
- **Rappi:** 100% al repartidor
- **DoorDash:** 100% al repartidor

---

### 40. ¿Los clientes pueden agregar propina después de la entrega?

**¿Por qué es importante?**
- Permite propina basada en experiencia
- Aumenta flexibilidad
- Mejora la experiencia

**Caso práctico:**
Un cliente no agregó propina al hacer el pedido, pero el repartidor fue excelente. Si puede agregar propina después, puede recompensar el buen servicio.

**Quién lo resuelve:**
- **Product Owner** define la funcionalidad
- **Equipo Técnico** implementa

**¿Qué pasa si no lo controlamos?**
- Clientes no pueden recompensar buen servicio después
- Menos propinas
- Pérdida de motivación

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Sí, hasta 30 días después
- **Rappi:** Sí, hasta 24 horas después
- **DoorDash:** Sí, hasta 7 días después

---

### 41. ¿Hay límite máximo de propina?

**¿Por qué es importante?**
- Previene errores o fraudes
- Define límites razonables
- Protege el sistema

**Caso práctico:**
Un cliente intenta agregar $10,000 de propina por error. Si hay límite máximo (ej: 50% del pedido o $500), se previene el error.

**Quién lo resuelve:**
- **Product Owner** define el límite
- **Equipo Financiero** valida

**¿Qué pasa si no lo controlamos?**
- Errores costosos
- Posibles fraudes
- Disputas

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Límite de $100 USD
- **Rappi:** Límite de $500 MXN
- **DoorDash:** Límite de $100 USD

---

## Reglas de Verificación y Seguridad

### 42. ¿Qué documentos necesita un local para registrarse y operar?

**¿Por qué es importante?**
- Asegura legitimidad
- Cumple con regulaciones
- Protege a clientes

**Caso práctico:**
Un local quiere registrarse. Si necesita RFC, comprobante de domicilio, y permiso de funcionamiento, se asegura que es un negocio legítimo.

**Quién lo resuelve:**
- **Product Owner** define los documentos
- **Equipo Legal** valida requisitos regulatorios
- **Equipo de Operaciones** valida el proceso

**¿Qué pasa si no lo controlamos?**
- Negocios falsos en la plataforma
- Problemas legales
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** RFC, comprobante de domicilio, permiso de funcionamiento
- **Rappi:** RFC, comprobante de domicilio, identificación oficial
- **DoorDash:** Licencia de negocio, identificación, comprobante de domicilio

---

### 43. ¿Qué documentos necesita un repartidor para registrarse?

**¿Por qué es importante?**
- Asegura identidad
- Protege a clientes
- Cumple con regulaciones

**Caso práctico:**
Un repartidor quiere registrarse. Si necesita identificación oficial, comprobante de domicilio, y verificación de antecedentes, se asegura que es una persona legítima.

**Quién lo resuelve:**
- **Product Owner** define los documentos
- **Equipo Legal** valida requisitos
- **Equipo de Operaciones** valida el proceso

**¿Qué pasa si no lo controlamos?**
- Repartidores falsos
- Problemas de seguridad
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Identificación oficial, comprobante de domicilio, verificación de antecedentes
- **Rappi:** Identificación oficial, comprobante de domicilio
- **DiDi Food:** Identificación oficial, verificación de antecedentes

---

### 44. ¿Hay verificación de identidad obligatoria?

**¿Por qué es importante?**
- Asegura que las personas son quienes dicen ser
- Previene fraudes
- Protege el sistema

**Caso práctico:**
Un usuario se registra con documentos falsos. Si hay verificación de identidad (ej: selfie con ID), se detecta el fraude.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Seguridad** implementa el proceso

**¿Qué pasa si no lo controlamos?**
- Cuentas falsas
- Fraudes
- Pérdida de seguridad

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Verificación de identidad obligatoria
- **Rappi:** Verificación de identidad obligatoria
- **DoorDash:** Verificación de identidad obligatoria

---

### 45. ¿Qué pasa si un local o repartidor no pasa la verificación?

**¿Por qué es importante?**
- Define el proceso de rechazo
- Protege el sistema
- Asegura calidad

**Caso práctico:**
Un local envía documentos que no son válidos. Si no pasa la verificación, ¿se rechaza inmediatamente o puede apelar? ¿Se le notifica la razón?

**Quién lo resuelve:**
- **Product Owner** define el proceso
- **Equipo de Operaciones** maneja los casos

**¿Qué pasa si no lo controlamos?**
- Proceso confuso
- Usuarios frustrados
- Pérdida de potenciales socios legítimos

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Rechazo con razón y opción de apelar
- **Rappi:** Rechazo con notificación y opción de corregir
- **DoorDash:** Rechazo con razón y proceso de apelación

---

### 46. ¿Hay un proceso de apelación si se rechaza una verificación?

**¿Por qué es importante?**
- Permite corregir errores
- Protege a usuarios legítimos
- Mejora la experiencia

**Caso práctico:**
Un local legítimo es rechazado por error (ej: documento borroso). Si hay proceso de apelación, puede corregir y ser aceptado. Si no, queda fuera del sistema.

**Quién lo resuelve:**
- **Product Owner** define el proceso
- **Equipo de Operaciones** maneja apelaciones

**¿Qué pasa si no lo controlamos?**
- Usuarios legítimos rechazados sin remedio
- Pérdida de potenciales socios
- Mala experiencia

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Sí, proceso de apelación con revisión manual
- **Rappi:** Sí, puede corregir documentos y reenviar
- **DoorDash:** Sí, proceso de apelación con soporte

---

## Políticas de Soporte y Escalamiento

### 47. ¿Qué pasa si hay un problema con un pedido? ¿Quién lo resuelve?

**¿Por qué es importante?**
- Define responsabilidades
- Asegura resolución de problemas
- Protege a todas las partes

**Caso práctico:**
Un pedido llega incorrecto o tarde. ¿Quién resuelve? ¿El local? ¿LOCALIA? ¿El repartidor? Si no está claro, el problema no se resuelve.

**Quién lo resuelve:**
- **Product Owner** define el proceso
- **Equipo de Soporte** maneja los casos

**¿Qué pasa si no lo controlamos?**
- Problemas sin resolver
- Clientes insatisfechos
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Soporte de la plataforma resuelve problemas
- **Rappi:** Soporte centralizado resuelve todos los problemas
- **DoorDash:** Soporte de la plataforma maneja disputas

---

### 48. ¿Hay un número de soporte para clientes, locales y repartidores?

**¿Por qué es importante?**
- Proporciona canal de comunicación
- Asegura resolución de problemas
- Mejora la experiencia

**Caso práctico:**
Un cliente tiene un problema urgente. Si hay número de soporte, puede llamar y resolver. Si no, tiene que esperar respuesta por email.

**Quién lo resuelve:**
- **Product Owner** define los canales
- **Equipo de Soporte** implementa

**¿Qué pasa si no lo controlamos?**
- Problemas sin resolver
- Frustración de usuarios
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Soporte por chat, teléfono, y email
- **Rappi:** Soporte por chat y teléfono 24/7
- **DoorDash:** Soporte por chat y teléfono

---

### 49. ¿Cuánto tiempo tiene el equipo para responder a problemas reportados?

**¿Por qué es importante?**
- Define expectativas
- Asegura respuesta oportuna
- Mejora la experiencia

**Caso práctico:**
Un cliente reporta un problema. Si el equipo responde en 1 hora, está bien. Si responde en 3 días, el cliente está frustrado.

**Quién lo resuelve:**
- **Product Owner** define los tiempos
- **Equipo de Soporte** implementa

**¿Qué pasa si no lo controlamos?**
- Respuestas lentas
- Clientes insatisfechos
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Respuesta en 1-2 horas
- **Rappi:** Respuesta en 30 minutos - 1 hora
- **DoorDash:** Respuesta en 1-2 horas

---

### 50. ¿Hay un proceso de escalamiento para problemas graves?

**¿Por qué es importante?**
- Asegura resolución de problemas críticos
- Define prioridades
- Protege a todas las partes

**Caso práctico:**
Un cliente reporta un problema de seguridad (ej: repartidor agresivo). Si hay escalamiento, se maneja inmediatamente. Si no, se trata como problema normal.

**Quién lo resuelve:**
- **Product Owner** define el proceso
- **Equipo de Soporte** implementa

**¿Qué pasa si no lo controlamos?**
- Problemas graves sin atención prioritaria
- Riesgos de seguridad
- Pérdida de confianza

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Escalamiento inmediato para problemas de seguridad
- **Rappi:** Escalamiento para problemas críticos en menos de 15 minutos
- **DoorDash:** Escalamiento para problemas de seguridad inmediato

---

## Reglas de LocalCoins

### 51. ¿Hay un mínimo de compra de LocalCoins?

**¿Por qué es importante?**
- Asegura transacciones viables
- Reduce costos de procesamiento
- Define expectativas

**Caso práctico:**
Un cliente quiere comprar $10 de LocalCoins. Si el mínimo es $50, debe comprar más. Esto reduce costos de procesamiento y asegura transacciones viables.

**Quién lo resuelve:**
- **Product Owner** define el mínimo
- **Equipo Financiero** valida costos

**¿Qué pasa si no lo controlamos?**
- Transacciones muy pequeñas no viables
- Pérdidas por costos de procesamiento
- Confusión sobre montos

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Mínimo de $10 USD para recargar créditos
- **Rappi:** Mínimo de $50 MXN para recargar
- **DoorDash:** Mínimo de $10 USD para recargar

---

### 52. ¿Hay un máximo de compra de LocalCoins por transacción?

**¿Por qué es importante?**
- Previene fraudes
- Protege el sistema
- Define límites razonables

**Caso práctico:**
Un cliente intenta comprar $100,000 de LocalCoins en una transacción. Si hay máximo (ej: $10,000), se previene posible fraude o error.

**Quién lo resuelve:**
- **Product Owner** define el máximo
- **Equipo de Seguridad** valida

**¿Qué pasa si no lo controlamos?**
- Posibles fraudes
- Errores costosos
- Riesgos financieros

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Máximo de $500 USD por transacción
- **Rappi:** Máximo de $5,000 MXN por transacción
- **DoorDash:** Máximo de $500 USD por transacción

---

### 53. ¿Los LocalCoins tienen fecha de expiración?

**¿Por qué es importante?**
- Incentiva uso
- Afecta el flujo de caja
- Define políticas de créditos

**Caso práctico:**
Un cliente compra LocalCoins pero no los usa por 6 meses. Si expiran después de 30 días, se incentiva el uso. Si no expiran, puede acumularse sin usar.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Créditos sin usar acumulados
- Menor rotación
- Impacto en flujo de caja

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Los créditos no expiran
- **Rappi:** Los créditos expiran después de 90 días de inactividad
- **DoorDash:** Los créditos no expiran

---

### 54. ¿Se pueden transferir LocalCoins entre usuarios?

**¿Por qué es importante?**
- Define flexibilidad
- Afecta posibles fraudes
- Impacta la experiencia

**Caso práctico:**
Un cliente quiere enviar LocalCoins a un amigo como regalo. Si puede transferir, tiene flexibilidad. Si no, está limitado.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Seguridad** valida riesgos

**¿Qué pasa si no lo controlamos?**
- Sin flexibilidad para usuarios
- O posibles fraudes si se permite sin control
- Pérdida de funcionalidad útil

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** No se pueden transferir créditos
- **Rappi:** No se pueden transferir créditos
- **DoorDash:** No se pueden transferir créditos

---

### 55. ¿Hay límite de LocalCoins que un usuario puede tener en su cuenta?

**¿Por qué es importante?**
- Previene acumulación excesiva
- Protege el sistema
- Define límites razonables

**Caso práctico:**
Un usuario acumula $50,000 de LocalCoins. Si hay límite (ej: $10,000), debe usar antes de comprar más. Esto incentiva uso y previene acumulación excesiva.

**Quién lo resuelve:**
- **Product Owner** define el límite
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Acumulación excesiva
- Menor rotación
- Riesgos financieros

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** No hay límite
- **Rappi:** Límite de $10,000 MXN
- **DoorDash:** No hay límite

---

## Políticas de Nuevos Usuarios

### 56. ¿Hay bonificación de LocalCoins para nuevos usuarios?

**¿Por qué es importante?**
- Incentiva registro
- Aumenta adopción
- Mejora onboarding

**Caso práctico:**
Un nuevo usuario se registra. Si recibe $100 de LocalCoins gratis, es más probable que pruebe la plataforma. Si no recibe nada, puede no registrarse.

**Quién lo resuelve:**
- **Product Owner** define la bonificación
- **Equipo Financiero** valida viabilidad
- **Equipo de Marketing** valida efectividad

**¿Qué pasa si no lo controlamos?**
- Menor tasa de registro
- Menor adopción
- Pérdida de crecimiento

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Bonificación de $5-10 USD para nuevos usuarios
- **Rappi:** Bonificación de $50-100 MXN para nuevos usuarios
- **DoorDash:** Bonificación de $5-10 USD para nuevos usuarios

---

### 57. ¿Hay bonificación de LocalCoins para referidos?

**¿Por qué es importante?**
- Incentiva referidos
- Aumenta crecimiento orgánico
- Reduce costos de adquisición

**Caso práctico:**
Un usuario refiere a un amigo. Si ambos reciben $50 de LocalCoins, hay incentivo para referir. Si no hay bonificación, menos referidos.

**Quién lo resuelve:**
- **Product Owner** define la bonificación
- **Equipo Financiero** valida viabilidad
- **Equipo de Marketing** valida efectividad

**¿Qué pasa si no lo controlamos?**
- Menos crecimiento orgánico
- Mayor dependencia de marketing pagado
- Pérdida de oportunidad de crecimiento

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Bonificación para referidor y referido ($5-10 USD cada uno)
- **Rappi:** Bonificación para referidor y referido ($50-100 MXN cada uno)
- **DoorDash:** Bonificación para referidor y referido ($5-10 USD cada uno)

---

### 58. ¿Cuánto tiempo tienen los nuevos usuarios para usar bonificaciones?

**¿Por qué es importante?**
- Incentiva uso rápido
- Afecta efectividad de bonificaciones
- Define expectativas

**Caso práctico:**
Un nuevo usuario recibe $100 de LocalCoins gratis. Si debe usarlos en 30 días, se incentiva uso rápido. Si no hay límite, puede acumularse sin usar.

**Quién lo resuelve:**
- **Product Owner** define el tiempo
- **Equipo Financiero** valida impacto

**¿Qué pasa si no lo controlamos?**
- Bonificaciones sin usar
- Menor efectividad de marketing
- Pérdida de inversión

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Bonificaciones expiran después de 30 días
- **Rappi:** Bonificaciones expiran después de 30 días
- **DoorDash:** Bonificaciones expiran después de 30 días

---

### 59. ¿Hay límite de cuentas por persona (para evitar fraude)?

**¿Por qué es importante?**
- Previene abuso de bonificaciones
- Protege el sistema
- Asegura uso legítimo

**Caso práctico:**
Una persona crea 10 cuentas para recibir bonificaciones múltiples. Si hay límite (ej: 1 cuenta por persona), se previene el fraude.

**Quién lo resuelve:**
- **Product Owner** define el límite
- **Equipo de Seguridad** implementa validación

**¿Qué pasa si no lo controlamos?**
- Abuso de bonificaciones
- Pérdidas financieras
- Fraudes

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Validación de identidad previene múltiples cuentas
- **Rappi:** Validación de teléfono y documento previene múltiples cuentas
- **DoorDash:** Validación de identidad y tarjeta previene múltiples cuentas

---

## Reglas de Negocio y Operación

### 60. ¿Cuántos locales pueden operar simultáneamente en la misma zona?

**¿Por qué es importante?**
- Afecta la competencia
- Impacta la disponibilidad
- Define la estrategia de mercado

**Caso práctico:**
En una zona hay 5 locales de pizza. Si no hay límite, todos compiten. Si hay límite (ej: 2 por categoría), hay menos competencia pero más control.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Negocios** valida estrategia

**¿Qué pasa si no lo controlamos?**
- Sobre-saturación de mercado
- O falta de opciones para clientes
- Pérdida de control estratégico

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** No hay límite, pero hay ranking que afecta visibilidad
- **Rappi:** No hay límite, pero hay exclusividad por categoría en algunas zonas
- **DoorDash:** No hay límite, pero hay ranking y visibilidad preferencial

---

### 61. ¿Hay exclusividad territorial para algunos locales?

**¿Por qué es importante?**
- Incentiva a locales premium
- Afecta la competencia
- Define acuerdos comerciales

**Caso práctico:**
Un local premium quiere exclusividad en una zona a cambio de mejores comisiones. Si se permite, tiene ventaja competitiva. Si no, compite con todos.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Negocios** negocia acuerdos

**¿Qué pasa si no lo controlamos?**
- Sin incentivos para locales premium
- O competencia desleal
- Pérdida de oportunidades comerciales

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Exclusividad por categoría en algunas zonas
- **Rappi:** Exclusividad para locales premium
- **DoorDash:** Exclusividad por categoría en zonas específicas

---

### 62. ¿Qué pasa si dos locales tienen el mismo nombre?

**¿Por qué es importante?**
- Previene confusión
- Protege identidad de marca
- Define resolución de conflictos

**Caso práctico:**
Dos locales se llaman "Pizza Express" en la misma zona. Los clientes pueden confundirse. ¿Se permite? ¿Se requiere diferenciación?

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo Legal** valida marcas registradas

**¿Qué pasa si no lo controlamos?**
- Confusión de clientes
- Problemas legales
- Pérdida de identidad de marca

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Requiere diferenciación (ej: "Pizza Express - Roma" vs "Pizza Express - Condesa")
- **Rappi:** Requiere diferenciación por ubicación
- **DoorDash:** Requiere diferenciación o rechaza si hay conflicto

---

### 63. ¿Los locales pueden cambiar su información (dirección, teléfono) después de registrarse?

**¿Por qué es importante?**
- Permite actualizaciones
- Afecta la verificación
- Define procesos

**Caso práctico:**
Un local se muda a otra dirección. Si puede cambiar su información, se actualiza. Si no puede, queda con información incorrecta.

**Quién lo resuelve:**
- **Product Owner** define la política
- **Equipo de Operaciones** valida el proceso

**¿Qué pasa si no lo controlamos?**
- Información desactualizada
- Clientes confundidos
- Pérdida de calidad de datos

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Puede cambiar, pero requiere re-verificación
- **Rappi:** Puede cambiar, pero requiere aprobación
- **DoorDash:** Puede cambiar, pero requiere re-verificación de dirección

---

### 64. ¿Hay un proceso de "prueba" o "beta" para nuevos locales antes de lanzamiento completo?

**¿Por qué es importante?**
- Permite validación
- Reduce riesgos
- Mejora la calidad

**Caso práctico:**
Un nuevo local quiere unirse. Si hay proceso de prueba (ej: 10 pedidos de prueba), se valida que puede operar bien antes de lanzamiento completo.

**Quién lo resuelve:**
- **Product Owner** define el proceso
- **Equipo de Operaciones** implementa

**¿Qué pasa si no lo controlamos?**
- Locales que no pueden operar bien desde el inicio
- Mala experiencia del cliente
- Pérdida de calidad

**Cómo lo resuelven otras aplicaciones:**
- **Uber Eats:** Proceso de onboarding con pedidos de prueba
- **Rappi:** Período de prueba de 1 semana
- **DoorDash:** Proceso de onboarding con validación

---

**Última actualización:** Noviembre 2025  
**Estado:** Documento de referencia para Product Owner

