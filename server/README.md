# AIMAMAX API（后端）

独立 Node 后端，承载四块能力：

1. **ToAPIs 统一模型网关代理** — `POST /api/v1/generate`（文本/图像/视频）+ `GET /api/v1/models`（全模型目录）。密钥后端保管，SPA 不直接暴露。
2. **微信登录** — `GET /api/auth/wechat/login` → 微信 OAuth → `/callback` 换码发 JWT。未配置走 Demo 回调。
3. **微信支付** — `POST /api/pay/create`（下单）、`/api/pay/simulate`（演示支付成功）、`/api/pay/notify`（异步回调）、`/api/pay/query`（查单）。未配置商户号走 Demo。
4. **占位 + Demo 回退** — 无 ToAPIs 密钥时生成接口返回占位结果（零额度），不影响画布跑通。

> **零依赖**：仅用 Node 内置模块（`http` / `crypto` / `url`）。**无需 `npm install`**，Passenger 直接用系统 Node 运行 `passenger.js`。

## 本地开发

```bash
cd server
cp .env.example .env   # 按需填写（也可不填，默认 Demo 模式）
node app.js            # 默认 http://localhost:3000
```

冒烟：

```bash
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/v1/generate -H 'Content-Type: application/json' -d '{"kind":"text","prompt":"测试"}'
curl http://localhost:3000/api/v1/models
```

## Hostinger 部署（Passenger，零依赖）

1. 在 hPanel 添加子域 `api.ninedeerselect.com`，文档根指向 `~/aimamax-api`。
2. 上传 `server/` 下全部文件到 `~/aimamax-api`（含 `app.js` / `passenger.js` / `lib/` / `package.json` / `README.md`）。**无需上传 node_modules**（零依赖）。
3. Node.js 应用设置：启动文件 `passenger.js`，Node 版本选 20（系统路径 `/opt/alt/alt-nodejs20/root/usr/bin/node`）。
4. 在 hPanel「环境变量」或 `~/aimamax-api/.env` 填入变量：
   - `TOAPIS_KEY=...`（填了即走真实 ToAPIs 模型；留空=Demo 占位）
   - `ALLOW_ANON=0`（生产强制微信登录；演示期可设 `1`）
   - `JWT_SECRET=<随机长串>`、`FRONTEND_URL=https://ninedeerselect.com`
   - `WECHAT_APPID=` / `WECHAT_SECRET=`（微信登录真实凭证）
   - `WXPAY_MCH_ID=` / `WXPAY_API_KEY=`（微信支付真实凭证）
5. 访问 `https://api.ninedeerselect.com/api/health` 验证。

> SPA 默认指向 `https://api.ninedeerselect.com`。该子域未配置前，SPA 调后端会失败并**自动回退本地 Demo**，不影响使用；子域与 Passenger 配置好后即自动走真实后端。

## 前端接入

- 设置页「API 网关」标签：填 API 基址 → 连接测试 → 拉取模型目录（写入 ToAPIs 供应商）。关闭 Demo 模式即走后端真实模型。
- 登录页「微信登录」按钮：整页跳转 `/api/auth/wechat/login`，回调落地带 `?token=` 自动保存 JWT。
- 生成链路：`providers.generate()` 在 `apiBase` 已配置且非 Demo 时，优先转发后端 `/api/v1/generate`，失败回退本地 Demo。
