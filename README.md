# QQ 农场多账号挂机 + Web 面板
- 默认账号密码都是admin，端口3007，请部署登录后尽快修改密码！

## Docker 部署（拉取不了镜像直接下载压缩包解压即可）
```
# 进入目录
cd /qq-farm-automation-bot-main

# 构建并后台启动
docker compose -f docker-compose.yml up -d --build

# 查看日志
docker compose logs -f

# 停止并移除容器
docker compose down

# 浏览器访问http://你的IP:3007
```



## 登录与安全

- 面板首次访问需要登录
- 默认管理账号：`admin/admin`
- **建议部署后立即修改为强密码**



## 免责声明

本项目仅供学习与研究用途。使用本工具可能违反游戏服务条款，由此产生的一切后果由使用者自行承担。
