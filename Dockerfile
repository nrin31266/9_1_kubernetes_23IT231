FROM node:24-alpine

WORKDIR /app
ARG VERSION=v1
ENV APP_VERSION=${VERSION}
COPY --chown=node:node server.js ./
USER node
EXPOSE 4567
CMD ["node", "server.js"]
