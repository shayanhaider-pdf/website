
const JOBS = [
  {id:'attack',name:'Attack',group:'hunting',icon:'⚔',desc:'Physical damage'},
  {id:'defense',name:'Defense',group:'hunting',icon:'⬡',desc:'Guard and squad HP'},
  {id:'magic',name:'Magic',group:'hunting',icon:'✦',desc:'Automatic arcane damage'},
  {id:'combat',name:'Combat',group:'training',icon:'◆',desc:'Train physical damage'},
  {id:'conditioning',name:'Conditioning',group:'training',icon:'♥',desc:'Train squad health'},
  {id:'arcane',name:'Arcane',group:'training',icon:'✧',desc:'Train magic damage'},
  {id:'scavenge',name:'Scavenging',group:'collecting',icon:'◈',desc:'More loot per monster'},
  {id:'process',name:'Processing',group:'collecting',icon:'▣',desc:'Turn loot into Credits'}
];
const UPGRADE_DEFS = [
  {id:'power',name:'Combat Gear',desc:'+25% physical and magic damage',base:24,scale:1.78},
  {id:'capacity',name:'Echo Chamber',desc:'+4 maximum clones',base:58,scale:2.10},
  {id:'process',name:'Processing Tools',desc:'+35% processing speed',base:38,scale:1.78},
  {id:'scavenge',name:'Loot Scanner',desc:'+20% loot recovered',base:32,scale:1.85},
  {id:'training',name:'Practice Grounds',desc:'+25% training speed',base:40,scale:1.85},
  {id:'growth',name:'Echo Generator',desc:'+25% clone generation speed',base:45,scale:1.90},
  {id:'storage',name:'Storage Racks',desc:'+20 stored loot',base:33,scale:1.72}
];
const MAX_STAGE=3;
const R= x=>Math.round(x*100000)/100000;
const countClones=s=>Object.values(s.jobs).reduce((a,b)=>a+b,0);
const capacity=s=>10+s.upgrades.capacity*4;
const cost=(s,id)=>{const d=UPGRADE_DEFS.find(x=>x.id===id);return d?Math.ceil(d.base*d.scale**s.upgrades[id]):Infinity;};
const contribution=(s,id)=>0.12*s.jobs.generalist+1.3*s.jobs[id];
const trainLevel=(s,id)=>Math.min(40,Math.floor(s.training[id]));
function createInitialState(awakenings=0){
  return {version:1,started:false,paused:false,finished:false,awakenings,credits:38,loot:0,stage:1,kills:0,bossReady:false,bossActive:false,
  jobs:Object.fromEntries(['generalist',...JOBS.map(j=>j.id)].map(k=>[k,k==='generalist'?5:0])),
  upgrades:Object.fromEntries(UPGRADE_DEFS.map(d=>[d.id,0])),
  training:{combat:0,conditioning:0,arcane:0},
  health:0,enemy:null,spawnDelay:0,retreat:0,cloneTimer:0,manualCooldown:0,burstRemaining:0,burstCooldown:0,
  totals:{earned:0,kills:0},events:['Your clone operation is ready.'],elapsed:0};
}
function addEvent(s,message){s.events.unshift(message);s.events=s.events.slice(0,5);}
function metrics(s){
 const atk=contribution(s,'attack'),def=contribution(s,'defense'),mag=contribution(s,'magic');
 const trainCombat=trainLevel(s,'combat'),trainCondition=trainLevel(s,'conditioning'),trainMagic=trainLevel(s,'arcane');
 const awaken=1+s.awakenings*0.12;
 const damageMultiplier=(1+s.upgrades.power*0.25)*awaken;
 const damage=(2+atk*7.2)*(1+trainCombat*0.055)*damageMultiplier;
 const magicDamage=mag*8.6*(1+trainMagic*0.065)*damageMultiplier;
 const healthMax=(70+def*28)*(1+trainCondition*0.08);
 const mitigation=Math.min(0.58,def*0.10);
 const trainingRate=(1+s.upgrades.training*0.25)*(1+s.awakenings*0.06)/10;
 const lootFactor=(1+contribution(s,'scavenge')*0.18)*(1+s.upgrades.scavenge*0.20);
 const processRate=(0.18+contribution(s,'process')*0.95)*(1+s.upgrades.process*0.35);
 const storageMax=24+s.upgrades.storage*20;
 const cloneInterval=12/(1+s.upgrades.growth*0.25)/(1+s.awakenings*.08);
 const price=Math.max(1,Math.floor(7*Math.pow(1.48,s.stage-1)));
 return {damage,magicDamage,dps:(damage+magicDamage)*(s.burstRemaining>0?2:1),healthMax,mitigation,trainingRate,lootFactor,processRate,storageMax,cloneInterval,price,atk,def,mag};
}
function makeEnemy(s,isBoss=false){
 const hp=Math.round(120*Math.pow(1.64,s.stage-1)*(isBoss?4.8:1));
 return {hp,maxHp:hp,isBoss,damage:6*Math.pow(1.18,s.stage-1)*(isBoss?1.5:1),attackTimer:0};
}
function start(s){if(s.started)return; s.started=true;s.health=metrics(s).healthMax; s.enemy=makeEnemy(s);addEvent(s,'Your clones entered the first gate.');}
function reassign(s,job,delta){
 if(job!=='generalist'&&!JOBS.some(j=>j.id===job))return false;
 if(delta>0){if(s.jobs.generalist<1||job==='generalist')return false;s.jobs.generalist--;s.jobs[job]++;}
 else {if(s.jobs[job]<1||job==='generalist')return false;s.jobs[job]--;s.jobs.generalist++;}
 s.health=Math.min(s.health,metrics(s).healthMax);return true;
}
function buy(s,id){if(!s.started||s.finished)return false;const price=cost(s,id);if(s.credits+1e-9<price)return false;s.credits-=price;s.upgrades[id]++;addEvent(s,`${UPGRADE_DEFS.find(x=>x.id===id).name} upgraded.`);return true;}
function summon(s){if(!s.started||s.finished||s.paused||s.manualCooldown>0||countClones(s)>=capacity(s))return false;s.jobs.generalist++;s.manualCooldown=6;addEvent(s,'A fresh clone joins as a Generalist.');return true;}
function burst(s){if(!s.started||s.finished||s.paused||s.burstCooldown>0)return false;s.burstRemaining=10;s.burstCooldown=60;addEvent(s,'Overdrive activated: double damage!');return true;}
function challenge(s){if(!s.bossReady||s.bossActive||s.finished)return false;s.bossReady=false;s.bossActive=true;s.enemy=makeEnemy(s,true);s.health=metrics(s).healthMax;addEvent(s,'Gate Guardian appears!');return true;}
function awaken(s){if(!s.finished)return false;const next=createInitialState(s.awakenings+1);Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,next);addEvent(s,'Awakening complete: +12% permanent damage.');return true;}
function onKill(s,m){
 const boss=s.enemy.isBoss;
 const amount=(boss?12:2)*m.lootFactor;
 s.totals.kills++;
 if(boss){const reward=amount*m.price;s.credits+=reward;s.totals.earned+=reward;s.enemy=null;s.finished=true;s.bossActive=false;addEvent(s,`Guardian defeated! +${Math.floor(reward)} Credits. Awakening unlocked.`);return;}
 s.loot=Math.min(m.storageMax,s.loot+amount);
 s.kills++;
 if(s.kills>=4){s.kills=0;
   if(s.stage===MAX_STAGE){s.enemy=null;s.bossReady=true;addEvent(s,'Stage 3 cleared. Challenge the Guardian!');return;}
   s.stage++;addEvent(s,`Gate ${s.stage} unlocked.`);
 }
 s.enemy=null;s.spawnDelay=0.5;
}
function step(s,dt){
 if(!s.started||s.paused||s.finished||dt<=0)return;
 dt=Math.min(dt,1);
 s.elapsed+=dt;
 s.manualCooldown=Math.max(0,s.manualCooldown-dt);
 s.burstCooldown=Math.max(0,s.burstCooldown-dt);
 s.burstRemaining=Math.max(0,s.burstRemaining-dt);
 s.cloneTimer+=dt;
 let m=metrics(s);
 if(countClones(s)<capacity(s) && s.cloneTimer>=m.cloneInterval){s.jobs.generalist++;s.cloneTimer-=m.cloneInterval;addEvent(s,'A new clone was generated.');}
 if(countClones(s)>=capacity(s))s.cloneTimer=Math.min(s.cloneTimer,m.cloneInterval);
 for(const k of ['combat','conditioning','arcane'])s.training[k]=Math.min(40,s.training[k]+contribution(s,k)*m.trainingRate*dt);
 m=metrics(s);
 s.health=Math.min(m.healthMax,s.health+0.5*dt);
 if(s.loot>0){const amount=Math.min(s.loot,m.processRate*dt);s.loot=Math.max(0,s.loot-amount);const income=amount*m.price;s.credits+=income;s.totals.earned+=income;}
 if(s.retreat>0){s.retreat=Math.max(0,s.retreat-dt);if(s.retreat===0){s.health=m.healthMax;if(!s.bossReady){s.enemy=makeEnemy(s,s.bossActive);}}return;}
 if(s.bossReady)return;
 if(!s.enemy){s.spawnDelay=Math.max(0,s.spawnDelay-dt);if(s.spawnDelay===0)s.enemy=makeEnemy(s,s.bossActive);return;}
 if(m.atk+m.mag < 0.0001)return;
 s.enemy.hp-=m.dps*dt;
 if(s.enemy.hp<=0){onKill(s,m);return;}
 s.enemy.attackTimer+=dt;
 if(s.enemy.attackTimer>=4){s.enemy.attackTimer-=4;s.health-=s.enemy.damage*(1-m.mitigation);if(s.health<=0){s.health=0;s.retreat=8;s.enemy=null;addEvent(s,'Your squad retreated. Recovery underway.');}}
}
function advanceOffline(s,seconds){if(!s.started||s.finished||s.paused)return 0;let time=Math.min(1800,Math.max(0,seconds));const before=s.credits;let steps=Math.ceil(time);for(let i=0;i<steps;i++)step(s,Math.min(1,time-i));return Math.max(0,s.credits-before);}
function isValidSave(s){try{return s.version===1&&Number.isFinite(s.credits)&&s.credits>=0&&s.stage>=1&&s.stage<=3&&Number.isInteger(s.awakenings)&&s.awakenings>=0&&JOBS.every(j=>Number.isInteger(s.jobs[j.id])&&s.jobs[j.id]>=0)&&Number.isInteger(s.jobs.generalist)&&s.jobs.generalist>=0&&countClones(s)<=capacity(s)&&UPGRADE_DEFS.every(d=>Number.isInteger(s.upgrades[d.id])&&s.upgrades[d.id]>=0)&&['combat','conditioning','arcane'].every(k=>Number.isFinite(s.training[k])&&s.training[k]>=0); }catch{return false;}}

const SAVE_KEY='clone-shift-v1';
let s=createInitialState();
let showHelp=false;
try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(saved&&isValidSave(saved.state)){s=saved.state;const earned=advanceOffline(s,Math.min(1800,(Date.now()-saved.timestamp)/1000));if(earned>2) s.events.unshift(`Offline earnings: ${Math.floor(earned)} Credits.`);}}catch{}
const el=id=>document.getElementById(id);
const fmt=n=>Math.abs(n)>=1e9?(n/1e9).toFixed(2)+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(2)+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(n>=1e5?0:1)+'K':Math.floor(n).toLocaleString('en-US');
const safe=n=>Number.isFinite(n)?n:0;
const groupNames={hunting:'01 / HUNTING',training:'02 / TRAINING',collecting:'03 / COLLECTING'};
let lastMarkup='';
function drawJobs(){let html='';for(const group of ['hunting','training','collecting']){
 const arr=JOBS.filter(x=>x.group===group);const total=arr.reduce((a,j)=>a+s.jobs[j.id],0);
 html+=`<div class="group-heading"><span>${groupNames[group]}</span><span>${total} assigned</span></div><div class="job-grid">`;
 for(const j of arr)html+=`<div class="job-row" title="${j.desc}"><div class="job-info"><span class="job-icon ${group}">${j.icon}</span><span><b>${j.name}</b><small>${j.desc}</small></span></div><div class="job-controls"><button data-action="unassign" data-job="${j.id}" aria-label="Unassign one ${j.name} clone" ${s.jobs[j.id]<=0?'disabled':''}>−</button><strong>${s.jobs[j.id]}</strong><button data-action="assign" data-job="${j.id}" aria-label="Assign one ${j.name} clone" ${s.jobs.generalist<=0?'disabled':''}>+</button></div></div>`;
 html+='</div>';
 }if(html!==lastMarkup){el('jobs').innerHTML=html;lastMarkup=html;}}
function drawUpgrades(){el('upgrades').innerHTML=UPGRADE_DEFS.map(d=>{const price=cost(s,d.id);return `<div class="shop-row"><div class="shop-text"><b>${d.name}</b><small>${d.desc}</small><em>LEVEL ${s.upgrades[d.id]}</em></div><button class="buy" data-action="buy" data-upgrade="${d.id}" ${!s.started||s.finished||s.credits<price?'disabled':''}>◈ ${fmt(price)}</button></div>`}).join('');}
function drawTraining(){const types=[['combat','Combat','+5.5% Physical / lvl'],['conditioning','Conditioning','+8% Health / lvl'],['arcane','Magic','+6.5% Magic / lvl']];el('trainingLevels').innerHTML=types.map(([k,name,desc])=>{const lev=trainLevel(s,k),percent=s.training[k]>=40?100:(s.training[k]%1)*100;return `<div class="training-row"><div class="training-text"><b>${name}</b><small>${desc}</small></div><div class="training-progress"><div class="training-fill" style="width:${percent.toFixed(2)}%"></div></div><span class="training-level">Lv ${lev}</span></div>`;}).join('');}
function render(){const m=metrics(s);el('introOverlay').classList.toggle('hidden',s.started);el('helpOverlay').classList.toggle('hidden',!showHelp);
 el('credits').textContent=fmt(s.credits);el('creditRate').textContent=`+${(Math.min(s.loot>0?m.processRate:0,m.processRate)*m.price).toFixed(1)} potential / sec`;
 el('clones').textContent=`${countClones(s)} / ${capacity(s)}`;el('cloneRate').textContent=countClones(s)>=capacity(s)?'Capacity reached':`Next in ${Math.ceil(Math.max(0,m.cloneInterval-s.cloneTimer))}s`;
 el('loot').textContent=`${s.loot.toFixed(1)} / ${m.storageMax}`;el('storageState').textContent=s.loot>=m.storageMax-.1?'Storage full · upgrade or process':`Process ${m.processRate.toFixed(1)} loot / sec`;
 el('stageLabel').textContent=`${s.stage} / ${MAX_STAGE}`;el('gateProgress').textContent=s.finished?'Boss defeated':s.bossReady?'Guardian waiting':`${s.kills}/4 defeated`;
 el('gateTitle').textContent=['','Gate 01 · Shadow Alley','Gate 02 · Neon Underpass','Gate 03 · Rift Terminal'][s.stage];
 let status=s.finished?'VICTORY':s.paused?'PAUSED':s.bossReady?'GUARDIAN READY':s.retreat>0?'RECOVERING':s.bossActive?'BOSS FIGHT':'AUTO-HUNTING';el('combatStatus').textContent=status;el('combatStatus').classList.toggle('danger',status==='BOSS FIGHT'||status==='RECOVERING');
 el('healthLabel').textContent=`${Math.ceil(safe(s.health))} / ${Math.ceil(m.healthMax)} HP`;el('healthBar').style.width=`${Math.max(0,Math.min(100,100*s.health/m.healthMax))}%`;
 el('enemyTitle').textContent=s.bossReady?'GUARDIAN WAITING':s.bossActive?'GATE GUARDIAN':'GATE CREATURE';el('enemyLabel').textContent=s.enemy?`${Math.ceil(s.enemy.hp)} / ${s.enemy.maxHp} HP`:(s.bossReady?'CHALLENGE TO START':'—');
 el('enemyBar').style.width=`${s.enemy?Math.max(0,100*s.enemy.hp/s.enemy.maxHp):0}%`;
 el('dps').textContent=fmt(m.dps);el('damageBlock').textContent=`${Math.round(m.mitigation*100)}%`;
 el('generalists').textContent=s.jobs.generalist;
 el('challengeButton').hidden=!s.bossReady;el('awakenButton').hidden=!s.finished;
 el('summonButton').disabled=!s.started||s.finished||s.paused||s.manualCooldown>0||countClones(s)>=capacity(s);
 el('summonSub').textContent=countClones(s)>=capacity(s)?'Capacity reached':s.manualCooldown>0?`Ready in ${Math.ceil(s.manualCooldown)} sec`:'+1 Generalist · 6-sec cooldown';
 el('burstButton').disabled=!s.started||s.finished||s.paused||s.burstCooldown>0;
 el('burstSub').textContent=s.burstRemaining>0?`Active · ${Math.ceil(s.burstRemaining)} sec`:(s.burstCooldown>0?`Ready in ${Math.ceil(s.burstCooldown)} sec`:'Double damage · 10 sec');
 el('pauseButton').textContent=s.paused?'▶ Resume':'Ⅱ Pause';el('pauseButton').disabled=!s.started||s.finished;
 el('awakenings').textContent=`✦ ${s.awakenings} Awakening${s.awakenings===1?'':'s'}`;
 el('eventLog').innerHTML=(s.events||[]).slice(0,4).map(ev=>`<li>${String(ev).replace(/[<&]/g,'')}</li>`).join('');drawJobs();drawUpgrades();drawTraining();
}
let toastTimer=0;
function notify(msg){const t=el('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2600);}
document.addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const a=btn.dataset.action;let changed=false;
 switch(a){case 'start':start(s);changed=true;break;case 'assign':changed=reassign(s,btn.dataset.job,1);break;case 'unassign':changed=reassign(s,btn.dataset.job,-1);break;case 'buy':changed=buy(s,btn.dataset.upgrade);break;case 'summon':changed=summon(s);break;case 'burst':changed=burst(s);break;case 'challenge':changed=challenge(s);break;case 'awaken':changed=awaken(s);break;case 'pause':s.paused=!s.paused;changed=true;break;case 'help':showHelp=true;changed=true;break;case 'close-help':showHelp=false;changed=true;break;case 'all-generalist':{let moved=0;for(const j of JOBS){moved+=s.jobs[j.id];s.jobs.generalist+=s.jobs[j.id];s.jobs[j.id]=0;}changed=moved>0;break;}}
 if(changed){render();save();}else if(['assign','unassign','summon','buy'].includes(a))notify('Not available yet. Check your free clones, cooldown or Credits.');
});
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({timestamp:Date.now(),state:s}));}catch{}}
let screen=el('battle'),ctx=screen.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=240,H=100;const off=document.createElement('canvas');off.width=W;off.height=H;const c=off.getContext('2d');c.imageSmoothingEnabled=false;
let startTime=performance.now(),flash=0;
function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function outline(x,y,w,h,fill,stroke){rect(x-1,y-1,w+2,h+2,stroke);rect(x,y,w,h,fill);}
function cloneSprite(x,y,color,offset,t,scale=1){c.save();c.translate(Math.round(x),Math.round(y)+Math.sin(t*2+offset)*1.2);c.scale(scale,scale);rect(-6,25,18,3,'#08112577');rect(-1,13,4,12,'#152c40');rect(7,13,4,12,'#152c40');outline(-4,1,13,15,color,'#16223e');rect(6,6,5,3,'#8cdee8');rect(-1,-10,13,11,'#dfb9a5');rect(-3,-12,14,5,'#24354c');rect(1,-1,3,2,'#3b5065');rect(8,-1,2,2,'#3b5065');rect(-7,4,4,9,'#e6b49b');rect(8,4,4,9,'#e6b49b');rect(11,7,9,2,'#b4d5eb');c.restore();}
function monster(x,y,t,isBoss){c.save();c.translate(x,y+Math.sin(t*2)*2);let scale=isBoss?1.5:1;c.scale(scale,scale);rect(-20,25,36,3,'#08112577');rect(-15,-6,28,30,'#7153a4');rect(-18,0,35,17,'#8468bb');rect(-10,-17,22,15,'#826bbd');rect(-14,-23,7,15,'#b795ea');rect(4,-23,7,15,'#b795ea');rect(-9,-9,5,4,'#f9d289');rect(4,-9,5,4,'#f9d289');rect(-5,2,13,4,'#524475');rect(-23,2,9,6,'#554487');rect(14,2,8,6,'#554487');rect(-10,24,7,6,'#4d3d73');rect(5,24,7,6,'#4d3d73');if(isBoss){rect(-18,-32,35,4,'#ba91fc');rect(-4,-39,9,8,'#e7bffd');}c.restore();}
function drawBattle(now){const t=(now-startTime)/1000;let m=metrics(s);const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#13284c');grad.addColorStop(.7,'#20385b');grad.addColorStop(1,'#243450');c.fillStyle=grad;c.fillRect(0,0,W,H);
 // pixel twilight skyline and luminous gate
 for(let i=0;i<9;i++){const x=i*31-6,h=15+((i*17)%32);rect(x,69-h,21,h,'#14243e');rect(x+4,74-h,3,3,'#2f5674');}
 for(let i=0;i<30;i++){const x=(i*67+19)%W,y=4+(i*19)%44;rect(x,y,1,1,i%3===0?'#77a2d1':'#456689');}
 rect(0,78,W,22,'#31445a');rect(0,78,W,2,'#627084');for(let x=0;x<W;x+=20){rect(x,85,16,1,'#374c64');rect(x+8,95,14,1,'#26394e');}
 // atmospheric gate behind monster
 c.globalAlpha=.45+.12*Math.sin(t*2);rect(189,22,31,51,'#42549c');rect(193,25,23,45,'#8878d5');rect(197,27,15,41,'#bda3eb');c.globalAlpha=1;
 const fighters=[];for(const [kind,col] of [['attack','#df716e'],['defense','#63c9cd'],['magic','#9e7ade']]){if(s.jobs[kind]>0)fighters.push(col);}if(s.jobs.generalist>0)fighters.unshift('#8c9dc5');
 fighters.slice(0,4).forEach((color,i)=>cloneSprite(24+i*21,63,color,i,t,.82));
 if(s.enemy)monster(195,54,t,s.enemy.isBoss);
 if(!s.started){rect(69,36,103,22,'#102039');c.fillStyle='#a8d9e8';c.font='8px monospace';c.fillText('PRESS START TO HUNT',74,49);}
 if(s.bossReady){rect(64,31,112,25,'#2b274b');c.fillStyle='#e2c4ff';c.font='8px monospace';c.fillText('GUARDIAN AWAITS',77,46);}
 if(s.retreat>0){rect(67,33,106,20,'#3e2940');c.fillStyle='#ffbdcb';c.font='8px monospace';c.fillText('SQUAD RECOVERING',74,46);}
 if(s.finished){rect(63,32,114,26,'#204b56');c.fillStyle='#98f6e5';c.font='9px monospace';c.fillText('GATE CLEARED!',87,48);}
 // damage animations, small projectile and hit flashes
 if(s.enemy && !s.paused){const projectile=Math.floor((t*35)%150);rect(81+projectile,47+Math.sin(t*10)*5,5,3,s.burstRemaining>0?'#ffe6aa':'#c9a4ff');if(Math.sin(t*9)>.83){rect(177,44,5,9,'#f2deff');rect(184,47,8,3,'#f2deff');}}
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,screen.width,screen.height);ctx.drawImage(off,0,0,screen.width,screen.height);
}
let last=performance.now(),lastUI=0,lastSave=Date.now();function loop(now){const dt=Math.min(0.1,(now-last)/1000);last=now;step(s,dt);drawBattle(now);if(now-lastUI>170){render();lastUI=now;}if(Date.now()-lastSave>4000){save();lastSave=Date.now();}requestAnimationFrame(loop);}
render();requestAnimationFrame(loop);window.addEventListener('pagehide',save);window.addEventListener('visibilitychange',()=>{if(document.hidden)save();});

