import { chromium } from "playwright";

const results = [];
const errors = [];
const check = (name, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);

const browser = await chromium.launch({ channel: "chrome", args: ["--headless=new"] });

async function verifyFramework(url, label) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${label}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${label}] ${e}`));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  check(`${label}: canvas mounted`, await page.evaluate(() => !!document.querySelector(".ne-root canvas")));
  check(`${label}: shell UI`, await page.evaluate(() =>
    !!document.querySelector(".ne-palette") &&
    document.querySelectorAll(".ne-toolbar-btn").length === 6 &&
    !!document.querySelector(".ne-delete-zone")));

  // header counter driven by the framework's reactive state (v-model / onChange)
  const countText = await page.evaluate(() => document.querySelector("header")?.textContent ?? "");
  const initialCount = parseInt(countText.match(/nodos:\s*(\d+)/)?.[1] ?? "-1", 10);
  check(`${label}: reactive counter initial`, initialCount >= 9, `count=${initialCount}`);

  // drag a node from the palette -> counter must increment via change event
  const item = await page.locator(".ne-palette-item").nth(1).boundingBox();
  await page.mouse.move(item.x + 20, item.y + item.height / 2);
  await page.mouse.down();
  await page.mouse.move(640, 420, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const afterText = await page.evaluate(() => document.querySelector("header")?.textContent ?? "");
  const afterCount = parseInt(afterText.match(/nodos:\s*(\d+)/)?.[1] ?? "-1", 10);
  check(`${label}: drag adds node (reactive)`, afterCount === initialCount + 1, `${initialCount} -> ${afterCount}`);

  // unmount cleanliness: navigate away and confirm no page errors appeared
  await page.goto("about:blank");
  await page.close();
}

await verifyFramework(process.env.VUE_URL || "http://localhost:5401/", "vue");
await verifyFramework(process.env.REACT_URL || "http://localhost:5402/", "react");
if (process.env.NUXT_URL) await verifyFramework(process.env.NUXT_URL, "nuxt");

console.log(results.join("\n"));
console.log("--- console/page errors:", errors.length);
errors.slice(0, 8).forEach((e) => console.log("ERR:", e.slice(0, 200)));
await browser.close();
process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
