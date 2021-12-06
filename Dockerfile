ARG VERSION=14

# First stage: build.
FROM mhart/alpine-node:${VERSION} AS build

COPY package.json package-lock.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install

COPY . .

RUN npm run build

# Second stage: run.
FROM mhart/alpine-node:${VERSION}

WORKDIR /usr/src/app
COPY package.json package-lock.json /usr/src/app/

ARG PSQL_VERSION=0
RUN if [ "$PSQL_VERSION" = "13" ]; then \
        echo "http://dl-cdn.alpinelinux.org/alpine/v3.14/main" >> /etc/apk/repositories; \
    elif [ "$PSQL_VERSION" = "12" ]; then \
        echo "http://dl-cdn.alpinelinux.org/alpine/v3.12/main" >> /etc/apk/repositories; \
    elif [ "$PSQL_VERSION" = "11" ]; then \
        echo "http://dl-cdn.alpinelinux.org/alpine/v3.10/main" >> /etc/apk/repositories; \
    elif [ "$PSQL_VERSION" = "10" ]; then \
            echo "http://dl-cdn.alpinelinux.org/alpine/v3.8/main" >> /etc/apk/repositories; \
    fi
RUN apk update
RUN apk --no-cache add postgresql-client &&\
    npm i --production

COPY --from=build /usr/src/app/dist dist

ENTRYPOINT ["npm", "run", "start:prod"]