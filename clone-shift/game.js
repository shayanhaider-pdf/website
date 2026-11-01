
(() => {
  const STORAGE_KEY='clone_shift_v04';
  const ESSENTIAL={attack:1,scavenger:1,processor:1};
  const assetMap=window.CLONE_ASSETS;

  const roles=[
    {id:'attack',name:'Attack',desc:'Physical damage specialists.',group:'hunt',img:assetMap.attack},
    {id:'defense',name:'Defense',desc:'Reduce incoming squad damage.',group:'hunt',img:assetMap.defense},
    {id:'magic',name:'Magic',desc:'Fire magic bolts from the backline.',group:'hunt',img:assetMap.magic},
    {id:'combat',name:'Combat',desc:'Train strength for better attack.',group:'train',img:assetMap.combat},
    {id:'conditioning',name:'Conditioning',desc:'Raise squad health and endurance.',group:'train',img:assetMap.conditioning},
    {id:'arcane',name:'Arcane',desc:'Improve all magical damage.',group:'train',img:assetMap.arcane},
    {id:'scavenger',name:'Scavenging',desc:'Increase loot recovered from defeated enemies.',group:'collect',img:assetMap.scavenger},
    {id:'processor',name:'Processing',desc:'Convert loot to credits faster.',group:'collect',img:assetMap.processor},
  ];
  const upgrades=[
    {id:'weapon',name:'Weapon Drills',desc:'+25% physical output',base:40,mult:1.8},
    {id:'focus',name:'Arcane Focus',desc:'+25% magic output',base:42,mult:1.8},
    {id:'armor',name:'Field Armor',desc:'+24% max HP',base:45,mult:1.82},
    {id:'storage',name:'Storage Rack',desc:'+18 loot storage',base:38,mult:1.76},
    {id:'processors',name:'Workshop Tools',desc:'+30% processing speed',base:44,mult:1.84},
    {id:'scavenging',name:'Carry Packs',desc:'+16% loot yield',base:36,mult:1.78},
    {id:'block',name:'Guard Formation',desc:'+8% block efficiency',base:48,mult:1.86},
  ];
  const stageNames=['Ruined Atrium','Collapsed Market','Echo Mall Depths','Night Gate'];
  const enemyPools=[
    [{type:'slime',name:'Mold Slime',hp:28,atk:4,drop:3},{type:'spider',name:'Wire Spider',hp:34,atk:5,drop:4}],
    [{type:'spider',name:'Mall Spider',hp:52,atk:6.5,drop:5},{type:'bat',name:'Dust Bat',hp:42,atk:7,drop:4}],
    [{type:'brute',name:'Rot Brute',hp:74,atk:8.5,drop:7},{type:'bat',name:'Howler Bat',hp:50,atk:9,drop:5}],
    [{type:'brute',name:'Warden Hulk',hp:96,atk:12,drop:9},{type:'spider',name:'Abyss Arachnid',hp:82,atk:11,drop:8}],
  ];
  const bossPool=[
    {type:'spider',name:'Atrium Queen',hp:150,atk:14,drop:18},
    {type:'brute',name:'Shopfront Ogre',hp:220,atk:18,drop:24},
    {type:'brute',name:'Moss Colossus',hp:300,atk:23,drop:34},
    {type:'brute',name:'Night Gate Warden',hp:390,atk:30,drop:48},
  ];
  const el=id=>document.getElementById(id); const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const fmt=n=> (n>=1000?Math.floor(n).toLocaleString(): (Math.round(n*10)/10).toString());
  const fmtTime=s=>{
    if(!isFinite(s)) return 'Need income to afford';
    if(s<=0) return 'Next clone available now';
    if(s<60) return `Affordable in ${Math.ceil(s)}s`;
    const m=Math.floor(s/60), r=Math.ceil(s%60); return `Affordable in ${m}m ${r}s`;
  };


  let images={};
  const s=loadState() || freshState();
  buildRoleCards(); buildUpgradeCards(); bindUI();
  window.addEventListener('pagehide', saveState);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveState(); });
  loadAssets().then(()=>{ensureEnemy(); renderAll(); loop(performance.now()); setInterval(saveState,4000);});

  function freshState(){
    const st={
      credits:0, loot:0, awakenings:0, stage:1, stars:0,
      totalClones:4, maxClones:4, overdriveCd:0, overdriveLeft:0,
      roles:{generalist:1,attack:1,defense:0,magic:0,combat:0,conditioning:0,arcane:0,scavenger:1,processor:1},
      roleXp:Object.fromEntries(roles.map(r=>[r.id,0])), roleLv:Object.fromEntries(roles.map(r=>[r.id,0])),
      trainXp:{combat:0,conditioning:0,arcane:0}, trainLv:{combat:0,conditioning:0,arcane:0},
      upgrades:Object.fromEntries(upgrades.map(u=>[u.id,0])),
      squadHp:100, battle:{enemy:null, nextTypes:[], kills:0, killsToBoss:7, boss:false},
      metrics:{elapsed:0, samples:[], since:0},
      lastSave:Date.now()
    };
    return st;
  }
  function loadState(){
    try {
      const previous=localStorage.getItem(STORAGE_KEY) || localStorage.getItem('clone_shift_v03');
      if(!previous) return null;
      const st=JSON.parse(previous);
      if(!st || !st.roles || !st.upgrades || !st.battle) return null;
      // Migration: preserve existing workers and purchases, add missing essential workers free.
      for(const [role,min] of Object.entries(ESSENTIAL)){
        const missing=Math.max(0,min-(st.roles[role]||0));
        st.roles[role]=(st.roles[role]||0)+missing;
        st.totalClones+=missing;
        st.maxClones+=missing;
      }
      st.totalClones=Math.max(4,st.totalClones);
      st.maxClones=Math.max(st.totalClones,st.maxClones,4);
      st.roles.generalist=Math.max(0,st.roles.generalist||0);
      if(!st.metrics || !Array.isArray(st.metrics.samples)) st.metrics={elapsed:0,samples:[],since:0};
      else st.metrics={elapsed:0,samples:[],since:0};
      offlineTick(st);
      return st;
    }catch(e){return null}
  }
  function saveState(){s.lastSave=Date.now(); try{localStorage.setItem(STORAGE_KEY, JSON.stringify(s));}catch(e){/* Browsers with storage disabled remain playable */}}
  function resetSave(){try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('clone_shift_v03');}catch(e){}location.reload();}
  function offlineTick(st){
    const seconds=Math.min(20*60,Math.max(0,(Date.now()-(st.lastSave||Date.now()))/1000));
    if(seconds<=0) return;
    const rates=steadyRates(st);
    const produced=Math.min(Math.max(0,storageCap(st)-(st.loot||0))+rates.convertRate*seconds, rates.lootPotential*seconds);
    const processed=Math.min((st.loot||0)+produced, processingRate(st)*seconds);
    st.loot=clamp((st.loot||0)+produced-processed,0,storageCap(st));
    st.credits += processed*creditValue(st);
    roles.forEach(r=>addRoleXp(st,r.id,(st.roles[r.id]||0)*seconds*0.32));
    ['combat','conditioning','arcane'].forEach(k=>addTrainingXp(st,k,(st.roles[k]||0)*seconds*0.45));
  }
  function bindUI(){
    document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.tab)));
    el('buyCloneBtn').addEventListener('click', buyClone);
    el('overdriveBtn').addEventListener('click', activateOverdrive);
    el('resetSave').addEventListener('click', ()=>{ if(confirm('Reset Clone Shift save?')) resetSave(); });
    document.body.addEventListener('click',e=>{
      const plus=e.target.closest('[data-plus]'); const minus=e.target.closest('[data-minus]'); const buy=e.target.closest('[data-buy-upgrade]');
      if(plus) assignRole(plus.dataset.plus,1);
      if(minus) assignRole(minus.dataset.minus,-1);
      if(buy) buyUpgrade(buy.dataset.buyUpgrade);
    });
  }
  function setTab(tab){
    document.querySelectorAll('.screen').forEach(sc=>sc.classList.toggle('active', sc.id===`screen-${tab}`));
    document.querySelectorAll('.nav-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.tab===tab));
  }
  function buildRoleCards(){
    const host=el('roleList');
    roles.forEach(r=>{
      const card=document.createElement('div'); card.className='role-card';
      card.innerHTML=`<img src="${r.img}" alt="${r.name} pixel role"><div class="role-main"><h3>${r.name}</h3><p>${r.desc}</p><div class="role-sub"><span class="tag">Assigned: <span id="count-${r.id}">0</span></span><span class="tag">Role Lv <span id="lvl-${r.id}">0</span></span></div></div><div class="role-actions"><div class="stepper"><button data-minus="${r.id}">−</button><strong id="mini-${r.id}">0</strong><button data-plus="${r.id}">+</button></div><div class="tag" id="xp-${r.id}">0 / 12 XP</div></div>`;
      const minus=card.querySelector('[data-minus]');
      if(ESSENTIAL[r.id]){
        card.querySelector('.role-sub').insertAdjacentHTML('beforeend','<span class="tag">Core worker · min 1</span>');
        minus.title='This role needs at least one worker to maintain the economy';
      }
      host.appendChild(card);
    });
  }
  function buildUpgradeCards(){
    const host=el('upgradeList');
    upgrades.forEach(u=>{
      const card=document.createElement('div'); card.className='upgrade-card';
      card.innerHTML=`<div class="upgrade-main"><h3>${u.name}</h3><p>${u.desc}</p></div><div class="upgrade-meta"><div class="tag" id="ug-lv-${u.id}">Lv 0</div><div class="upgrade-cost"><span id="ug-cost-${u.id}">0</span> Credits</div><button class="pixel-btn" data-buy-upgrade="${u.id}">Buy</button></div>`;
      host.appendChild(card);
    });
  }

  function cloneCost(st=s){ return Math.ceil(80 * Math.pow(1.58, Math.max(0,st.maxClones-4))); }
  function buyClone(){
    const cost=cloneCost();
    if(s.credits < cost) return;
    s.credits -= cost; s.maxClones += 1; s.totalClones += 1; s.roles.generalist += 1; renderAll();
  }
  function assignRole(id, delta){
    if(delta>0){ if(s.roles.generalist<=0) return; s.roles.generalist--; s.roles[id]++; }
    else { if(s.roles[id]<=(ESSENTIAL[id]||0)) return; s.roles[id]--; s.roles.generalist++; }
    renderAll();
  }
  function buyUpgrade(id){
    const u=upgrades.find(x=>x.id===id), lv=s.upgrades[id]||0, cost=Math.ceil(u.base*Math.pow(u.mult,lv));
    if(s.credits<cost) return; s.credits-=cost; s.upgrades[id]++; renderAll();
  }

  function roleBonus(id, st=s){ return 1 + (st.roleLv[id]||0)*0.05; }
  function addRoleXp(st,id,amount){
    st.roleXp[id]=(st.roleXp[id]||0)+amount;
    while(st.roleXp[id]>=12){ st.roleXp[id]-=12; st.roleLv[id]++; }
  }
  function addTrainingXp(st,id,amount){
    st.trainXp[id]=(st.trainXp[id]||0)+amount;
    while(st.trainXp[id]>=10){ st.trainXp[id]-=10; st.trainLv[id]++; }
  }
  function physicalDps(st=s){
    const base=4.2*(1+st.upgrades.weapon*0.25)*(1+st.awakenings*0.12);
    const units=((st.roles.attack||0)*1 + (st.roles.generalist||0)*0.18) * roleBonus('attack',st);
    return base*units*(1+st.trainLv.combat*0.05);
  }
  function magicDps(st=s){
    const base=3.1*(1+st.upgrades.focus*0.25)*(1+st.awakenings*0.10);
    const units=((st.roles.magic||0)*1 + (st.roles.generalist||0)*0.1) * roleBonus('magic',st);
    return base*units*(1+st.trainLv.arcane*0.05);
  }
  function totalDps(st=s){ return (physicalDps(st)+magicDps(st)) * (st.overdriveLeft>0 ? 2 : 1); }
  function blockPct(st=s){ const def=((st.roles.defense||0)*0.08*roleBonus('defense',st)) + st.upgrades.block*0.08; return clamp(def,0,0.72); }
  function maxHp(st=s){ const base=84*(1+st.upgrades.armor*0.24); const cond=((st.roles.conditioning||0)*0.18*roleBonus('conditioning',st)); return Math.round(base*(1+cond+st.trainLv.conditioning*0.04)); }
  function storageCap(st=s){ return 24 + st.upgrades.storage*18; }
  function processingRate(st=s){ return (((st.roles.processor||0)*1.50*roleBonus('processor',st)) + (st.roles.generalist||0)*0.08) * (1+st.upgrades.processors*0.30); }
  function lootYield(st=s){ return 1 + ((st.roles.scavenger||0)*0.18*roleBonus('scavenger',st)) + st.upgrades.scavenging*0.16; }
  function creditValue(st=s){ return Math.floor(4 * Math.pow(1.34, st.stage-1)); }
  function attackStrength(st=s){ return totalDps(st); }

  // Resource economics use the exact same flow calculation as the combat simulation.
  // Enemy loot is proportionally recovered while the enemy takes real damage;
  // a defeat completes the drop. There is no separate duplicate kill payout.
  function steadyRates(st=s){
    const enemy=st.battle?.enemy || {maxHp:28,drop:3};
    const lootPotential=totalDps(st) * (enemy.drop/enemy.maxHp) * lootYield(st);
    const cap=processingRate(st);
    const convertRate=Math.min(cap,lootPotential + (st.loot||0)/5);
    return {lootPotential,convertRate,creditPotential:convertRate*creditValue(st)};
  }
  function observedRates(st=s){
    const samples=st.metrics?.samples || [];
    const sum=samples.reduce((acc,x)=>{acc.seconds+=x.dt;acc.loot+=x.loot;acc.credits+=x.credits;return acc;},{seconds:0,loot:0,credits:0});
    // Starting display uses the same combat formula, then switches to actual
    // measured outputs as soon as enough simulation time has elapsed.
    if(sum.seconds<0.15){const p=steadyRates(st);return {loot:p.lootPotential,credits:p.creditPotential};}
    return {loot:sum.loot/sum.seconds,credits:sum.credits/sum.seconds};
  }
  function recordFlow(dt,loot,credits){
    const m=s.metrics;
    m.elapsed+=dt;
    m.samples.push({dt,loot,credits,end:m.elapsed});
    while(m.samples.length && m.samples[0].end < m.elapsed - 5) m.samples.shift();
  }
  function lootPerSec(st=s){return observedRates(st).loot;}
  function creditsPerSec(st=s){return observedRates(st).credits;}
  function ensureEnemy(){ if(!s.battle.enemy){ queueEnemies(); spawnEnemy(); s.squadHp=maxHp(); } if(s.squadHp>maxHp()) s.squadHp=maxHp(); }
  function queueEnemies(){
    const idx=Math.min(s.stage-1, enemyPools.length-1); const pool=enemyPools[idx];
    s.battle.nextTypes=[];
    for(let i=0;i<3;i++) s.battle.nextTypes.push(pool[i%pool.length].type);
  }
  function spawnEnemy(){
    const idx=Math.min(s.stage-1, enemyPools.length-1);
    let tpl;
    if(s.battle.boss){ tpl=bossPool[idx]; }
    else { const pool=enemyPools[idx]; tpl=pool[(s.battle.kills)%pool.length]; }
    const scale=Math.pow(1.24, s.stage-1);
    s.battle.enemy={type:tpl.type,name:tpl.name,maxHp:Math.round(tpl.hp*scale),hp:Math.round(tpl.hp*scale),atk:tpl.atk*(1+(s.stage-1)*0.14),drop:tpl.drop};
  }
  function onEnemyDefeated(){
    if(s.battle.boss){
      if(s.stage<stageNames.length) s.stage++;
      s.stars=Math.min(5,s.stars+1);
      s.battle.kills=0;
      s.battle.boss=false;
      queueEnemies();
    }else{
      s.battle.kills++;
      if(s.battle.kills>=s.battle.killsToBoss) s.battle.boss=true;
    }
    spawnEnemy();
    s.squadHp=maxHp();
  }
  function activateOverdrive(){ if(s.overdriveCd>0) return; s.overdriveCd=20; s.overdriveLeft=8; }

  let last=0, lastUi=0;
  function loop(now){
    const dt=Math.min(0.1,(now-last)/1000||0.016); last=now;
    tick(dt); drawBattle();
    if(now-lastUi>180){renderDynamic();lastUi=now;}
    requestAnimationFrame(loop);
  }
  function tick(dt){
    ensureEnemy();
    s.overdriveCd=Math.max(0,s.overdriveCd-dt);
    s.overdriveLeft=Math.max(0,s.overdriveLeft-dt);
    roles.forEach(r=>addRoleXp(s,r.id,(s.roles[r.id]||0)*dt*0.32));
    ['combat','conditioning','arcane'].forEach(k=>addTrainingXp(s,k,(s.roles[k]||0)*dt*0.45));
    // Convert existing loot first, freeing storage for new recovered loot.
    let converted=Math.min(s.loot,processingRate()*dt);
    s.loot-=converted;
    let generated=0;
    let remainingDamage=totalDps()*dt;
    let fights=0;
    while(remainingDamage>0 && fights<40){
      const enemy=s.battle.enemy;
      const damage=Math.min(enemy.hp,remainingDamage);
      const potential=damage*(enemy.drop/enemy.maxHp)*lootYield();
      const accepted=Math.min(potential,Math.max(0,storageCap()-s.loot));
      s.loot+=accepted; generated+=accepted;
      enemy.hp-=damage;
      remainingDamage-=damage;
      if(enemy.hp<=0.000001){onEnemyDefeated();fights++;}
      else break;
    }
    // Convert newly dropped loot with any spare processing capacity this tick.
    const extra=Math.min(s.loot,Math.max(0,processingRate()*dt-converted));
    s.loot-=extra;converted+=extra;
    const credits=converted*creditValue();
    s.credits+=credits;
    recordFlow(dt,generated,credits);
    // Squad retreat restores the previous economy instead of trapping players
    // in an unbeatable boss fight.
    s.squadHp-=s.battle.enemy.atk*(1-blockPct())*dt;
    if(s.squadHp<=0){
      s.squadHp=maxHp();
      if(s.battle.boss){s.battle.boss=false;s.battle.kills=0;}
      spawnEnemy();
    }
  }
  function renderAll(){ renderStatic(); renderDynamic(); }
  function renderStatic(){
    document.querySelectorAll('.role-card img').forEach(()=>{});
    upgrades.forEach(u=>{ const lv=s.upgrades[u.id]||0; el(`ug-lv-${u.id}`).textContent=`Lv ${lv}`; el(`ug-cost-${u.id}`).textContent=Math.ceil(u.base*Math.pow(u.mult,lv)); });
  }
  function renderDynamic(){
    // home
    const cps=creditsPerSec(); const cost=cloneCost();
    el('homeGate').textContent=`Stage ${s.stage} · ${stageNames[s.stage-1]}`;
    el('stageStars').textContent='★★★★★'.slice(0,s.stars) + '☆☆☆☆☆'.slice(0,5-s.stars);
    el('creditsHome').textContent=fmt(s.credits); el('creditsPerSec').textContent=`+${fmt(cps)} / sec · 5s actual`;
    el('globalDps').textContent=fmt(totalDps());
    el('globalLoot').textContent=fmt(lootPerSec());
    el('globalCredits').textContent=fmt(cps);
    el('cloneCountHome').textContent=`${s.totalClones} / ${s.maxClones}`;
    el('freeGeneralists').textContent=s.roles.generalist;
    el('cloneAffordEta').textContent=fmtTime(cps>0 ? Math.max(0,(cost-s.credits)/cps):Infinity);
    el('nextCloneCost').textContent=fmt(cost);
    el('buyCloneBtn').disabled = s.credits < cost;
    el('lootPerSec').textContent=`${fmt(lootPerSec())} / sec · 5s actual`;
    el('lootStorage').textContent=`${fmt(s.loot)} / ${storageCap()}`;
    el('processingSpeed').textContent=`${fmt(processingRate())} / sec`;
    el('dpsHome').textContent=fmt(totalDps());
    el('hpHome').textContent=`${Math.round(s.squadHp)} / ${maxHp()}`;
    el('blockHome').textContent=`${Math.round(blockPct()*100)}% blocked`;

    // attack
    el('attackGateTitle').textContent=`Stage ${s.stage} · ${stageNames[s.stage-1]}`;
    el('battleState').textContent=s.battle.boss ? 'Boss Fight' : 'Continuous Hunt';
    el('squadBar').style.width=`${clamp((s.squadHp/maxHp())*100,0,100)}%`; el('enemyBar').style.width=`${clamp((s.battle.enemy.hp/s.battle.enemy.maxHp)*100,0,100)}%`;
    el('squadHpText').textContent=`${Math.max(0,Math.round(s.squadHp))} / ${maxHp()}`;
    el('enemyLabel').textContent=s.battle.enemy.name; el('enemyHpText').textContent=`${Math.max(0,Math.round(s.battle.enemy.hp))} / ${s.battle.enemy.maxHp}`;
    el('attackDps').textContent=fmt(totalDps()); el('attackLootRate').textContent=fmt(lootPerSec());
    el('overdriveBtn').textContent = s.overdriveCd>0 ? `Overdrive ${Math.ceil(s.overdriveCd)}s` : 'Overdrive';

    // train
    el('trainFreeGeneralists').textContent=s.roles.generalist;
    roles.forEach(r=>{ el(`count-${r.id}`).textContent=s.roles[r.id]; el(`mini-${r.id}`).textContent=s.roles[r.id]; el(`lvl-${r.id}`).textContent=s.roleLv[r.id]; el(`xp-${r.id}`).textContent=`${s.roleXp[r.id].toFixed(1)} / 12 XP`; const minus=document.querySelector(`[data-minus=\"${r.id}\"]`); if(minus)minus.disabled=s.roles[r.id]<=(ESSENTIAL[r.id]||0); });
    const tHost=el('trainingLevels'); tHost.innerHTML='';
    [['combat','Combat Training'],['conditioning','Conditioning'],['arcane','Arcane Training']].forEach(([k,label])=>{ const row=document.createElement('div'); row.className='level-row'; row.innerHTML=`<div class="left"><strong>${label}</strong><small>${s.trainXp[k].toFixed(1)} / 10 XP</small></div><div class="tag">Lv ${s.trainLv[k]}</div>`; tHost.appendChild(row); });

    // upgrades
    el('upgradeCredits').textContent=fmt(s.credits);
  }

  window.__CLONE_SHIFT_TEST__={state:s,tick,derived:{totalDps,lootPerSec,creditsPerSec,processingRate,cloneCost},assignRole,buyClone,buyUpgrade,resetSave};
  async function loadAssets(){
    const srcs=Object.keys(assetMap);
    await Promise.all(srcs.map(name=>new Promise(res=>{const img=new Image(); img.onload=()=>{images[name]=img;res();}; img.src=assetMap[name]; })));
  }
  function drawBattle(){
    const c=el('battleCanvas'); if(!c) return; const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,c.width,c.height);
    if(images.mall_bg) ctx.drawImage(images.mall_bg,0,0,c.width,c.height);
    // dark overlays for UI zones
    ctx.fillStyle='rgba(12,10,9,.18)'; ctx.fillRect(0,0,c.width,22);
    ctx.fillStyle='rgba(12,10,9,.2)'; ctx.fillRect(0,c.height-58,c.width,58);

    // left squad platform
    ctx.fillStyle='rgba(239,236,226,.10)'; ctx.fillRect(20,158,112,46);
    // right enemy platform
    ctx.fillRect(234,48,110,46);

    // draw squad commander-like group
    const squad=['attack','defense','magic'];
    let activeSquad=[];
    roles.filter(r=>['attack','defense','magic'].includes(r.id)).forEach(r=>{ for(let i=0;i<Math.min(2,s.roles[r.id]);i++) activeSquad.push(r.id); });
    if(activeSquad.length===0) activeSquad = ['conditioning'];
    activeSquad.slice(0,3).forEach((id,i)=>{ const img=images[id] || images.attack; const x=36+i*28; const y=136 + (i===1?6:0); ctx.drawImage(img,x,y,44,44); });
    // commander silhouette from conditioning/combat as back hero
    const hero=images.combat || images.attack; ctx.drawImage(hero,72,116,54,54);

    // enemy + queue
    const enemyType=s.battle.enemy.type; const eimg=images[enemyType] || images.slime; const isBoss=s.battle.boss;
    const ex=isBoss?254:264, ey=isBoss?54:64, ew=isBoss?66:50, eh=isBoss?66:50; ctx.drawImage(eimg,ex,ey,ew,eh);
    const queue=s.battle.nextTypes||[];
    queue.slice(0,3).forEach((t,i)=>{ const qimg=images[t]||images.slime; ctx.globalAlpha=0.78; ctx.drawImage(qimg,250+i*28,132,24,24); ctx.globalAlpha=1; });

    // magic beams if magic assigned
    if(s.roles.magic>0){ ctx.strokeStyle='rgba(87,195,200,.95)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(100,145); ctx.lineTo(ex+18,ey+16); ctx.stroke(); }
    // labels
    ctx.fillStyle='#f0ece2'; ctx.font='bold 12px sans-serif'; ctx.fillText('CLONES', 24, 26); ctx.fillText(isBoss?'BOSS':'ENEMY', 292, 26);
    ctx.fillStyle='#d7cab0'; ctx.font='11px sans-serif'; ctx.fillText(`Free ${s.roles.generalist}`, 24, 40); ctx.fillText(`Next`, 254, 126);
  }
})();

