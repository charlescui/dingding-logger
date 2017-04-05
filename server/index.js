#!/usr/bin/env node

/**
 * 
 * 钉钉机器人-日志报警WebAPI
 * 
 * 启动服务的环境变量:
 *  dingding.bot: 钉钉机器人的API URL
 * 
 * curl -d '### 诗一首\n- 青山隐隐水迢迢\n- 我带宝宝来游郊\n\n大家说:"`好诗，不得了的好！`"\n\n![杭州长乐水库](https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1491231263657&di=c58b8669bbdc4515e142075bc42ccbdc&imgtype=0&src=http%3A%2F%2Fdimg02.c-ctrip.com%2Fimages%2Ffd%2Ftg%2Fg2%2FM0B%2F1E%2F78%2FCghzf1VZjoyATeYRAAMhym5-Ehw036_D_640_360.jpg)' http://localhost:3000/log
 * 
 */

//HTTP Client
var request = require('request');
var express = require('express');
var Redis = require('redis');
var http = require('http');
var _ = require('underscore');
var app = express();
var redisClient = Redis.createClient(process.env['REDIS']);
var bodyParser = require('body-parser')


var LOGBUFFER = "DingDing:LogBuffer"
// 换行符处理
// JSON.stringify的时候，换行符会被当成\\n转义掉，导致变成字符串，而不是真正的换行符
// 需要手工将换行符转换成特殊字符串，等JSON.stringify之后，再转换回来
var MAGICLINE = "8237529"
var REGMAGICLINE = new RegExp(MAGICLINE, 'g');

// 初始化server
/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || 3000);
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

_.each(['SIGINT', 'SIGTERM'], function (element) {
    process.on(element, function () {
        server.close(function () {
            process.exit(0);
        });
    })
})

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
        case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
        default:
        throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

app.use(function(req, res, next) {
  req.rawBody = "";
  req.setEncoding('utf8');

  req.on('data', function(chunk) { 
    req.rawBody += chunk.replace(/\\n/g, MAGICLINE);
  });

  req.on('end', function() {
    next();
  });
});

//---------------------------遵循SpringBootActuator的Endpoints-----------------------------------------

//Eureka注册信息回调接口
//info
app.get("/info", function(req, res, next) {
    res.send({});
});
//Eureka注册信息回调接口
//health
app.get("/health", function(req, res, next) {
    res.send({
        description: "Ongo Monitor Server",
        status: "UP"
    });
});
//使用web api温柔的关闭
//避免该web实例的信息残留在集群中
app.post("/shutdown", function(req, res, next) {
    global.config.spring.gracefulExit();
    res.send({
        description: "will shutdown gracefully"
    });
});

app.post("/log", function(req, res) {
    if(req.rawBody) {
        redisClient.lpush(LOGBUFFER, req.rawBody, function(err, replies){
            console.log(replies + " replies");
            if(err){
                res.send({
                    msg: "error"
                });
            }else{
                res.send({
                    msg: "ok"
                });
            }
        })
    }
});

// https://dingtalk.taobao.com/docs/doc.htm?spm=a219a.7629140.0.0.zs6VW5&treeId=257&articleId=105735&docType=1
//
// {
//      "msgtype": "markdown",
//      "markdown": {
//          "title":"杭州天气",
//          "text": "#### 杭州天气\n" +
//                  "> 9度，西北风1级，空气良89，相对温度73%\n\n" +
//                  "> ![screenshot](http://image.jpg)\n"  +
//                  "> ###### 10点20分发布 [天气](http://www.thinkpage.cn/) \n"
//      }
//  }

var fetchContent = function(n, arr, callback){
    if(n > 0){
        redisClient.lpop(LOGBUFFER, function(error, reply){
            if(reply){
                arr.push(reply);
                fetchContent(n-1, arr, callback);
            }
        });
    }else{
        callback(arr);
    }
}

var bufferPackage = function(callback){
    redisClient.llen(LOGBUFFER, function(error, size){
        if(size > 0){
            var replies = [];
            fetchContent(size, replies, function(replies){
                console.log("replies : "+replies.length);

                var markdown = {
                    "msgtype": "markdown",
                    "markdown": {
                        "title": "LoggerBot",
                        "text": replies.join('\n\n')
                    }
                }
                callback(markdown)
            })
        }
    });
}

setInterval(function(){
    bufferPackage(function(content){
        // console.log(content['markdown']['text']);
        var options = {
            url: process.env['DINGDING'],
            headers: {
                "Content-Type": "application/json"
            },
            // 格式处理
            // 将MAGICLINE换成换行符，否则Markdown的格式就乱了，Markdown需要正确的换行符
            body: JSON.stringify(content).replace(REGMAGICLINE, "\n")
        };
        request.post(options, function(error, response, body){
            console.log(body);
            if(error){
                console.log("Error from dingding: "+body);
            }
        });
    })
}, 3000)