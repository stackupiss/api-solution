FROM node:latest

ENV APP_PORT=3000 APP_ROOT=/app

WORKDIR ${APP_ROOT}

ADD citiesdb.js .
ADD local_main.js .
ADD package.json .
ADD package-lock.json .
ADD zipsdb.js .
ADD zips.js .

ADD schema schema

RUN [ "npm", "install" ]

EXPOSE ${APP_PORT}

ENTRYPOINT [ "node", "local_main.js" ]

CMD [ "" ]
