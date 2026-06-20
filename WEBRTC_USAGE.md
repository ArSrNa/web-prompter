# WebRTC 提词器应用 - 使用指南

## 🎉 改造完成

提词器应用已成功从 Socket.IO 中心化架构改造为 WebRTC 点对点通信架构！

## 📦 新增文件

### 核心文件
- `signaling-server.js` - WebRTC 信令服务器（监听 9000 端口）
- `lib/webrtc-prompter.ts` - 提词器专用 WebRTC 工具类
- `Dockerfile.signaling` - Signaling Server 的 Docker 配置

### 配置和脚本
- `.env.local` - 环境变量配置
- `package.json` - 新增启动脚本

## 🚀 如何运行

### 方式一：本地开发（推荐）

#### 1. 启动 Signaling Server

打开**终端 1**，运行：
```bash
npm run signaling
```

你应该看到：
```
🚀 WebRTC Signaling Server 启动中...
   端口: 9000
   环境: development
✅ WebRTC 信令服务器运行在 http://0.0.0.0:9000
   健康检查: http://0.0.0.0:9000/health
   等待 P2P 连接建立...
```

#### 2. 启动 Next.js 开发服务器

打开**终端 2**，运行：
```bash
npm run dev
```

#### 3. 使用提词器

1. **打开服务端（提词器显示屏）**：
   - 访问 `http://localhost:3000/server`
   - 页面会自动生成房间号并显示二维码

2. **打开客户端（遥控器）**：
   - 访问 `http://localhost:3000/client`
   - 输入房间号并连接
   - 或使用手机扫描服务端的二维码

3. **开始使用**：
   - 在客户端控制提词器（字体大小、当前行、内容等）
   - 所有控制都通过 WebRTC P2P 连接直接传输

### 方式二：同时启动所有服务

```bash
npm run dev:all
```

这会同时启动 Next.js 开发服务器和 Signaling Server。

### 方式三：使用 Docker 部署 Signaling Server

#### 1. 构建 Docker 镜像

```bash
docker build -f Dockerfile.signaling -t webrtc-signaling .
```

#### 2. 运行容器

```bash
docker run -d -p 9000:9000 \
  -e PORT=9000 \
  -e HOST=0.0.0.0 \
  --name signaling \
  webrtc-signaling
```

#### 3. 检查运行状态

```bash
# 查看日志
docker logs -f signaling

# 健康检查
curl http://localhost:9000/health
```

## 🔧 环境变量配置

在 `.env.local` 文件中配置：

```bash
# Signaling Server URL
NEXT_PUBLIC_SIGNALING_URL=http://localhost:9000

# 生产环境修改为实际地址
# NEXT_PUBLIC_SIGNALING_URL=https://your-signaling-server.com
```

## 📊 架构对比

### 改造前（Socket.IO 中心化）

```
客户端 → Socket.IO 服务器 → 服务端
```

- ❌ 所有数据经过服务器中转
- ❌ 服务器压力大
- ❌ 延迟较高

### 改造后（WebRTC P2P）

```
客户端 ←→ 信令服务器 ←→ 服务端
              ↓
        建立 P2P 连接后
              ↓
客户端 ←――――――→ 服务端 (直接通信)
```

- ✅ 仅信令交换经过服务器
- ✅ 数据直接点对点传输
- ✅ 延迟低，服务器压力小

## 🔍 技术细节

### Signaling Server

- **端口**：9000
- **协议**：WebSocket + Socket.IO
- **功能**：
  - 房间管理
  - Offer/Answer 转发
  - ICE Candidate 转发
  - 用户加入/离开通知

### WebRTC 连接流程

1. 双方连接到 Signaling Server
2. 加入同一个房间
3. 信令服务器通知双方开始连接
4. 发起者创建 Offer → 通过信令转发 → 接收者
5. 接收者创建 Answer → 通过信令转发 → 发起者
6. 双方交换 ICE Candidates
7. P2P 连接建立完成
8. 通过 DataChannel 直接通信

### STUN/TURN 服务器

当前配置使用 Google 公共 STUN 服务器：
```javascript
{ urls: "stun:stun.l.google.com:19302" }
```

生产环境建议添加 TURN 服务器以提高 NAT 穿透成功率。

## 🐛 故障排查

### 问题 1：Signaling Server 连接失败

**症状**：页面显示连接错误

**解决方案**：
- 检查 Signaling Server 是否启动（端口 9000）
- 检查 `.env.local` 中的 `NEXT_PUBLIC_SIGNALING_URL` 是否正确
- 查看浏览器控制台错误信息

### 问题 2：P2P 连接失败

**症状**：双方都加入了房间，但 P2P 连接不成功

**可能原因**：
- NAT 穿透失败（需要 TURN 服务器）
- 防火墙阻止 WebRTC 连接
- 浏览器不支持 WebRTC

**解决方案**：
- 确保使用支持 WebRTC 的现代浏览器
- 本地测试使用 localhost 不受影响
- 生产环境配置 TURN 服务器

### 问题 3：控制指令不生效

**症状**：客户端发送控制指令，但服务端无响应

**解决方案**：
- 检查 P2P 连接是否已建立（查看连接状态）
- 打开浏览器控制台查看错误
- 检查 `lib/webrtc-prompter.ts` 的事件处理

## 📝 开发说明

### 文件结构

```
web-prompter/
├── signaling-server.js        # Signaling Server
├── Dockerfile.signaling        # Docker 配置
├── lib/
│   ├── webrtc-prompter.ts   # WebRTC 工具类（提词器专用）
│   └── webrtc-demo.ts       # WebRTC Demo（测试用）
├── app/
│   ├── server/page.tsx      # 服务端页面（已改造）
│   ├── client/page.tsx      # 客户端页面（已改造）
│   └── webrtc-demo/page.tsx # Demo 页面
├── .env.local                # 环境变量
└── package.json             # 启动脚本
```

### 添加新的控制功能

1. 在 `lib/webrtc-prompter.ts` 中添加新的消息类型
2. 在发送端调用对应的 `send*` 方法
3. 在接收端添加对应的事件处理

示例：
```typescript
// 发送端
webrtc.send({
  type: "new_feature",
  data: data
});

// 接收端
webrtc.onMessage((data) => {
  if (data.type === "new_feature") {
    // 处理新功能
  }
});
```

## 🎯 下一步

### 可选改进

1. **添加 TURN 服务器**
   - 提高 NAT 穿透成功率
   - 推荐：[coturn](https://github.com/coturn/coturn)

2. **连接质量监测**
   - 添加连接状态显示
   - 监测延迟和丢包率

3. **重连机制**
   - P2P 连接断开后自动重连
   - 信令连接断开后自动重连

4. **安全性增强**
   - 房间号验证
   - 连接认证
   - 数据加密

5. **扩展功能**
   - 音视频传输
   - 屏幕共享
   - 多人协作

## 📚 相关文档

- [WebRTC 官方文档](https://webrtc.googlesource.com/src/+/refs/heads/main/docs)
- [Socket.IO 文档](https://socket.io/docs/)
- [Next.js 文档](https://nextjs.org/docs)

## 🤝 贡献

如果你发现问题或有改进建议，欢迎提交 Issue 或 Pull Request！

---

**祝使用愉快！🎉**
