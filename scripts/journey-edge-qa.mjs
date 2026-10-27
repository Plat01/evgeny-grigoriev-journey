import { Browser, sleep } from '../.agents/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const browser = await Browser.launch({ extraArgs: ['--no-sandbox'] });
const url = 'http://localhost:4323/journey-preview/';
const results = [];
try {
  for (const mode of ['reduced', 'no-js']) {
    const p = await browser.newPage({ width:390,height:844,mobile:true,reducedMotion:mode==='reduced' });
    if(mode==='no-js') await p.send('Emulation.setScriptExecutionDisabled',{value:true});
    await p.goto(url);
    await p.eval(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
    for(const [name,id] of [['start','start'],['middle','ascent'],['end','conversation']]) {
      await p.eval(id=>document.getElementById(id).scrollIntoView(),id);
      await sleep(400);
      results.push({mode,id,state:await p.eval(id=>{const img=document.getElementById(id).querySelector('img');const r=img.getBoundingClientRect();return{loaded:img.complete&&img.naturalWidth>0,src:img.currentSrc,visibility:getComputedStyle(img).visibility,opacity:getComputedStyle(img).opacity,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},scroll:scrollY};},id)});
      await p.screenshot({path:`docs/qa/journey/${mode}-${name}.png`,format:'png'});
    }
    await p.close();
  }
  const p = await browser.newPage({width:390,height:844,mobile:true});
  await p.goto(url+'#momentum',{settleMs:2200});
  const directHash=await p.eval(()=>({chapter:document.querySelector('.chapter-status').textContent,scroll:scrollY}));
  await p.screenshot({path:'docs/qa/journey/direct-hash.png',format:'png'});
  await p.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await sleep(300);
  const reduced=await p.eval(()=>({live:document.querySelector('.journey').classList.contains('is-live'),inert:document.querySelectorAll('[inert]').length,visible:[...document.querySelectorAll('.chapter')].every(e=>getComputedStyle(e).visibility==='visible')}));
  await p.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await sleep(1500);
  const resumed=await p.eval(()=>({live:document.querySelector('.journey').classList.contains('is-live'),chapter:document.querySelector('.chapter-status').textContent}));
  results.push({directHash,reduced,resumed,errors:p.consoleErrors});
  writeFileSync('docs/qa/journey/runtime-media.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
