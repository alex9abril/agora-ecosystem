# Proceso de Seguimiento de Pedidos y Políticas de Postventa

## 📋 Resumen Ejecutivo

Este documento define el ciclo de vida completo de un pedido desde su creación hasta su entrega, incluyendo las reglas de negocio para transiciones entre estados, políticas de cancelación, devolución y reembolso, y las modificaciones necesarias en la base de datos para soportar estos procesos.

---

## 📊 Diagrama de Flujo de Estados del Pedido

```mermaid
stateDiagram-v2
    [*] --> pending: Cliente crea pedido
    
    pending --> confirmed: Pago verificado<br/>(payment_status = 'paid')
    pending --> cancelled: Cliente/Negocio cancela
    
    confirmed --> preparing: Negocio inicia preparación
    confirmed --> cancelled: Cliente/Negocio cancela<br/>(antes de preparing)
    
    preparing --> ready: Negocio marca como listo
    preparing --> cancelled: Negocio cancela<br/>(antes de ready)
    
    ready --> assigned: Asignar a repartidor<br/>(entrega a domicilio)
    ready --> delivered: Recogida en tienda<br/>(cliente/negocio confirma)
    ready --> cancelled: Cancelación tardía<br/>(solo negocio con justificación)
    
    assigned --> picked_up: Repartidor recoge pedido
    assigned --> cancelled: Cancelación excepcional<br/>(solo sistema/admin)
    
    picked_up --> in_transit: Repartidor inicia ruta
    picked_up --> cancelled: Cancelación excepcional<br/>(solo sistema/admin)
    
    in_transit --> delivered: Repartidor entrega<br/>(cliente confirma)
    in_transit --> cancelled: Cancelación excepcional<br/>(solo sistema/admin)
    
    delivered --> refunded: Reembolso por devolución<br/>(dentro de plazo)
    delivered --> [*]: Pedido completado
    
    cancelled --> refunded: Reembolso por cancelación<br/>(si pago procesado)
    cancelled --> [*]: Cancelación sin reembolso
    
    refunded --> [*]: Proceso finalizado
    
    note right of pending
        Estado inicial
        Esperando confirmación
        y pago
    end note
    
    note right of confirmed
        Pago verificado
        Stock reservado
        Notificaciones enviadas
    end note
    
    note right of ready
        Punto de bifurcación:
        - Entrega a domicilio
        - Recogida en tienda
    end note
    
    note right of delivered
        Pedido completado
        Habilitar reseñas
        Iniciar período de devolución
    end note
    
    note right of cancelled
        Puede ocurrir en
        cualquier momento
        antes de delivered
    end note
    
    note right of refunded
        Requiere:
        - Estado cancelled o delivered
        - Pago procesado
        - Proceso de reembolso completado
    end note
```

### Leyenda del Diagrama

- **Flechas negras**: Transiciones normales del flujo
- **Flechas rojas**: Transiciones de cancelación
- **Flechas verdes**: Transiciones de reembolso
- **Notas**: Información adicional sobre estados clave

---

## 🎯 Estados del Pedido (Order Status)
