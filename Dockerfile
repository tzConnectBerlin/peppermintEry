FROM node:18-alpine
WORKDIR /build

RUN apk add postgresql-client

ADD . .
RUN npm install

EXPOSE 5005

ENTRYPOINT node worker/main.mj