FROM node:14.13.1-stretch as builder

COPY package.json package-lock.json ./

# Storing node modules on a separate layer will prevent unnecessary npm install at each build
RUN npm set progress=false && \
    npm config set depth 0 && \
    npm cache clean --force && \
    npm config set unsafe-perm true

RUN npm i && mkdir /ng-app && cp -R ./node_modules ./ng-app

WORKDIR /ng-app

COPY . .

RUN $(npm bin)/ng build --prod

### Stage 2: Setup ###

FROM nginx

COPY default.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /ng-app/dist/alloy /usr/share/nginx/html
COPY --from=builder /ng-app/nginx-basehref.sh /docker-entrypoint.d/90-basehref.sh

# Build Angular app in production mode and store artifacts in dist folder
RUN rm -f ./src/assets/config/settings.env.json

ENTRYPOINT ["nginx", "-g", "daemon off;"]
