import { Browser, sleep } from '../../../.agents/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const out = 'docs/research/scene-proportions';
const url = process.env.QA_URL || 'http://localhost:4337/scene-preview/';
mkdirSync(out, { recursive: true });
const browser = await Browser.launch({ extraArgs: ['--no-sandbox'] });
const results = [];
const ready = page => page.eval(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
});
const measure = () => [...document.querySelectorAll('.chapter')].map(chapter => {
  const copy = chapter.querySelector('.chapter-copy').getBoundingClientRect();
  const art = chapter.querySelector('.chapter-art').getBoundingClientRect();
  const heading = chapter.querySelector('h1,h2');
  const visibleWidth = Math.max(0, Math.min(innerWidth, art.right) - Math.max(0, art.left));
  const visibleHeight = Math.max(0, Math.min(innerHeight, art.bottom) - Math.max(0, art.top));
  return {
    id: chapter.id, active: !chapter.inert,
    copy: { x: copy.x, y: copy.y, width: copy.width, height: copy.height, bottom: copy.bottom },
    art: { x: art.x, y: art.y, width: art.width, height: art.height },
    visibleImageArea: visibleWidth * visibleHeight / (innerWidth * innerHeight),
    headingSize: getComputedStyle(heading).fontSize,
    continuationSize: chapter.querySelector('.chapter-title-continuation') && getComputedStyle(chapter.querySelector('.chapter-title-continuation')).fontSize,
    textSize: getComputedStyle(chapter.querySelector('.chapter-text')).fontSize,
    loaded: chapter.querySelector('.chapter-art img').naturalWidth > 0,
  };
});

try {
  for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ width, height, mobile: width === 390 });
    const networkFailures = [];
    await page.send('Network.enable');
    browser.on(page.sessionId, 'Network.responseReceived', ({ response }) => {
      if (response.status >= 400) networkFailures.push({ url: response.url, status: response.status });
    });
    await page.goto(url);
    await ready(page);
    const ids = await page.eval(() => [...document.querySelectorAll('.chapter')].map(c => c.id));
    const shots = [];
    for (const id of ids) {
      await page.eval(id => document.querySelector(`.chapter-dots a[href="#${id}"]`).click(), id);
      await sleep(1600);
      await page.eval(() => document.activeElement?.blur());
      const path = `${out}/${width}-${id}.png`;
      await page.screenshot({ path, format: 'png' });
      shots.push(path);
      const data = (await page.eval(measure)).find(chapter => chapter.id === id);
      results.push({ mode: 'live', width, height, ...data });
    }
    for (const fraction of [.35, .65]) {
      await page.eval(f => scrollTo(0, innerHeight * 1.15 * (2 + f)), fraction);
      await sleep(800);
      await page.screenshot({ path: `${out}/${width}-transition-${fraction}.png`, format: 'png' });
    }
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await sleep(1600);
    const keyboardHome = await page.eval(() => document.querySelector('.chapter-status').textContent);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
    await sleep(1600);
    const keyboardEnd = await page.eval(() => document.querySelector('.chapter-status').textContent);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const focus = await page.eval(() => ({ text: document.activeElement.textContent, outline: getComputedStyle(document.activeElement).outlineStyle }));
    const paths = await page.eval(() => [...document.querySelectorAll('img,script[src],link[href]')]
      .map(element => element.currentSrc || element.src || element.href)
      .filter(path => path.startsWith(location.origin) && !new URL(path).pathname.startsWith('/scene-preview/')));
    results.push({ width, height, keyboardHome, keyboardEnd, focus, paths, consoleErrors: page.consoleErrors, networkFailures,
      overflow: await page.eval(() => document.documentElement.scrollWidth > innerWidth) });
    const thumbWidth = width === 390 ? 260 : 560;
    const thumbHeight = Math.round(height * thumbWidth / width);
    const layers = await Promise.all(shots.map(async (file, index) => ({ input: await sharp(file).resize(thumbWidth, thumbHeight).png().toBuffer(), left: index % 3 * thumbWidth, top: Math.floor(index / 3) * thumbHeight })));
    await sharp({ create: { width: thumbWidth * 3, height: thumbHeight * 2, channels: 3, background: '#d7e4ea' } }).composite(layers).jpeg({ quality: 90 }).toFile(`${out}/${width}-all.jpg`);
    await page.close();
  }
  for (const mode of ['reduced', 'no-js']) {
    const page = await browser.newPage({ width: 390, height: 844, mobile: true, reducedMotion: mode === 'reduced' });
    if (mode === 'no-js') await page.send('Emulation.setScriptExecutionDisabled', { value: true });
    await page.goto(url);
    await ready(page);
    results.push({ mode, ...(await page.eval(() => ({
      live: document.querySelector('.journey').classList.contains('is-live'),
      overflow: document.documentElement.scrollWidth > innerWidth,
      chapters: [...document.querySelectorAll('.chapter')].map(chapter => ({
        id: chapter.id, inert: chapter.inert, visible: getComputedStyle(chapter).visibility,
        textHeight: chapter.querySelector('.chapter-copy').getBoundingClientRect().height,
        imageLoaded: chapter.querySelector('.chapter-art img').naturalWidth > 0,
      })),
    }))), consoleErrors: page.consoleErrors });
    for (const id of ['start', 'ascent', 'conversation']) {
      await page.eval(id => document.getElementById(id).scrollIntoView(), id);
      await page.screenshot({ path: `${out}/${mode}-${id}.png`, format: 'png' });
    }
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results.filter(result => result.mode !== 'live'), null, 2));
if (results.some(result => result.overflow || result.loaded === false || result.chapters?.some(chapter => !chapter.imageLoaded) || result.consoleErrors?.length || result.networkFailures?.length || result.paths?.length)) process.exitCode = 1;
