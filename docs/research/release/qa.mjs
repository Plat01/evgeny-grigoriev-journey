// Use an already installed Playwright: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = new URL('./', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const issues = [];
async function inspect(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    loaded: [...document.images].every(i => i.complete && i.naturalWidth > 0),
    chapters: document.querySelectorAll('.chapter').length,
    active: document.querySelector('.chapter-dots [aria-current="step"]')?.getAttribute('href'),
    live: document.querySelector('.journey')?.classList.contains('is-live'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    allReadable: [...document.querySelectorAll('.chapter')].every(s => !s.inert && getComputedStyle(s).visibility === 'visible'),
  }));
}
function watch(page) {
  page.on('pageerror', e => issues.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('requestfailed', r => issues.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) issues.push(`${r.status()} ${r.url()}`); });
}
async function ready(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode()));
  });
  await page.waitForTimeout(500);
}
try {
  for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
    const page = await context.newPage();
    watch(page);
    await ready(page, 'http://127.0.0.1:4380/');
    const shots = [];
    for (const [i, id] of ['start', 'curiosity', 'creation', 'ascent', 'momentum', 'conversation'].entries()) {
      await page.locator(`.chapter-dots a[href="#${id}"]`).click();
      await page.waitForTimeout(1500);
      const state = await inspect(page);
      results.push({ width, chapter: id, ...state });
      assert.equal(state.active, `#${id}`);
      assert.equal(state.overflow, false);
      assert.equal(state.loaded, true);
      assert.equal(state.chapters, 6);
      assert.equal(state.canonical, 'https://grigoriev.expert/');
      assert.equal(state.robots, 'index, follow');
      if ([0, 3, 5].includes(i)) {
        const path = `${out}${width}-${id}.png`;
        await page.screenshot({ path });
        shots.push(path);
      }
    }
    await page.locator('body').click({ position: { x: width - 5, y: 100 } });
    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);
    assert.equal((await inspect(page)).active, '#start');
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(1500);
    assert.equal((await inspect(page)).active, '#curiosity');
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, outline: getComputedStyle(document.activeElement).outlineStyle }));
    results.push({ width, keyboard: { home: 'start', pageDown: 'curiosity', focus } });
    await ready(page, 'http://127.0.0.1:4380/policy/');
    assert.equal((await inspect(page)).overflow, false);
    assert.equal((await inspect(page)).canonical, 'https://grigoriev.expert/policy/');
    assert.equal(await page.locator('article').innerText().then(t => t.includes('https://grigoriev.expert')), true);
    assert.equal(await page.locator('article').innerText().then(t => t.includes('evgenygrigoriev.ru')), false);
    assert.equal(await page.locator('.policy-header a').last().getAttribute('href'), '/');
    await page.screenshot({ path: `${out}${width}-policy.png` });
    const w = width === 390 ? 260 : 480;
    const h = Math.round(height * w / width);
    await sharp({ create: { width: w * 3, height: h, channels: 3, background: '#deebef' } })
      .composite(await Promise.all(shots.map(async (path, i) => ({ input: await sharp(path).resize(w, h).png().toBuffer(), left: w * i, top: 0 }))))
      .png().toFile(`${out}${width}-overview.png`);
    await context.close();
  }
  for (const mode of ['reduced', 'no-js']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference', javaScriptEnabled: mode !== 'no-js' });
    const page = await context.newPage();
    watch(page);
    await ready(page, 'http://127.0.0.1:4380/');
    const state = await inspect(page);
    assert.equal(state.live, false);
    assert.equal(state.allReadable, true);
    assert.equal(state.overflow, false);
    assert.equal(state.loaded, true);
    results.push({ mode, ...state });
    for (const id of ['start', 'ascent', 'conversation']) {
      await page.locator(`#${id}`).evaluate(el => el.scrollIntoView());
      await page.screenshot({ path: `${out}${mode}-${id}.png` });
    }
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  watch(page);
  await ready(page, 'http://127.0.0.1:4381/grigoriev-check/');
  const nested = await inspect(page);
  assert.equal(nested.loaded, true);
  assert.equal(nested.overflow, false);
  assert.equal(nested.robots, 'noindex, nofollow');
  const badPaths = await page.evaluate(() => [...document.querySelectorAll('img,script[src],link[href]')]
    .map(e => e.currentSrc || e.src || e.href).filter(p => p.startsWith(location.origin) && !p.includes('/grigoriev-check/')));
  assert.deepEqual(badPaths, []);
  await ready(page, 'http://127.0.0.1:4381/grigoriev-check/policy/');
  assert.equal(await page.locator('.policy-header a').last().getAttribute('href'), '/grigoriev-check/');
  results.push({ nested: true, ...nested, badPaths });
  assert.deepEqual(issues, []);
  console.log(JSON.stringify({ passed: true, states: results.length, issues }));
} catch (error) {
  issues.push(String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}results.json`, JSON.stringify({ results, issues }, null, 2));
}
