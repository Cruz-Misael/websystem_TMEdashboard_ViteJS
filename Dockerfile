# 1. Build da aplicação
FROM node:20-alpine AS build

WORKDIR /app

# Copia arquivos de package e instala dependências
COPY package*.json ./
RUN npm install

# Copia todo o projeto e build
COPY . .
RUN npm run build

# 2. Servir com Nginx
FROM nginx:alpine

# Remove configuração default do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d

# Copia build para o nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
