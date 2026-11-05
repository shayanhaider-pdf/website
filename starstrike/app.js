/* UI, input and persistence. The simulation and pencil renderer stay independently testable. */
(() => {
  'use strict';
  const E = window.StarstrikeEngine, Sketch = window.StarstrikeSketch, Store = window.StarstrikeProgress;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const byId = Object.fromEntries(E.UPGRADES.map(u => [u.id, u]));
  let storage;
  try { storage = localStorage; } catch (_) { storage = null; }
  const progress = Store.load(storage, E.UPGRADES);
  let selected = 'needle', game = null, screen = 'home', manualPaused = false;
  let treeOrigin = 'home', treeTab = 'ships', pointer = null, last = 0, hudClock = 0;
  let offerSignature = '', finished = false, toastTimer = null;
  const keys = new Set();
  const pathNames = { needle:'Speed + slow', bastion:'Durability', nomad:'Utility', beam:'Pulse beam', laser:'Gun laser', gatling:'Gatling gun', effects:'Shared effects', links:'Weapon links' };
  const save = () => { progress.available = Store.save(storage, progress); updateSaved(); };
  function updateSaved() {
    $('bestScore').textContent = progress.best.toLocaleString();
    $('coreCount').textContent = progress.cores;
    $('storageNote').hidden = progress.available;
  }
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2300);
  }
  function selectShip(id) {
    selected = id;
    document.querySelectorAll('[data-ship]').forEach(button => {
      const checked = button.dataset.ship === id;
      button.classList.toggle('selected', checked); button.setAttribute('aria-pressed', String(checked));
      button.querySelector('.selection').textContent = checked ? '✓' : '';
    });
    const ship = E.SHIPS.find(s => s.id === id);
    $('selectionNote').textContent = `${ship.name}. ${ship.path.toLowerCase()}. Your call.`;
  }
  function renderFleet() {
    E.SHIPS.forEach((ship, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ship-card'; button.dataset.ship = ship.id;
      button.setAttribute('aria-label', `${ship.name}: ${ship.path}`);
      // All SVG and labels here are bundled source, never workspace or saved content.
      button.innerHTML = `<span class="selection" aria-hidden="true"></span><span class="ship-art" aria-hidden="true">${Sketch.shipSVG(ship.id)}</span><span class="ship-number">SHIP 0${i+1}</span><h3>${ship.name}</h3><span class="path-name">${ship.path}</span><span class="ship-description">${ship.description}</span>`;
      button.addEventListener('click', () => selectShip(ship.id)); $('shipGrid').appendChild(button);
    });
    selectShip(selected); updateSaved();
  }
  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
  function showDialog(id) { if (!$(id).open) $(id).showModal(); }
  function active() { return screen === 'run' && game && !manualPaused && !document.querySelector('dialog[open]') && !document.hidden; }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth*dpr); canvas.height = Math.round(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (game) game.resize(innerWidth,innerHeight);
  }
  function onEvent(event) {
    if (event.type === 'core') { progress.cores += event.amount || 1; save(); toast('A boss Core! Save a starting skill between runs.'); }
    if (event.type === 'link') toast(`${event.name} connected!`);
    if (event.type === 'boss') toast(`${event.name} — a big doodle approaches.`);
    if (event.type === 'bossdefeated') toast('Big doodle defeated. Keep going!');
  }
  function startRun() {
    closeDialogs(); pointer = null; keys.clear(); finished = false; manualPaused = false; screen = 'run'; offerSignature = '';
    const startingRanks = Object.fromEntries(progress.unlocked.map(id => [id,1]));
    game = E.createGame({ width:innerWidth,height:innerHeight,shipId:selected,startingRanks,prototype:true,onEvent });
    $('home').hidden = true; canvas.hidden = false; $('hud').hidden = false; $('steerHint').hidden = false;
    document.body.classList.add('playing'); resize(); updateHud(); last = performance.now();
  }
  function goHome() {
    closeDialogs(); screen = 'home'; game = null; pointer = null; keys.clear(); manualPaused = false;
    $('home').hidden = false; canvas.hidden = true; $('hud').hidden = true; $('steerHint').hidden = true;
    document.body.classList.remove('playing'); updateSaved(); $('play').focus();
  }
  function finishRun(voluntary = false) {
    if (!game || finished) return;
    finished = true; screen = 'result'; keys.clear(); pointer = null; closeDialogs();
    const s = game.state; progress.best = Math.max(progress.best,Math.floor(s.score)); save();
    $('steerHint').hidden = true; $('resultTitle').textContent = voluntary ? 'page complete.' : 'nice scribbling.';
    $('resultText').textContent = s.coresEarned ? 'You earned a Core. Keep a new starting skill in your notebook.' : 'Every try is a new page. Beat the first boss to earn a permanent skill Core.';
    $('resultStats').replaceChildren();
    [['SCORE',Math.floor(s.score)],['LEVEL',s.ship.level],['BOSSES',s.bossesDefeated],['CORES',s.coresEarned]].forEach(([label,value]) => {
      const span = document.createElement('span'); span.textContent = label; const b = document.createElement('b'); b.textContent = value; span.appendChild(b); $('resultStats').appendChild(span);
    });
    showDialog('resultDialog');
  }
  function updateHud() {
    if (!game) return; const s = game.state, ship = s.ship;
    $('score').textContent = Math.floor(s.score).toLocaleString(); $('level').textContent = ship.level;
    $('health').textContent = `♡ ${ship.hp}/${ship.maxHp}`; $('shield').textContent = `◇ ${ship.shield}/${ship.shieldCap}`;
    const xp = Math.min(100,Math.max(0,ship.xp/ship.need*100));
    $('xpFill').style.width = `${xp}%`; document.querySelector('.xp-track').setAttribute('aria-valuenow',String(Math.round(xp)));
    $('xpText').textContent = `${Math.floor(ship.xp)}/${ship.need}`;
    const w = s.weapons;
    $('weaponReadout').textContent = [w.beam.enabled?'beam':null,'gun laser',w.gatling.enabled?`gatling ×${w.gatling.barrels}`:null,s.links.length?`${s.links.length} link${s.links.length>1?'s':''}`:null].filter(Boolean).join(' · ');
    $('bossHud').hidden = !s.boss;
    if (s.boss) { $('bossName').textContent = s.boss.name; $('bossHealth').textContent = `${Math.max(0,Math.ceil(s.boss.hp))}/${Math.ceil(s.boss.maxHp)}`; $('bossFill').style.width = `${Math.max(0,s.boss.hp/s.boss.maxHp*100)}%`; }
  }
  function choose(id, fromTree = false) {
    if (!game || game.state.status !== 'upgrade' || !game.chooseUpgrade(id)) return;
    manualPaused = false; offerSignature = ''; $('upgradeDialog').close();
    if (fromTree) { $('treeDialog').close(); manualPaused = false; }
    updateHud(); syncState();
  }
  function showOffers() {
    const offers = game.getOffers();
    const signature = `${game.state.pendingUpgrades}:${game.state.ship.level}:${offers.map(o=>`${o.id}:${game.state.ranks[o.id]||0}`).join(',')}`;
    if (signature !== offerSignature) {
      offerSignature = signature; $('offers').replaceChildren();
      offers.forEach(offer => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'offer'; b.dataset.upgrade = offer.id;
        const rarity = document.createElement('span'); rarity.className = 'rarity'; rarity.textContent = `★ ${offer.rarity.name.toUpperCase()} · ${pathNames[offer.upgrade.path]}`;
        const title = document.createElement('b'); title.textContent = offer.upgrade.name;
        const detail = document.createElement('small'); detail.textContent = offer.description;
        const rank = document.createElement('em'); const n = game.state.ranks[offer.id] || 0;
        rank.textContent = `rank ${n} → ${n+1}${offer.upgrade.max===Infinity?' · no cap':''}`;
        b.append(rarity,title,detail,rank); b.addEventListener('click',()=>choose(offer.id)); $('offers').appendChild(b);
      });
      $('upgradeTitle').textContent = game.state.pendingUpgrades>1 ? `${game.state.pendingUpgrades} new ideas.` : 'a little better.';
    }
    showDialog('upgradeDialog');
  }
  function syncState() {
    if (!game || screen !== 'run') return;
    if (game.state.status === 'gameover') { finishRun(); return; }
    if (game.state.status === 'upgrade' && !$('treeDialog').open) { $('pauseDialog').close(); manualPaused = false; showOffers(); }
  }
  function pauseGame() {
    if (!game || screen!=='run' || game.state.status!=='playing' || document.querySelector('dialog[open]')) return;
    manualPaused = true; pointer = null; keys.clear(); showDialog('pauseDialog');
  }
  function resume() { $('pauseDialog').close(); manualPaused = false; keys.clear(); last = performance.now(); }
  function treeState() {
    if (screen === 'run' && game) return game.state;
    // Preview exactly the same base state and permanent ranks used by a real run.
    return E.createGame({shipId:selected,startingRanks:Object.fromEntries(progress.unlocked.map(id=>[id,1])),prototype:true}).state;
  }
  function openTree(origin) {
    treeOrigin = origin; if (origin!=='home') { manualPaused = true; pointer=null; keys.clear(); }
    $('upgradeDialog').close(); $('pauseDialog').close(); renderTree(); showDialog('treeDialog');
  }
  function closeTree() {
    $('treeDialog').close();
    if (treeOrigin === 'upgrade' && game?.state.status==='upgrade') { manualPaused = false; showOffers(); }
    else if (treeOrigin === 'pause') showDialog('pauseDialog');
    else manualPaused = false;
    last = performance.now();
  }
  function canBuy(u) {
    return !progress.unlocked.includes(u.id) && u.id!=='laser' && u.requires.every(id=>id==='laser'||progress.unlocked.includes(id));
  }
  function buy(u) {
    if (screen!=='home' || progress.cores<1 || !canBuy(u)) return;
    progress.cores--; progress.unlocked.push(u.id); save(); renderTree();
    $('treeStatus').textContent = `${u.name} saved. ${u.shipId?E.SHIPS.find(s=>s.id===u.shipId).name:'Every ship'} starts future runs with this Legendary rank.`;
  }
  function makeNode(u, state) {
    const inRun = screen === 'run', rank = state.ranks[u.id] || 0;
    const otherShip = !!u.shipId && u.shipId!==state.ship.type;
    const learned = inRun ? rank>0 : progress.unlocked.includes(u.id)||u.id==='laser';
    const offered = inRun && state.status==='upgrade' && game.getOffers().some(o=>o.id===u.id);
    const prereqsMet = u.requires.every(id=>(state.ranks[id]||0)>0);
    const buyable = !inRun && canBuy(u), available = inRun ? offered : buyable&&progress.cores>0;
    const node = document.createElement('button'); node.type='button'; node.className='skill-node'; node.dataset.skill=u.id;
    node.classList.toggle('learned',learned); node.classList.toggle('ready',available); node.classList.toggle('current-offer',offered); node.classList.toggle('other-ship',otherShip);
    const top = document.createElement('span'); top.className='node-top';
    const status = offered?'◎ LEVEL CHOICE':learned?'✓ LEARNED':!prereqsMet?'○ NEEDS LINK':'○ NEXT IDEA';
    top.textContent = `${status} · ${inRun?`RANK ${rank}/${u.max===Infinity?'∞':u.max}`:'★ LEGENDARY'}`;
    const title = document.createElement('b'); title.textContent=u.name;
    const detail = document.createElement('small'); detail.textContent = E.describeUpgrade(u.id,'legendary');
    const action = document.createElement('span'); action.className='node-action';
    if (inRun) action.textContent = otherShip?'Belongs to another ship':offered?'Choose this upgrade →':rank>=u.max?'Complete':state.status==='upgrade'?'Not one of this level’s three choices':'Find this in a future level choice';
    else action.textContent = learned?'Starting rank saved':!buyable?'Learn its prerequisites first':progress.cores>0?'Save starting rank · 1 Core →':'Starting rank · earn 1 boss Core';
    node.append(top,title,detail);
    if (u.requires.length) { const p=document.createElement('span'); p.className='node-prereq'; p.textContent=`needs ${u.requires.map(id=>byId[id].name).join(' + ')}`; node.appendChild(p); }
    node.appendChild(action); node.disabled=!available;
    if (available) node.addEventListener('click',()=>inRun?choose(u.id,true):buy(u));
    return node;
  }
  function makePath(path,title,subtitle,state,art) {
    const section=document.createElement('section'); section.className='skill-path';
    const header=document.createElement('div'); header.className='path-heading';
    if (art) header.innerHTML=Sketch.shipSVG(art);
    const heading=document.createElement('h3'); heading.textContent=title; header.appendChild(heading);
    const p=document.createElement('p'); p.className='path-subtitle'; p.textContent=subtitle; section.append(header,p);
    E.UPGRADES.filter(u=>u.path===path).forEach(u=>section.appendChild(makeNode(u,state))); return section;
  }
  function sharedSection(path,title,subtitle,state) {
    const section=document.createElement('section'); section.className='shared-section'; const h=document.createElement('h3'); h.textContent=title;
    const p=document.createElement('p'); p.textContent=subtitle; const nodes=document.createElement('div'); nodes.className='shared-nodes';
    E.UPGRADES.filter(u=>u.path===path).forEach(u=>nodes.appendChild(makeNode(u,state))); section.append(h,p);
    if(path==='links') {
      const map=document.createElement('div'); map.className='link-map';
      const learned=id=>state.links.includes(id)?'learned-link':'';
      map.innerHTML=`<svg viewBox="0 0 650 160" role="img" aria-label="Three weapon paths connect in a triangle: Focus joins beam and laser; Crossfire joins laser and Gatling; Storm joins Gatling and beam."><g fill="none" stroke="currentColor" stroke-width="1.5"><path class="${learned('link-focus')}" d="M110 45 Q210 24 300 45"/><path class="${learned('link-crossfire')}" d="M350 45 Q450 24 540 45"/><path class="${learned('link-storm')}" d="M85 65 Q320 190 565 65"/><circle cx="85" cy="45" r="24"/><circle cx="325" cy="45" r="24"/><circle cx="565" cy="45" r="24"/></g><g fill="currentColor" text-anchor="middle"><text x="85" y="51">${state.weapons.beam.enabled?'✓':'○'}</text><text x="325" y="51">✓</text><text x="565" y="51">${state.weapons.gatling.enabled?'✓':'○'}</text><text x="85" y="12">pulse beam</text><text x="325" y="12">gun laser</text><text x="565" y="12">Gatling</text><text x="205" y="64">focus</text><text x="445" y="64">crossfire</text><text x="325" y="119">storm</text></g></svg>`;
      section.appendChild(map);
    }
    section.appendChild(nodes); return section;
  }
  function renderTree() {
    const state=treeState(); $('treeStatus').textContent='';
    $('treeContext').textContent = screen==='run' ? `${E.SHIPS.find(s=>s.id===state.ship.type).name} · level ${state.ship.level}. ${state.status==='upgrade'?'Dashed cards are your current three choices. Choose one to keep flying.':'Your run is paused while this notebook is open.'}` : `${progress.cores} Core${progress.cores===1?'':'s'} available. First boss defeated = 1 Core per run. Save a starting rank for 1 Core; further ranks are earned in each run.`;
    $('shipPaths').replaceChildren(); $('weaponPaths').replaceChildren();
    E.SHIPS.forEach(ship=>$('shipPaths').appendChild(makePath(ship.id,ship.name,ship.path,state,ship.id)));
    [['beam','Pulse beam','Slow pulses. Strong line damage.'],['laser','Gun laser','Discrete shots. Faster, stronger, smarter.'],['gatling','Gatling gun','Tracks targets. Tiny shots. Lots of barrels.']].forEach(([id,title,sub])=>$('weaponPaths').appendChild(makePath(id,title,sub,state)));
    $('weaponPaths').appendChild(sharedSection('links','connect the dots','Pulse beam ↔ gun laser ↔ Gatling ↔ pulse beam. Each bridge needs its two weapons.',state));
    $('weaponPaths').appendChild(sharedSection('effects','a little chain reaction','These effects work with every weapon. Explosions throw fragments; lightning jumps between targets.',state));
    setTreeTab(treeTab);
  }
  function setTreeTab(tab) {
    treeTab=tab; $('shipPaths').hidden=tab!=='ships'; $('weaponPaths').hidden=tab!=='weapons';
    document.querySelectorAll('[data-tree-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.treeTab===tab)));
  }
  $('play').onclick=startRun; $('again').onclick=startRun; $('backHome').onclick=goHome;
  $('pause').onclick=pauseGame; $('resume').onclick=resume; $('endRun').onclick=()=>finishRun(true);
  $('treeHome').onclick=()=>openTree('home'); $('treeRun').onclick=()=>openTree('run');
  $('treeFromUpgrade').onclick=()=>openTree('upgrade'); $('treeFromPause').onclick=()=>openTree('pause'); $('closeTree').onclick=closeTree;
  document.querySelectorAll('[data-tree-tab]').forEach(b=>b.onclick=()=>setTreeTab(b.dataset.treeTab));
  $('upgradeDialog').addEventListener('cancel',e=>e.preventDefault());
  $('resultDialog').addEventListener('cancel',e=>{e.preventDefault();goHome();});
  $('treeDialog').addEventListener('cancel',e=>{e.preventDefault();closeTree();});
  $('pauseDialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
  canvas.addEventListener('pointerdown',e=>{if(!active())return;pointer=e.pointerId;canvas.setPointerCapture(pointer);game.steer(e.clientX,e.clientY);$('steerHint').hidden=true;e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&active()){game.steer(e.clientX,e.clientY);e.preventDefault();}});
  function release(e){if(e.pointerId===pointer)pointer=null;}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  const movementKeys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'];
  addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!document.querySelector('dialog[open]')){pauseGame();return;}
    if(movementKeys.includes(e.key)&&active()){keys.add(e.key);$('steerHint').hidden=true;e.preventDefault();}
  });
  addEventListener('keyup',e=>keys.delete(e.key));
  addEventListener('blur',()=>{keys.clear();pointer=null;pauseGame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pointer=null;pauseGame();}});
  addEventListener('pagehide',()=>{keys.clear();pauseGame();});addEventListener('resize',resize);
  function frame(now) {
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(screen==='run'&&game){
      if(active()&&game.state.status==='playing'){
        const dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
        const dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
        if(dx||dy){const s=game.state.ship;game.steer(s.tx+dx*360*dt,s.ty+dy*360*dt);}
        game.step(dt);
      }
      syncState();hudClock+=dt;if(hudClock>.08){updateHud();hudClock=0;}
    }
    if(game&&screen!=='home')Sketch.draw(ctx,game.state,innerWidth,innerHeight);
    requestAnimationFrame(frame);
  }
  renderFleet();resize();requestAnimationFrame(frame);
  // Explicit debug mode is local-only test tooling; regular play exposes no free upgrades.
  if(new URLSearchParams(location.search).get('debug')==='1')window.__starstrike={
    get game(){return game;},get progress(){return progress;},start:startRun,home:goHome,openTree,
    select:selectShip,save,step:dt=>{game.step(dt);syncState();updateHud();},
    grantXp:n=>{game.grantXp(n);syncState();updateHud();},
    grantCore:n=>{progress.cores+=n;save();},snapshot:()=>JSON.parse(JSON.stringify(game?.state||null))
  };
})();
