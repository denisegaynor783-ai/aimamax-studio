// 生产冒烟：加载线上站点，收集致命 console 错误（忽略 GPU/THREE 头）
const puppeteer = require("/Users/laoba/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text();
      if (/WebGL|GPU|THREE|swiftshader|Failed to load resource.*favicon/i.test(t)) return;
      errors.push(t);
    }
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("https://ninedeerselect.com", { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const root = document.getElementById("root");
    return {
      title: document.title,
      rootChildren: root ? root.children.length : 0,
      bodyText: (document.body.innerText || "").slice(0, 200),
      hasCanvas: !!document.querySelector("canvas"),
    };
  });

  console.log("TITLE:", info.title);
  console.log("ROOT_CHILDREN:", info.rootChildren);
  console.log("HAS_CANVAS:", info.hasCanvas);
  console.log("BODY_SNIPPET:", JSON.stringify(info.bodyText));
  console.log("FATAL_ERRORS:", errors.length);
  errors.slice(0, 10).forEach((e) => console.log("  -", e));

  await browser.close();
  process.exit(errors.length > 0 ? 2 : 0);
})().catch((e) => {
  console.error("SMOKE_FAIL:", e.message);
  process.exit(3);
});
