# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web Prompter - 一个基于 Next.js 16 的提词器应用，支持三种使用模式：
- **客户端模式** (`/client`)：手机/平板作为遥控器
- **服务端模式** (`/server`)：大屏幕显示提词器
- **单机模式** (`/standalone`)：本机直接使用，无需连接

核心特性：使用 WebRTC P2P 通信实现遥控器和服务端之间的实时控制。

## Common Commands

```bash
# 开发
npm run dev              # 启动 Next.js 开发服务器 (localhost:3000)
npm run build            # 生产构建
npm run start            # 启动生产服务器
npm run lint             # ESLint 检查

# WebRTC 信令服务器 (单独终端)
npm run signaling        # 启动信令服务器 (localhost:9000)
npm run dev:all          # 同时启动 Next.js 和信令服务器
```

## Architecture

### App Router Structure
```
app/
├── page.tsx              # 首页 - 模式选择
├── client/page.tsx       # 遥控器客户端
├── server/page.tsx       # 提词器显示端
├── standalone/page.tsx   # 单机使用模式
└── layout.tsx           # 根布局
```

### Core Libraries (`lib/`)
- **`webrtc-prompter.ts`**：WebRTC 连接封装类 (`PrompterWebRTCConnection`)
  - 处理 P2P 连接建立、DataChannel 通信
  - 信令通过 Socket.IO 服务器 (`signaling-server.js`) 转发
  - 支持 `prop_change` 消息类型同步提词器状态
- **`atoms.ts`**：Jotai 状态管理
  - `promptPropAtom`：提词器属性（fontSize, content, currentLine, scaleX）
  - `persistentPromptPropAtom`：持久化到 localStorage
- **`socket.ts`**：已废弃，改用 WebRTC

### Component Pattern
- **`Prompter`** (`components/prompter.tsx`)：提词器显示组件
  - 支持 `fullScreen` 属性（默认 true）
  - 支持 `className` 自定义样式
  - 当前行自动滚动到视图中心

### Key Technical Decisions

1. **WebRTC over Socket.IO**：数据通道使用 WebRTC DataChannel，信令用 Socket.IO
2. **Jotai for State**：轻量级状态管理，支持持久化
3. **Room-based Connection**：6位房间号（UUID）匹配客户端和服务端
4. **QR Code Connection**：服务端显示二维码，客户端扫码快速连接

### Environment Variables
- `NEXT_PUBLIC_SIGNALING_URL`：信令服务器地址（默认 `http://localhost:9000`）
- 开发环境配置：`.env.development`
- 生产环境配置：`.env.production`

## Development Patterns

### Adding New Features
1. 页面组件放在 `app/` 目录下（App Router）
2. 可复用组件放在 `components/` 目录
3. 工具类和状态管理放在 `lib/` 目录
4. 使用 TypeScript 类型定义接口（如 `PromptProp`）

### WebRTC Integration
- 创建 `PrompterWebRTCConnection` 实例
- 配置 `isInitiator: true/false` 区分发起者/接收者
- 通过 `onPropUpdate` 回调处理状态同步
- 使用 `sendPropChange()` 发送控制指令

### State Management
- 使用 Jotai atoms 进行状态管理
- 通过 `useAtom` hook 读写状态
- 状态自动持久化到 localStorage

## Important Files

- **`signaling-server.js`**：WebRTC 信令服务器，必须运行才能建立 P2P 连接
- **`next.config.ts`**：Next.js 配置（图片域名、环境变量等）
- **`components.json`**：shadcn/ui 组件配置
