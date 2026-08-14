# AIMAMAX Studio

影院控制台风格的 **AI 影视 / 漫剧导演工作台**（静态 SPA）。

- 无限画布导演台（React Flow）：角色 / 场景 / 分镜 / 资产 / 提示词 / 音乐 / 文本 七类语义节点
- AI 生成抽象：OpenAI 兼容 / ToAPIs / 火山方舟 + 离线 Demo 引擎回退
- 本地持久化（IndexedDB）：项目、资产、设置随浏览器保存
- 一键导出工程 / 分镜表（JSON / CSV）
- 视觉：深空黑 + 胶片橙 + 信号红 + 等宽技术字体

## 技术栈

Vite 5 · React 18 · TypeScript · @xyflow/react v12 · Zustand · idb · HashRouter（永不白屏）

## 本地开发

```bash
npm install
npm run dev        # 本地预览 http://localhost:5173
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
```

## 部署

推送到 `main` 分支即由 GitHub Actions 自动构建并发布到 `gh-pages`，启用 GitHub Pages 后站点可用。
自定义域名 `ninedeerselect.com` 已通过 `public/CNAME` 配置，需在 DNS 处将域名指向 GitHub Pages。

> API 密钥在「设置」页由用户自行填写，仅存于本地浏览器，不随仓库提交。
