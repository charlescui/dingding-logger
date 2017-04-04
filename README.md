# 钉钉日志机器人

启动依赖的环境变量:
- redis.uri
    - 格式如:
        - redis://127.0.0.1:6379/6
- dingding.bot
    - 格式如:
        - https://oapi.dingtalk.com/robot/send?access_token=xxx

### Usage

在本机测试发送log到钉钉:
- `curl -H "Content-Type: application/json" -d '### 诗一首\n- 青山隐隐水迢迢\n- 我带宝宝来游郊\n\n大家说:"`好诗，不得了的好！`"\n\n![杭州长乐水库](https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1491231263657&di=c58b8669bbdc4515e142075bc42ccbdc&imgtype=0&src=http%3A%2F%2Fdimg02.c-ctrip.com%2Fimages%2Ffd%2Ftg%2Fg2%2FM0B%2F1E%2F78%2FCghzf1VZjoyATeYRAAMhym5-Ehw036_D_640_360.jpg)' http://localhost:3000/log`

钉钉上效果如下:

![顶顶机器人截图测试]()