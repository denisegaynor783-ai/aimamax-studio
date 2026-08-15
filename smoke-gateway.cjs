const puppeteer = require("puppeteer-core");
const fs = require("fs");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "https://ninedeerselect.com";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/THREE.WebGLRenderer|WebGL|GPU stall|deprecated/i.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(URL + "/#/login", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  // 登录页应有「微信登录」按钮
  const hasWechat = await page.evaluate(() => document.body.innerText.includes("微信登录"));

  // 进入设置网关页
  await page.goto(URL + "/#/settings?tab=gateway", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const hasGateway = await page.evaluate(() => document.body.innerText.includes("API 网关") && document.body.innerText.includes("拉取模型目录"));

  console.log("BOOT_ERRORS=" + errors.length);
  errors.slice(0, 8).forEach((e) => console.log("  ! " + e));
  console.log("WECHAT_BTN=" + hasWechat);
  console.log("GATEWAY_TAB=" + hasGateway);
  await browser.close();
  process.exit(errors.length > 0 || !hasWechat || !hasGateway ? 1 : 0);
})().catch((e) => {
  console.error("SMOKE_FAIL", e);
  process.exit(2);
});
