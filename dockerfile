FROM node as builder

COPY package.json package-lock.json ./

# Storing node modules on a separate layer will prevent unnecessary npm install at each build
RUN npm set progress=false && \
    npm config set depth 0 && \
    npm cache clean --force && \
    npm config set unsafe-perm true

RUN npm ci && mkdir -p /ng-app/dist/alloy && cp -R ./node_modules ./ng-app

WORKDIR /ng-app

COPY . .

RUN $(npm bin)/ng build --configuration production

### Stage 2: Setup ###

FROM nginxinc/nginx-unprivileged:stable-alpine

USER root
RUN rm -rf /usr/share/nginx/html/*
USER nginx

COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx-basehref.sh /docker-entrypoint.d/90-basehref.sh
COPY --from=builder /ng-app/dist/alloy /usr/share/nginx/html

# Build Angular app in production mode and store artifacts in dist folder
RUN rm -f ./src/assets/config/settings.env.json

EXPOSE 8080

ENTRYPOINT ["nginx", "-g", "daemon off;"]
