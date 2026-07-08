#!/bin/bash
# N.E.X.O. — Test del cron de decay en local
#
# Uso:
#   chmod +x scripts/test-nexo-decay.sh
#   ./scripts/test-nexo-decay.sh
#
# Requiere que el dev server esté corriendo (npm run dev)
# y que CRON_SECRET esté en .env.local

set -e

# Leer CRON_SECRET de .env.local
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local 2>/dev/null | cut -d'=' -f2)

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET no encontrado en .env.local"
  echo "   Ejecuta: echo 'CRON_SECRET=\$(openssl rand -base64 32)' >> .env.local"
  exit 1
fi

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 N.E.X.O. Decay Test → ${BASE_URL}/api/nexo/decay"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "${BASE_URL}/api/nexo/decay" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP: $HTTP_STATUS"
echo "Respuesta:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ Decay completado"
else
  echo ""
  echo "❌ Error — revisa los logs del dev server"
  exit 1
fi
