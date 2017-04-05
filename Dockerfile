FROM node:7

RUN mkdir -p /opt/dingding-logger/server
COPY ./server /opt/dingding-logger/server

WORKDIR /opt/dingding-logger/server
ENV DINGDING https://oapi.dingtalk.com/robot/send?access_token=xxx
ENV REDIS redis://127.0.0.1:6379/6
ENV PORT 8080
ENV NODE_ENV production

EXPOSE 8080

ENTRYPOINT cd /opt/dingding-logger/server && node ./index.js