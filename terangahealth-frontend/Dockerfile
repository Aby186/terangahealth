FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN sed -i "s#http://127.0.0.1:8000/api#/api#" src/environments/environment.ts \
    && grep -q "apiUrl: '/api'" src/environments/environment.ts
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/terangahealth-frontend/browser /usr/share/nginx/html
EXPOSE 80