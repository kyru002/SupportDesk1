# Dockerfile para Proyecto Completo

# --- Etapa 1: Build del Frontend (Vue) ---
FROM node:20-alpine as build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Etapa 2: Backend y Servidor Final ---
FROM node:20-alpine
WORKDIR /app

# Instalar PM2 globalmente
RUN npm install -g pm2

# Copiar archivos del Backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install
COPY backend/ ./

# Copiar el frontend compilado al directorio de estáticos del backend (opcional o servirlos por Nginx)
COPY --from=build-frontend /app/frontend/dist /app/frontend/dist

# Exponer puertos
EXPOSE 5001

# Comando por defecto usando PM2 Ecosystem
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
