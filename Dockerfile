FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src/assets ./src/assets
RUN npm install --silent
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
