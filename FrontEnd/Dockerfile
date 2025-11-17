# ============================
# 1) Build con Node
# ============================
FROM node:20-alpine AS build

WORKDIR /app

# Copiar package.json y lock
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el front
COPY . .

# Construir el frontend
RUN npm run build


# ============================
# 2) Nginx para servir el build
# ============================
FROM nginx:alpine

# Remover configuración por defecto
RUN rm -rf /usr/share/nginx/html/*

# Copiar build desde el stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
