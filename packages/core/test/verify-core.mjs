import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5301/packages/core/test/smoke.html';
const errors = [];
const results = [];
const check = (name, ok, extra = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch({ channel: 'chrome', args: ['--headless=new'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check('engine mounted canvas', await page.evaluate(() => !!document.querySelector('.ne-root canvas')));
const ui = await page.evaluate(() => ({
  palette: !!document.querySelector('.ne-palette'),
  toolbar: document.querySelectorAll('.ne-toolbar-btn').length === 6,
  trash: !!document.querySelector('.ne-delete-zone'),
  typeEditor: !!document.querySelector('.ne-type-editor'),
}));
check('shell UI present', Object.values(ui).every(Boolean), JSON.stringify(ui));

// exportJson via API
const exported = await page.evaluate(() => window.__engine.exportJson());
check('exportJson has graph', Array.isArray(exported?.graph?.nodes) && exported.graph.nodes.length >= 9, `nodes=${exported?.graph?.nodes?.length}`);

// theme toggle rebuilds without losing nodes
await page.evaluate(() => window.__engine.toggleTheme());
await page.waitForTimeout(800);
const afterTheme = await page.evaluate(() => window.__engine.exportJson().graph.nodes.length);
check('theme toggle preserves nodes', afterTheme === exported.graph.nodes.length, `${afterTheme}`);
check('light theme attr', await page.evaluate(() => document.querySelector('.ne-root').getAttribute('data-ne-theme') === 'light'));

// importJson round-trip: clear then re-import same data
await page.evaluate((data) => window.__engine.importJson(data), exported);
await page.waitForTimeout(600);
const afterImport = await page.evaluate(() => window.__engine.exportJson().graph.nodes.length);
check('importJson round-trip', afterImport === exported.graph.nodes.length, `${afterImport}`);

// drag from palette adds node
const beforeCount = await page.evaluate(() => window.__engine.exportJson().graph.nodes.length);
const item = await page.locator('.ne-palette-item').nth(1).boundingBox();
await page.mouse.move(item.x + 20, item.y + item.height / 2);
await page.mouse.down();
await page.mouse.move(640, 420, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(400);
const afterCount = await page.evaluate(() => window.__engine.exportJson().graph.nodes.length);
check('palette drag adds node', afterCount === beforeCount + 1, `${beforeCount} -> ${afterCount}`);

// change event fires on mutation
const gotChange = await page.evaluate(async () => {
  let fired = false;
  const off = window.__engine.on('change', () => { fired = true; });
  window.__engine.reorderNodes();
  off();
  return fired;
});
check('change event fires', gotChange);

// destroy cleans DOM and stops rAF
await page.evaluate(() => window.__engine.destroy());
await page.waitForTimeout(300);
check('destroy removes root', await page.evaluate(() => !document.querySelector('.ne-root')));

console.log(results.join('\n'));
console.log('--- console/page errors:', errors.length);
errors.slice(0, 6).forEach((e) => console.log('ERR:', e.slice(0, 180)));
await browser.close();
