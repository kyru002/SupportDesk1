#!/bin/bash

# Script para iniciar la aplicación con videollamadas
# Uso: ./start-app.sh

echo "🚀 Iniciando Proyecto Francisco Aleix con Videollamadas"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar separador
separator() {
  echo ""
  echo "=================================================="
  echo ""
}

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js no está instalado${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js encontrado: $(node --version)${NC}"
echo -e "${GREEN}✓ npm encontrado: $(npm --version)${NC}"

separator

# Instalar dependencias del backend si no existen
if [ ! -d "backend/node_modules" ]; then
  echo -e "${BLUE}📦 Instalando dependencias del backend...${NC}"
  cd backend
  npm install
  cd ..
  echo -e "${GREEN}✓ Dependencias del backend instaladas${NC}"
else
  echo -e "${GREEN}✓ Dependencias del backend ya instaladas${NC}"
fi

separator

# Instalar dependencias del frontend si no existen
if [ ! -d "frontend/node_modules" ]; then
  echo -e "${BLUE}📦 Instalando dependencias del frontend...${NC}"
  cd frontend
  npm install
  cd ..
  echo -e "${GREEN}✓ Dependencias del frontend instaladas${NC}"
else
  echo -e "${GREEN}✓ Dependencias del frontend ya instaladas${NC}"
fi

separator

echo -e "${YELLOW}⚠️  Verificar que ambos procesos se inician correctamente:${NC}"
echo ""
echo -e "${BLUE}Backend debe mostrar:${NC}"
echo -e "  ${GREEN}Servidor ejecutándose en http://localhost:5001${NC}"
echo -e "  ${GREEN}WebSocket disponible en ws://localhost:5001${NC}"
echo ""
echo -e "${BLUE}Frontend debe mostrar:${NC}"
echo -e "  ${GREEN}Local: http://localhost:5173/${NC}"
echo ""

# Crear dos terminales y ejecutar
separator

echo -e "${BLUE}🖥️  Abriendo terminal para Backend...${NC}"
echo ""

# Ejecutar backend en una nueva ventana (macOS/Linux compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open -a Terminal "$(pwd)/backend" -e "cd $(pwd)/backend && npm run dev"
  sleep 2
  
  echo -e "${BLUE}🖥️  Abriendo terminal para Frontend...${NC}"
  open -a Terminal "$(pwd)/frontend" -e "cd $(pwd)/frontend && npm run dev"
else
  # Linux
  gnome-terminal --working-directory="$(pwd)/backend" -- bash -c "npm run dev; read -p 'Press enter to close...'"
  sleep 2
  
  gnome-terminal --working-directory="$(pwd)/frontend" -- bash -c "npm run dev; read -p 'Press enter to close...'"
fi

separator

echo -e "${GREEN}✅ Aplicación iniciando...${NC}"
echo ""
echo -e "${YELLOW}⏱️  Esperar 10-15 segundos para que todo cargue${NC}"
echo ""
echo -e "${BLUE}🌐 Acceder a:${NC}"
echo -e "   ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo -e "   1. Abre http://localhost:5173 en tu navegador"
echo -e "   2. Inicia sesión como técnico o cliente"
echo -e "   3. Selecciona un ticket"
echo -e "   4. Haz clic en botón 'Videollamada'"
echo ""
echo -e "${YELLOW}💡 Para probar videollamada:${NC}"
echo -e "   - Abre dos navegadores/pestañas del mismo ticket"
echo -e "   - Uno inicia la llamada"
echo -e "   - Otro acepta"
echo -e "   - Deberías ver video en ambos"
echo ""
echo -e "${BLUE}🐛 Debug:${NC}"
echo -e "   - Abre DevTools (F12) en navegador"
echo -e "   - Revisa console para logs de Socket.io"
echo -e "   - Tab Network para ver WebSocket connection"
echo ""

echo "Presiona Ctrl+C para detener la aplicación"
