# Etap 1: Budowanie frontendu
FROM node:18-alpine AS build
WORKDIR /app

# Kopiowanie package.json i instalacja zależności
COPY package*.json ./
RUN npm install

# Kopiowanie reszty plików aplikacji
COPY . .

# Budowanie aplikacji
RUN npm run build

# Etap 2: Serwowanie przez Nginx
FROM nginx:alpine

# Kopiowanie certyfikatów SSL
COPY nginx/ssl/server.crt /etc/nginx/ssl/server.crt
COPY nginx/ssl/server.key /etc/nginx/ssl/server.key

# Kopiowanie zbudowanego frontendu z etapu 'build'
COPY --from=build /app/dist /usr/share/nginx/html

# Kopiowanie konfiguracji Nginx
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 443 80
CMD ["nginx", "-g", "daemon off;"]
