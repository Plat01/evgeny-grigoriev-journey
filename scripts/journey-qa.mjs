import { Browser, sleep } from '../.agents/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const out = 'docs/qa/journey';
mkdirSync(out, { recursive: true });
const url = process.env.QA_URL || 'http://localhost:4321/journey-preview/';
const browser = await Browser.launch({ extraArgs: ['--no-sandbox'] });
const results = [];
try {
  for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ width, height, mobile: width === 390 });
    const failures = [];
    browser.on(page.sessionId, 'Network.loadingFailed', event => failures.push(event.errorText));
    await page.send('Network.enable');
    await page.goto(url, { settleMs: 1600 });
    await page.eval(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    const shots = [];
    for (let chapter = 0; chapter < 7; chapter++) {
      await page.eval(i => document.querySelectorAll('.chapter-dots a')[i].click(), chapter);
      await sleep(1800);
      await page.eval(()=>document.activeElement?.blur());
      const filename = `${out}/${width}-chapter-${chapter}.png`;
      await page.screenshot({ path: filename, format: 'png' });
      shots.push(filename);
      results.push(await page.eval(({chapter, width}) => {
        const section = document.querySelectorAll('.chapter')[chapter];
        const heading = section.querySelector('h1,h2');
        const copy = section.querySelector('.chapter-copy').getBoundingClientRect();
        const art = section.querySelector('.chapter-art').getBoundingClientRect();
        const cs = getComputedStyle(heading);
        return { width, chapter, current: document.querySelector('[aria-current="step"]')?.getAttribute('aria-label'), overflow: document.documentElement.scrollWidth > innerWidth, imageLoaded: [...document.images].every(i => i.complete && i.naturalWidth > 0), headingLines: Math.round(heading.getBoundingClientRect().height / parseFloat(cs.lineHeight)), textBottom: Math.round(copy.bottom), artTop: Math.round(art.top), active: [...document.querySelectorAll('.chapter')].filter(s=>!s.inert).map(s=>s.id), stageTop: Math.round(document.querySelector('.journey-stage').getBoundingClientRect().top), svgCount: document.querySelectorAll('svg').length };
      }, {chapter, width}));
    }
    // Photograph the continuous transition at three fractions of one beat.
    for (const fraction of [.35, .5, .65]) {
      await page.eval(f => window.scrollTo(0, innerHeight * 1.15 * (2 + f)), fraction);
      await sleep(160);
      await page.screenshot({ path: `${out}/${width}-transition-${fraction}.png`, format: 'png' });
    }
    await page.eval(()=>{document.activeElement?.blur(); document.body.focus();});
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await sleep(1700);
    const keyboardHome = await page.eval(()=>document.querySelector('.chapter-status').textContent);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 });
    await sleep(1700);
    const keyboardNext = await page.eval(()=>document.querySelector('.chapter-status').textContent);
    await page.eval(()=>document.querySelector('.chapter-menu summary').click());
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    const escapedMenu = await page.eval(()=>!document.querySelector('.chapter-menu').open);
    results.push({width, consoleErrors:page.consoleErrors, networkFailures:failures, keyboardHome, keyboardNext, escapedMenu, basePaths:await page.eval(()=>[...document.querySelectorAll('img,script[src],link[href]')].map(e=>e.currentSrc||e.src||e.href).filter(p=>p.startsWith(location.origin)&&!p.includes('/journey-preview/')))});
    const thumbW = width === 390 ? 260 : 480;
    const thumbH = Math.round(height * thumbW / width);
    const layers = await Promise.all(shots.map(async (file,i)=>({input:await sharp(file).resize(thumbW,thumbH).png().toBuffer(), left:(i%4)*thumbW, top:Math.floor(i/4)*thumbH})));
    await sharp({create:{width:thumbW*4,height:thumbH*2,channels:3,background:'#deebef'}}).composite(layers).png().toFile(`${out}/${width}-all-chapters.png`);
    await page.close();
  }
  for (const mode of ['reduced', 'no-js']) {
    const page = await browser.newPage({width:390,height:844,mobile:true,reducedMotion:mode==='reduced'});
    if (mode === 'no-js') await page.send('Emulation.setScriptExecutionDisabled', { value: true });
    await page.goto(url);
    await page.eval(async()=>{await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    const fallback = await page.eval(()=>({live:document.querySelector('.journey').classList.contains('is-live'),overflow:document.documentElement.scrollWidth>innerWidth,chapters:[...document.querySelectorAll('.chapter')].map(s=>({id:s.id,height:s.getBoundingClientRect().height,inert:s.inert,visible:getComputedStyle(s).visibility,text:s.innerText.length})),images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)}));
    results.push({mode,...fallback,consoleErrors:page.consoleErrors});
    for (const [name,id] of [['start','start'],['middle','ascent'],['end','conversation']]) {
      await page.eval(id=>document.getElementById(id).scrollIntoView(),id);
      await sleep(300);
      await page.screenshot({path:`${out}/${mode}-${name}.png`,format:'png'});
    }
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results.filter(r=>r.consoleErrors||r.mode),null,2));
if(results.some(r=>r.overflow||r.imageLoaded===false||r.consoleErrors?.length||r.basePaths?.length))process.exitCode=1;
