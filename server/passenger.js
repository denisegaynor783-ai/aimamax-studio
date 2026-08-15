// Phusion Passenger 入口（Hostinger Node 应用启动文件）
// Passenger 会注入 process.env.PORT，应用在此端口监听。
const app = require("./app");
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[aimamax-api] passenger listening on ${port}`);
});
