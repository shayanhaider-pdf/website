const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('../engine.js');
const scope={window:{},Image:class{},document:{querySelectorAll:()=>[]}};vm.runInNewContext(fs.readFileSync(require.resolve('../art.js'),'utf8'),scope);const A=scope.window.CloneArt;let depth=0;
const c={save(){depth++;},restore(){assert.ok(depth>0,'canvas restore must match a save');depth--;}};
for(const k of ['translate','scale','rotate','fillRect','strokeRect','beginPath','moveTo','lineTo','closePath','fill','stroke','arc','fillText','clearRect','drawImage'])c[k]=()=>{};
for(const id of ['sword','swords','coins','crate','crates','shield','heart','gear','home','dumbbell','hat','people','plus-person','skull','wand','pack','burst']){A.icon(c,id);assert.equal(depth,0,id+' must restore the drawing transform');}
for(let frame=0;frame<30;frame++){A.home(c,480,300,frame/30);A.flow(c,480,105,frame/30,true);A.train(c,480,160,frame/30);A.battle(c,480,450,frame/30,E.freshState(),E);assert.equal(depth,0,'animation frames must not leak transforms');}
console.log('PASS all pixel icons and 30 animation frames preserve canvas state');
