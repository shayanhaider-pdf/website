const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname,'..');
let browser, server, base;
before(async()=>{
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname.replace(/^\/starstrike/,''))+(url.pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(err?'Not found':data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}/starstrike/`;
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-proxy-server']});
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function pageFor(viewport={width:1440,height:1000},options={}){
  const context=await browser.newContext({viewport,...options});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?debug=1');await page.waitForFunction(()=>window.__starstrike);
  return {context,page,errors};
}
async function shot(page,name){if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,name),fullPage:true});}}
test('desktop fleet, skill notebook, start, steering and pause work without errors',async()=>{
  const {context,page,errors}=await pageFor();
  try{
    assert.equal(await page.locator('.ship-card').count(),3);
    assert.equal(await page.locator('.ship-card.selected').getAttribute('data-ship'),'needle');
    await shot(page,'starstrike-desktop.png');
    await page.locator('#treeHome').click();assert.equal(await page.locator('#shipPaths .skill-node').count(),9);
    await page.locator('[data-tree-tab="weapons"]').click();assert.equal(await page.locator('#weaponPaths .skill-node').count(),15);
    await shot(page,'starstrike-skill-tree.png');await page.locator('#closeTree').click();
    await page.locator('[data-ship="bastion"]').click();await page.locator('#play').click();
    assert.equal(await page.evaluate(()=>__starstrike.game.state.ship.type),'bastion');
    const x=await page.evaluate(()=>__starstrike.game.state.ship.x);
    await page.mouse.move(100,600);await page.mouse.down();await page.mouse.move(200,500);await page.mouse.up();
    await page.waitForFunction(old=>__starstrike.game.state.ship.x<old-20,x);
    await page.locator('#pause').click();const time=await page.evaluate(()=>__starstrike.game.state.time);
    await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__starstrike.game.state.time),time);
    await page.locator('#treeFromPause').click();await page.locator('#closeTree').click();assert(await page.locator('#pauseDialog').isVisible());
    await page.locator('#resume').click();await page.waitForFunction(old=>__starstrike.game.state.time>old,time);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('level choices stay Legendary; closing the tree and choosing resumes simulation',async()=>{
  const {context,page,errors}=await pageFor();
  try{
    await page.locator('#play').click();await page.evaluate(()=>__starstrike.grantXp(40));
    assert(await page.locator('#upgradeDialog').isVisible());assert.equal(await page.locator('.offer .rarity').count(),3);
    assert((await page.locator('.offer .rarity').allTextContents()).every(t=>t.includes('LEGENDARY')));
    await page.locator('#treeFromUpgrade').click();await page.locator('#closeTree').click();
    await page.locator('[data-upgrade="beam"]').click();
    await page.waitForFunction(()=>__starstrike.game.state.status==='playing');
    const t=await page.evaluate(()=>__starstrike.game.state.time);await page.waitForFunction(old=>__starstrike.game.state.time>old+.1,t);
    assert.equal(await page.evaluate(()=>__starstrike.game.state.weapons.beam.enabled),true);
    await page.evaluate(()=>__starstrike.grantXp(60));await page.locator('#treeFromUpgrade').click();await page.locator('[data-tree-tab="weapons"]').click();
    await page.locator('[data-skill="gatling"]').click();
    assert.equal(await page.evaluate(()=>__starstrike.game.state.weapons.gatling.enabled),true);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('permanent skills, old saves and boss cores persist across reloads',async()=>{
  const {context,page,errors}=await pageFor();
  try{
    await page.evaluate(()=>{localStorage.clear();localStorage.setItem('starstrike-v6-reactor-core',JSON.stringify({cores:2,unlocked:['damage','coils']}));localStorage.setItem('starstrike-v4-best','1234');});
    await page.reload();await page.waitForFunction(()=>window.__starstrike);assert.equal(await page.locator('#coreCount').textContent(),'2');assert.equal(await page.locator('#bestScore').textContent(),'1,234');
    await page.locator('#treeHome').click();await page.locator('[data-tree-tab="weapons"]').click();await page.locator('[data-skill="beam"]').click();assert.match(await page.locator('#treeStatus').textContent(),/saved/);
    await page.locator('#closeTree').click();await page.reload();await page.waitForFunction(()=>window.__starstrike);assert.equal(await page.locator('#coreCount').textContent(),'1');
    await page.locator('#play').click();assert.equal(await page.evaluate(()=>__starstrike.game.state.weapons.beam.enabled),true);
    await page.evaluate(()=>{const g=__starstrike.game;g.startBoss();g.defeatBoss();});
    assert.equal(await page.evaluate(()=>__starstrike.progress.cores),2);
    await page.evaluate(()=>{const g=__starstrike.game;while(g.state.status==='upgrade')g.chooseUpgrade(g.getOffers()[0].id);g.startBoss();g.defeatBoss();});
    assert.equal(await page.evaluate(()=>__starstrike.progress.cores),2);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('phone fleet and tree fit the viewport; touch steering and game over work',async()=>{
  const {context,page,errors}=await pageFor({width:390,height:844},{isMobile:true,hasTouch:true,deviceScaleFactor:2});
  try{
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(page,'starstrike-phone.png');
    await page.locator('#treeHome').click();await page.locator('[data-tree-tab="weapons"]').click();
    assert(await page.evaluate(()=>document.querySelector('#treeDialog').scrollWidth<=document.querySelector('#treeDialog').clientWidth));
    await page.locator('#closeTree').click();await page.locator('[data-ship="nomad"]').click();await page.locator('#play').click();
    await page.touchscreen.tap(70,500);await page.waitForFunction(()=>__starstrike.game.state.ship.x<180);
    await page.evaluate(()=>{const g=__starstrike.game;g.applyUpgrade('beam');g.applyUpgrade('gatling');g.applyUpgrade('nuke');g.applyUpgrade('lightning');g.state.ship.invuln=100;for(let i=0;i<6;i++)g.addRock({x:60+i*50,y:220+i*22,hp:15});});
    await page.waitForTimeout(350);await shot(page,'starstrike-gameplay.png');
    await page.evaluate(()=>{const g=__starstrike.game;g.state.ship.invuln=0;g.damageShip(100);});
    await page.waitForSelector('#resultDialog[open]');await page.locator('#backHome').click();assert(await page.locator('#home').isVisible());
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('cached sketchbook boots and plays fully offline',async()=>{
  const {context,page,errors}=await pageFor({width:390,height:844});
  try{
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const cached=await page.evaluate(async()=>{const c=await caches.open('starstrike-v7-sketchbook-20261105');return(await c.keys()).map(r=>new URL(r.url).pathname);});
    for(const name of ['engine.js','sketch.js','app.js','progress.js','style.css'])assert(cached.some(p=>p.endsWith('/'+name)));
    await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.__starstrike);
    await page.locator('#play').click();await page.waitForFunction(()=>__starstrike.game.state.time>.1);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('compact and landscape viewports stay usable and blocked storage remains playable',async()=>{
  const {context,page,errors}=await pageFor({width:320,height:568});
  try{
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#treeHome').click();
    assert(await page.evaluate(()=>document.querySelector('#treeDialog').getBoundingClientRect().width<=innerWidth));
    await page.locator('#closeTree').click();await page.setViewportSize({width:844,height:390});
    await page.locator('#play').click();await page.locator('#pause').click();
    assert(await page.locator('#resume').isVisible());await page.locator('#endRun').click();await page.locator('#backHome').click();
    await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('storage blocked')};Storage.prototype.setItem=function(){throw new Error('storage blocked')};});
    await page.reload();await page.waitForFunction(()=>window.__starstrike);assert(await page.locator('#storageNote').isVisible());
    await page.locator('#play').click();await page.waitForFunction(()=>__starstrike.game.state.time>.1);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
