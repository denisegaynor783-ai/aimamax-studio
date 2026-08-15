// 靶向冒烟：验证右击菜单在「添加节点」后自动消失
const puppeteer = require("/Users/laoba/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") { const t = m.text(); if (/WebGL|GPU|THREE|swiftshader|favicon/i.test(t)) return; errors.push(t); } });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("https://ninedeerselect.com", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(3500);

  // 进入画布：新建项目
  const hasNewBtn = await page.evaluate(() => !!Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("新建项目")));
  if (hasNewBtn) {
    await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("新建项目")).click());
    await sleep(800);
    await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("创建并进入画布")).click());
    await sleep(2500);
  }

  const hasCanvas = await page.evaluate(() => !!document.querySelector(".react-flow"));
  console.log("HAS_CANVAS:", hasCanvas);

  // 右击空白处打开浮动菜单
  await page.mouse.click(160, 280, { button: "right" });
  await sleep(600);
  const overlayBefore = await page.evaluate(() => !!document.querySelector(".ctx-overlay"));
  const menuItems = await page.evaluate(() => Array.from(document.querySelectorAll(".node-action-menu__item")).map((e) => e.textContent.trim()));
  console.log("OVERLAY_BEFORE:", overlayBefore);
  console.log("MENU_ITEMS:", JSON.stringify(menuItems.slice(0, 8)));

  // 点击「文本」添加节点
  const clicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll(".node-action-menu__item")).find((e) => e.textContent.trim() === "文本");
    if (el) { el.click(); return true; }
    return false;
  });
  console.log("CLICKED_TEXT:", clicked);
  await sleep(700);

  const overlayAfter = await page.evaluate(() => !!document.querySelector(".ctx-overlay"));
  const nodeCount = await page.evaluate(() => document.querySelectorAll(".react-flow__node").length);
  console.log("OVERLAY_AFTER:", overlayAfter);
  console.log("NODE_COUNT:", nodeCount);

  const pass = overlayBefore && clicked && !overlayAfter && nodeCount >= 1 && errors.length === 0;
  console.log("FATAL_ERRORS:", errors.length);
  errors.slice(0, 8).forEach((e) => console.log("  -", e));
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  process.exit(pass ? 0 : 2);
})().catch((e) => { console.error("SMOKE_FAIL:", e.message); process.exit(3); });
