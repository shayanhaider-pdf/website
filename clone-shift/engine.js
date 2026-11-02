/* Clone Shift v0.5. Rules and migration notes: docs/v0.5.md. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CloneEngine=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const VERSION=5,KEY='clone_shift_v05';
const ROLES=[
{id:'attack',name:'Attack',effect:'Physical damage',mode:'workers',group:'offense',sprite:'attack',skill:'combat',min:1},
{id:'magic',name:'Magic',effect:'Magic damage',mode:'workers',group:'offense',sprite:'magic',skill:'arcane'},
{id:'defense',name:'Defense',effect:'Block incoming damage',mode:'workers',group:'defense',sprite:'defense',skill:'conditioning'},
{id:'scavenger',name:'Scavenging',effect:'Recover enemy loot',mode:'workers',group:'utility',sprite:'scavenger',skill:'scavenging',min:1},
{id:'processor',name:'Processing',effect:'Convert loot to credits',mode:'workers',group:'utility',sprite:'processor',skill:'processing',min:1},
{id:'combat',name:'Combat Training',effect:'+5% physical damage / level',mode:'training',group:'offense',sprite:'attack',skill:'combat',min:1},
{id:'arcane',name:'Arcane Training',effect:'+5% magic damage / level',mode:'training',group:'offense',sprite:'magic',skill:'arcane'},
{id:'conditioning',name:'Conditioning',effect:'+4% squad HP / level',mode:'training',group:'defense',sprite:'defense',skill:'conditioning'},
{id:'scavengeTrain',name:'Scavenging Training',effect:'+5% recovery speed / level',mode:'training',group:'utility',sprite:'scavenger',skill:'scavenging',min:1},
{id:'processTrain',name:'Processing Training',effect:'+5% processing speed / level',mode:'training',group:'utility',sprite:'processor',skill:'processing',min:1}
];
const SKILLS=['combat','conditioning','arcane','scavenging','processing'];
const UPGRADES=[
{id:'weapon',name:'Physical Output',desc:'+25% physical damage',base:40,mult:1.8,icon:'sword',group:'combat'},
{id:'focus',name:'Magic Output',desc:'+25% magic damage',base:42,mult:1.8,icon:'wand',group:'combat'},
{id:'armor',name:'Squad Armor',desc:'+24% maximum HP',base:45,mult:1.82,icon:'shield',group:'combat'},
{id:'block',name:'Guard Formation',desc:'+8% damage blocked',base:48,mult:1.86,icon:'shield',group:'combat'},
{id:'storage',name:'Loot Storage',desc:'+18 loot capacity',base:38,mult:1.76,icon:'crate',group:'economy'},
{id:'processors',name:'Processing Speed',desc:'+30% conversion speed',base:44,mult:1.84,icon:'gear',group:'economy'},
{id:'scavenging',name:'Scavenging Yield',desc:'+16% recovered loot yield',base:36,mult:1.78,icon:'pack',group:'economy'}
];
const STAGES=['Ruined Atrium','Abandoned Supermarket','Quarantine Hospital','Flooded Underground','Fallen City Center','The Black Gate'];
const ENEMIES=[
[{type:'slime',name:'Mold Slime',hp:28,atk:4,drop:3},{type:'spider',name:'Wire Spider',hp:34,atk:5,drop:4}],
[{type:'spider',name:'Market Crawler',hp:52,atk:6.5,drop:5},{type:'bat',name:'Dust Bat',hp:42,atk:7,drop:4}],
[{type:'brute',name:'Rotting Brute',hp:74,atk:8.5,drop:7},{type:'bat',name:'Ward Howler',hp:50,atk:9,drop:5}],
[{type:'brute',name:'Flood Walker',hp:86,atk:10,drop:8},{type:'spider',name:'Drain Crawler',hp:64,atk:10,drop:7}],
[{type:'brute',name:'City Revenant',hp:96,atk:12,drop:9},{type:'spider',name:'Abyss Arachnid',hp:82,atk:11,drop:8}],
[{type:'brute',name:'Gate Sentinel',hp:120,atk:15,drop:12},{type:'bat',name:'Void Bat',hp:90,atk:14,drop:10}]
];
const BOSSES=[{type:'brute',name:'Atrium Guardian',hp:150,atk:14,drop:18},{type:'brute',name:'Shopfront Ogre',hp:220,atk:18,drop:24},{type:'brute',name:'Moss Colossus',hp:300,atk:23,drop:34},{type:'brute',name:'Drowned Warden',hp:340,atk:25,drop:38},{type:'brute',name:'Fallen Giant',hp:390,atk:28,drop:42},{type:'brute',name:'Black Gate Warden',hp:440,atk:30,drop:48}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const nonneg=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;const integer=n=>Math.floor(nonneg(n));
function metrics(){return {elapsed:0,samples:[],totalKills:0,totalLoot:0,totalProcessed:0,totalCredits:0,discarded:0};}
function freshState(){const s={version:VERSION,testMode:true,credits:0,loot:0,groundLoot:0,awakenings:0,stage:1,stars:0,totalClones:20,maxClones:20,clonePurchases:0,overdriveCd:0,overdriveLeft:0,retreat:0,roles:{generalist:2,attack:5,defense:1,magic:2,scavenger:2,processor:2,combat:2,conditioning:1,arcane:1,scavengeTrain:1,processTrain:1},trainXp:Object.fromEntries(SKILLS.map(k=>[k,0])),trainLv:Object.fromEntries(SKILLS.map(k=>[k,0])),roleLv:{attack:0,magic:0,defense:0},upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),squadHp:0,battle:{enemy:null,kills:0,killsToBoss:7,boss:false},metrics:metrics(),lastSave:Date.now()};s.squadHp=maxHp(s);spawn(s);return s;}
function migrate(raw){if(!raw||typeof raw!=='object'||!raw.roles||!raw.upgrades||!raw.battle)throw Error('Invalid save');const s=JSON.parse(JSON.stringify(raw));const legacy=(s.version||0)<VERSION;
s.version=VERSION;s.testMode=s.testMode!==false;s.credits=nonneg(s.credits);s.loot=nonneg(s.loot);s.groundLoot=nonneg(s.groundLoot);s.stage=clamp(integer(s.stage)||1,1,STAGES.length);s.stars=clamp(integer(s.stars),0,5);s.awakenings=integer(s.awakenings);s.clonePurchases=integer(s.clonePurchases??Math.max(0,integer(s.maxClones)-4));
for(const r of ROLES)s.roles[r.id]=integer(s.roles[r.id]);s.roles.generalist=integer(s.roles.generalist);s.totalClones=Object.values(s.roles).reduce((a,n)=>a+integer(n),0);
if(legacy&&s.totalClones<20){s.roles.generalist+=20-s.totalClones;s.totalClones=20;}
for(const r of ROLES){const missing=Math.max(0,(r.min||0)-s.roles[r.id]);if(missing){const available=Math.min(missing,s.roles.generalist);s.roles.generalist-=available;s.roles[r.id]+=missing;s.totalClones+=missing-available;}}
if(s.roles.generalist<1){s.roles.generalist++;s.totalClones++;}s.maxClones=Math.max(s.totalClones,integer(s.maxClones));
s.trainLv=s.trainLv||{};s.trainXp=s.trainXp||{};s.roleLv=s.roleLv||{};
for(const k of SKILLS){s.trainLv[k]=integer(s.trainLv[k]??(k==='scavenging'?s.roleLv.scavenger:k==='processing'?s.roleLv.processor:0));s.trainXp[k]=nonneg(s.trainXp[k]);}
for(const u of UPGRADES)s.upgrades[u.id]=integer(s.upgrades[u.id]);s.overdriveCd=nonneg(s.overdriveCd);s.overdriveLeft=nonneg(s.overdriveLeft);s.retreat=nonneg(s.retreat);s.squadHp=clamp(nonneg(s.squadHp),0,maxHp(s));s.battle.kills=integer(s.battle.kills);s.battle.killsToBoss=7;s.battle.boss=!!s.battle.boss;s.metrics=metrics();
if(legacy||!s.battle.enemy||!Number.isFinite(s.battle.enemy.hp)||s.battle.enemy.hp<=0)spawn(s);
if(!s.squadHp&&!s.retreat)s.squadHp=maxHp(s);return s;}
function load(storage){for(const key of [KEY,'clone_shift_v04','clone_shift_v03']){try{const raw=storage.getItem(key);if(raw){const s=migrate(JSON.parse(raw));const away=Math.min(1200,Math.max(0,(Date.now()-nonneg(s.lastSave||Date.now()))/1000));const before=s.credits;advance(s,away,.2);s.offlineCredits=s.credits-before;s.metrics=metrics();s.lastSave=Date.now();return s;}}catch{}}return freshState();}
function save(s,storage){s.lastSave=Date.now();try{storage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
function available(s){return Math.max(0,s.roles.generalist-1);}
function cloneCost(s){return Math.ceil(80*Math.pow(1.58,s.clonePurchases));}
function upgradeCost(s,id){const u=UPGRADES.find(u=>u.id===id);return u?Math.ceil(u.base*Math.pow(u.mult,s.upgrades[id])):Infinity;}
function buyClone(s){const cost=cloneCost(s);if(s.credits+1e-8<cost)return false;s.credits=Math.max(0,s.credits-cost);s.totalClones++;s.maxClones++;s.clonePurchases++;s.roles.generalist++;return true;}
function assign(s,id,delta){const r=ROLES.find(r=>r.id===id);if(!r||![1,-1].includes(delta))return false;if(delta===1){if(!available(s))return false;s.roles.generalist--;s.roles[id]++;}else{if(s.roles[id]<=(r.min||0))return false;s.roles[id]--;s.roles.generalist++;}s.squadHp=Math.min(s.squadHp,maxHp(s));return true;}
function buyUpgrade(s,id){const cost=upgradeCost(s,id);if(s.credits+1e-8<cost)return false;s.credits=Math.max(0,s.credits-cost);s.upgrades[id]++;return true;}
function legacyBonus(s,id){return 1+nonneg(s.roleLv?.[id])*.05;}
function physicalDps(s){return 4.2*(s.roles.attack+s.roles.generalist*.18)*(1+s.upgrades.weapon*.25)*(1+s.awakenings*.12)*(1+s.trainLv.combat*.05)*legacyBonus(s,'attack');}
function magicDps(s){return 3.1*(s.roles.magic+s.roles.generalist*.1)*(1+s.upgrades.focus*.25)*(1+s.awakenings*.1)*(1+s.trainLv.arcane*.05)*legacyBonus(s,'magic');}
function totalDps(s){return (physicalDps(s)+magicDps(s))*(s.overdriveLeft>0?2:1);}
function maxHp(s){return Math.round((84+s.roles.defense*20)*(1+s.upgrades.armor*.24)*(1+s.trainLv.conditioning*.04));}
function blockPct(s){return clamp(s.roles.defense*.08*legacyBonus(s,'defense')+s.upgrades.block*.08,0,.72);}
function storageCap(s){return 24+s.upgrades.storage*18;}
function recoveryRate(s){return (s.roles.scavenger*3+s.roles.generalist*.12)*(1+s.trainLv.scavenging*.05);}
function processingRate(s){return (s.roles.processor*1.5+s.roles.generalist*.08)*(1+s.trainLv.processing*.05)*(1+s.upgrades.processors*.3);}
function lootYield(s){return 1+s.roles.scavenger*.18+s.upgrades.scavenging*.16;}
function creditValue(s){return Math.floor(4*Math.pow(1.34,s.stage-1));}
function spawn(s){const i=s.stage-1,pool=ENEMIES[i],tpl=s.battle.boss?BOSSES[i]:pool[s.battle.kills%pool.length],scale=Math.pow(1.24,i);s.battle.enemy={...tpl,maxHp:Math.round(tpl.hp*scale),hp:Math.round(tpl.hp*scale),atk:tpl.atk*(1+i*.14)};}
function defeat(s){const enemy=s.battle.enemy;s.groundLoot+=enemy.drop*lootYield(s);if(s.battle.boss){if(s.stage<STAGES.length){s.stage++;s.stars=Math.min(5,s.stars+1);}else{s.awakenings++;s.stars=5;}s.battle.kills=0;s.battle.boss=false;}else{if(++s.battle.kills>=s.battle.killsToBoss)s.battle.boss=true;}spawn(s);s.squadHp=maxHp(s);}
function addTraining(s,dt){for(const r of ROLES.filter(r=>r.mode==='training')){const k=r.skill;s.trainXp[k]+=s.roles[r.id]*dt*.45;while(s.trainXp[k]>=10){s.trainXp[k]-=10;s.trainLv[k]++;}}}
function record(s,dt,kills,loot,processed,credits){const m=s.metrics;m.elapsed+=dt;m.totalKills+=kills;m.totalLoot+=loot;m.totalProcessed+=processed;m.totalCredits+=credits;m.samples.push({dt,kills,loot,processed,credits,end:m.elapsed});while(m.samples.length&&m.samples[0].end<=m.elapsed-5)m.samples.shift();}
function observedRates(s){let t=0,kills=0,loot=0,processed=0,credits=0;for(const x of s.metrics.samples){t+=x.dt;kills+=x.kills;loot+=x.loot;processed+=x.processed;credits+=x.credits;}return t?{kills:kills/t,loot:loot/t,processed:processed/t,credits:credits/t}:{kills:0,loot:0,processed:0,credits:0};}
function tick(s,dt){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1);s.overdriveCd=Math.max(0,s.overdriveCd-dt);s.overdriveLeft=Math.max(0,s.overdriveLeft-dt);addTraining(s,dt);let kills=0,aliveDt=dt;
if(s.retreat>0){const recoveryTime=Math.min(dt,s.retreat);s.retreat=Math.max(0,s.retreat-dt);aliveDt-=recoveryTime;if(!s.retreat){s.squadHp=maxHp(s);s.battle.boss=false;s.battle.kills=0;spawn(s);}}
if(aliveDt>0){let damage=totalDps(s)*aliveDt;while(damage>1e-9){const hit=Math.min(s.battle.enemy.hp,damage);s.battle.enemy.hp-=hit;damage-=hit;if(s.battle.enemy.hp<=1e-8){defeat(s);kills++;}else break;if(kills>200)break;}
s.squadHp=Math.max(0,s.squadHp-s.battle.enemy.atk*(1-blockPct(s))*aliveDt);if(s.squadHp<=0)s.retreat=5;}
// Every displayed resource rate is recorded at the actual pipeline boundary.
const value=creditValue(s),capacity=processingRate(s)*dt;let processed=Math.min(s.loot,capacity);s.loot-=processed;
const loot=Math.min(s.groundLoot,recoveryRate(s)*dt,Math.max(0,storageCap(s)-s.loot));s.groundLoot-=loot;s.loot+=loot;
const extra=Math.min(s.loot,Math.max(0,capacity-processed));processed+=extra;s.loot-=extra;
const groundCap=storageCap(s)*2;if(s.groundLoot>groundCap){s.metrics.discarded+=s.groundLoot-groundCap;s.groundLoot=groundCap;}
const credits=processed*value;s.credits+=credits;record(s,dt,kills,loot,processed,credits);}
function advance(s,seconds,step=.1){for(let left=Math.max(0,seconds);left>1e-7;){const dt=Math.min(step,left,1);tick(s,dt);left-=dt;}}
function overdrive(s){if(s.overdriveCd>0||s.retreat>0)return false;s.overdriveCd=20;s.overdriveLeft=8;return true;}
return {VERSION,KEY,ROLES,SKILLS,UPGRADES,STAGES,freshState,migrate,load,save,available,cloneCost,upgradeCost,buyClone,assign,buyUpgrade,physicalDps,magicDps,totalDps,maxHp,blockPct,storageCap,recoveryRate,processingRate,lootYield,creditValue,observedRates,tick,advance,overdrive,spawn};
});
