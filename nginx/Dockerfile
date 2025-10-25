FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --silent || npm install --silent
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/ssl /etc/nginx/ssl
EXPOSE 80 443
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;' "]
