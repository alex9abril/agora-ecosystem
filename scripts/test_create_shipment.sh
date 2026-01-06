#!/bin/bash

# ============================================================================
# Script de prueba para crear shipment manualmente
# ============================================================================
# Uso: ./scripts/test_create_shipment.sh <ORDER_ID> <AUTH_TOKEN>
#
# Ejemplo:
#   ./scripts/test_create_shipment.sh f811ab23-8b73-4230-ba5b-ca7aad626454 "tu_token_aqui"
# ============================================================================

ORDER_ID=${1:-"f811ab23-8b73-4230-ba5b-ca7aad626454"}
AUTH_TOKEN=${2:-""}
API_URL=${NEXT_PUBLIC_API_URL:-"http://localhost:3000/api"}

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Error: Se requiere un token de autenticación"
    echo "Uso: $0 <ORDER_ID> <AUTH_TOKEN>"
    exit 1
fi

echo "🚚 Creando shipping label para orden: $ORDER_ID"
echo "📡 Endpoint: $API_URL/logistics/shipping-labels"
echo ""

curl -X POST "$API_URL/logistics/shipping-labels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"packageWeight\": 1.0,
    \"packageDimensions\": \"30x20x15 cm\",
    \"declaredValue\": 100.00
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "✅ Solicitud completada"
echo ""
echo "Para verificar el resultado, ejecuta:"
echo "  SELECT * FROM orders.shipping_labels WHERE order_id = '$ORDER_ID';"

