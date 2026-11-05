/* A little pencil universe. Local, deterministic canvas/SVG marks; no image requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StarstrikeSketch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const INK='#262626',TAU=Math.PI*2;
  const finite=(v,d=0)=>Number.isFinite(v)?v:d;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function path(c,p,close=false,fill=false){if(!p.length)return;c.beginPath();c.moveTo(...p[0]);for(let i=1;i<p.length;i++)c.lineTo(...p[i]);if(close)c.closePath();if(fill)c.fill();c.stroke();}
  function oval(c,x,y,rx,ry,a=0,fill=false){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),a,0,TAU);if(fill)c.fill();c.stroke();}
  function line(c,x,y,xx,yy){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
  function star(c,x,y,r,a=0,fill=true){const p=[];for(let i=0;i<10;i++){const q=a-Math.PI/2+i*Math.PI/5,s=r*(i%2?.43:1);p.push([x+Math.cos(q)*s,y+Math.sin(q)*s]);}path(c,p,true,fill);}
  function shield(c,x,y,r){c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.5,y-r*.63,x+r*.82,y-r*.67);c.quadraticCurveTo(x+r,y+r*.4,x,y+r);c.quadraticCurveTo(x-r,y+r*.42,x-r*.8,y-r*.7);c.quadraticCurveTo(x-r*.4,y-r*.58,x,y-r);c.fill();c.stroke();}
  function rocket(c,t){
    c.beginPath();c.moveTo(-12,14);c.bezierCurveTo(-19,-7,-11,-31,0,-42);c.bezierCurveTo(14,-30,21,-2,13,15);c.quadraticCurveTo(2,20,-12,14);c.fill();c.stroke();
    c.beginPath();c.moveTo(-10,-23);c.quadraticCurveTo(0,-19,11,-23);c.stroke();
    oval(c,0,-9,6.5,7.5,.05);c.lineWidth=1;oval(c,.4,-8.7,4.3,5.1,-.05);c.lineWidth=1.9;oval(c,1,7,4.7,5,-.12);
    c.beginPath();c.moveTo(-13,0);c.quadraticCurveTo(-28,9,-22,28);c.lineTo(-10,15);c.fill();c.stroke();
    c.beginPath();c.moveTo(15,1);c.quadraticCurveTo(28,13,22,29);c.lineTo(11,16);c.fill();c.stroke();
    path(c,[[-9,18],[-7,23],[8,23],[10,17]]);const f=Math.sin(t*11)*2;
    path(c,[[-5,25],[-7,34+f],[-2,30],[1,40-f],[5,30],[9,36+f],[7,25]]);
    c.lineWidth=.7;path(c,[[-15,12],[-18,-1],[-14,-20],[-4,-37]]);
  }
  function saucer(c,t){
    c.beginPath();c.moveTo(-21,-7);c.bezierCurveTo(-24,-37,23,-38,24,-7);c.quadraticCurveTo(2,-1,-21,-7);c.fill();c.stroke();
    c.beginPath();c.moveTo(-18,-10);c.quadraticCurveTo(-19,-26,-6,-28);c.stroke();oval(c,1,0,39,11,-.025,true);
    c.beginPath();c.moveTo(-34,5);c.quadraticCurveTo(-21,25,27,14);c.lineTo(36,5);c.fill();c.stroke();
    c.beginPath();c.moveTo(-32,5);c.quadraticCurveTo(0,15,34,4);c.stroke();
    for(let i=-2;i<=2;i++)oval(c,i*12,1+Math.abs(i)*-.8,2.6,2.9);
    path(c,[[-15,18],[-18,25],[-11,22]]);path(c,[[13,18],[19,25],[18,19]]);
    const f=Math.sin(t*8)*2;line(c,-7,23,-10,31+f);line(c,1,23,0,36-f);line(c,8,23,12,31+f);
    c.lineWidth=.65;c.beginPath();c.ellipse(1.5,1.5,39.5,11.5,-.025,.4,4.4);c.stroke();
  }
  function junker(c,t){
    path(c,[[-14,18],[-17,-19],[-8,-32],[10,-29],[18,-15],[15,19]],true,true);
    path(c,[[-16,-4],[-30,9],[-28,23],[-13,15]],true,true);path(c,[[17,-3],[33,12],[30,24],[15,16]],true,true);
    path(c,[[-9,-15],[9,-16],[10,-2],[-8,-1]],true);line(c,-3,-14,-3,-2);line(c,-8,-8,9,-9);
    path(c,[[-11,5],[12,4],[10,15],[-10,14]],true);line(c,-6,7,5,12);line(c,6,7,-6,12);
    path(c,[[9,-30],[15,-40],[22,-39]]);oval(c,24,-39,2.5,2.5);path(c,[[-7,20],[-8,25],[7,25],[8,20]]);
    const f=Math.sin(t*10)*2;path(c,[[-6,27],[-9,35+f],[-1,31],[2,40-f],[7,32],[10,35+f],[7,27]]);
    c.lineWidth=1;line(c,-23,12,-19,17);line(c,-25,15,-21,20);line(c,23,13,19,18);
  }
  function drawShip(c,id,x,y,size=60,t=0){
    c.save();c.translate(finite(x),finite(y));c.scale(size/85,size/85);c.lineCap='round';c.lineJoin='round';c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=1.9;
    if(id==='bastion')saucer(c,t);else if(id==='nomad')junker(c,t);else rocket(c,t);c.restore();
  }
  function drawRock(c,o){
    const r=finite(o.r,20),seed=finite(o.seed,finite(o.id,7));c.save();c.translate(o.x,o.y);c.rotate(finite(o.rot));c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=o.kind==='heavy'?2:1.65;
    const p=[];for(let i=0;i<11;i++){const a=i*TAU/11,s=r*(.85+.12*Math.sin(i*3.7+seed));p.push([Math.cos(a)*s,Math.sin(a)*s]);}path(c,p,true,true);
    c.lineWidth=.9;oval(c,-r*.32,-r*.22,r*.21,r*.17,-.3);oval(c,r*.35,r*.2,r*.15,r*.21,.8);if(r>23)oval(c,r*.25,-r*.4,r*.11,r*.08,.2);
    if(o.hp<o.maxHp)path(c,[[-r*.1,-r*.7],[r*.05,-r*.16],[-r*.15,r*.12],[r*.1,r*.52]]);
    if(o.kind==='heavy'){line(c,-r*.6,r*.25,-r*.36,r*.45);line(c,-r*.56,r*.4,-r*.34,r*.57);}c.restore();
  }
  function drawPickup(c,p,t){
    c.save();c.translate(p.x,p.y);c.rotate(Math.sin(t*2+finite(p.x))*.1);c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=1.7;
    if(p.type==='shield'){shield(c,0,0,finite(p.r,10));line(c,-3,0,0,4);line(c,0,4,5,-4);}
    else {star(c,0,0,finite(p.r,8));c.lineWidth=.65;line(c,-2,-1,0,-4);line(c,3,-2,2,2);}c.restore();
  }
  function drawBoss(c,b,t){
    c.save();c.translate(b.x,b.y);c.scale(finite(b.r,43)/43,finite(b.r,43)/43);c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=2;
    if(b.kind==='carrier'){
      path(c,[[-41,3],[-29,-17],[-17,-15],[-13,-28],[16,-26],[22,-14],[34,-13],[44,6],[29,22],[-28,23]],true,true);path(c,[[-34,9],[33,8]]);
      oval(c,-11,-3,5,7);oval(c,10,-4,5,7);c.fillStyle=INK;oval(c,-10,-2,1.1,2.4,0,true);oval(c,11,-3,1.1,2.4,0,true);c.fillStyle='#fff';
      for(const x of [-20,0,20])path(c,[[x-5,15],[x+5,14],[x+5,27],[x-4,27]],true,true);line(c,-5,-29,-8,-38);oval(c,-8,-39,2,2);
    }else if(b.kind==='leviathan'){
      c.beginPath();c.moveTo(-33,8);c.bezierCurveTo(-45,-48,40,-50,35,9);c.quadraticCurveTo(1,29,-33,8);c.fill();c.stroke();
      for(let i=0;i<5;i++){const x=(i-2)*13,f=Math.sin(t*2+i)*4;c.beginPath();c.moveTo(x-5,13);c.bezierCurveTo(x-10,25,x+10+f,39,x+f,45);c.quadraticCurveTo(x-11+f,48,x-8+f,38);c.stroke();}
      oval(c,-12,-9,7,9);oval(c,13,-10,7,9);c.fillStyle=INK;oval(c,-10,-7,2,3,0,true);oval(c,11,-8,2,3,0,true);c.fillStyle='#fff';
      c.beginPath();c.moveTo(-6,8);c.quadraticCurveTo(1,4,8,9);c.stroke();path(c,[[-24,-18],[-20,-22],[-16,-21]]);
    }else{
      star(c,0,0,44,-.08,true);c.lineWidth=1;star(c,1,1,34,-.08,false);c.lineWidth=2;oval(c,-8,-3,3,5);oval(c,8,-4,3,5);path(c,[[-8,8],[0,5],[8,8]]);
      c.lineWidth=.7;line(c,-3,-34,-5,-17);line(c,-28,18,-13,11);
    }c.restore();
  }
  function drawBullet(c,b){
    c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(finite(b.vy,-1),finite(b.vx))+Math.PI/2);c.strokeStyle=INK;c.fillStyle='#fff';
    const gatling=b.kind==='gatling',r=finite(b.r,gatling?1.5:3);c.lineWidth=gatling?1.25:1.8;
    if(b.kind==='fragment')path(c,[[-2,1],[2,-3],[3,3]],true,true);
    else if(gatling)line(c,0,-4,.5,3);
    else {c.beginPath();c.moveTo(-r,3);c.quadraticCurveTo(-r-1,-7,0,-9);c.quadraticCurveTo(r+1,-5,r,3);c.quadraticCurveTo(0,5,-r,3);c.fill();c.stroke();c.lineWidth=.6;line(c,0,-5,.3,1);}c.restore();
  }
  function drawBeam(c,b,ship,t){
    const x=finite(b.x,ship.x),y=finite(b.y,ship.y-26),end=finite(b.endY,y-finite(b.length,y)),w=Math.max(4,finite(b.width,14));
    c.save();c.globalAlpha=Number.isFinite(b.age)&&b.life?clamp(1-b.age/b.life,0,1):.95;c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=1.6;
    c.beginPath();c.moveTo(x-w/2,y);for(let yy=y;yy>end;yy-=22)c.lineTo(x-w/2+Math.sin(yy*.17+t*3)*1.5,yy);c.lineTo(x-w/2,end);c.lineTo(x+w/2,end);
    for(let yy=end;yy<y;yy+=22)c.lineTo(x+w/2+Math.sin(yy*.15+t*3+1)*1.4,yy);c.lineTo(x+w/2,y);c.closePath();c.fill();c.stroke();c.lineWidth=.7;
    for(let lane=-.2;lane<=.2;lane+=.2){c.beginPath();c.moveTo(x+w*lane,y);for(let yy=y;yy>end;yy-=16)c.lineTo(x+w*lane+Math.sin(yy*.15+lane*10)*1.1,yy);c.stroke();}
    line(c,x-w/2-4,y-8,x-w/2-8,y-15);line(c,x+w/2+4,y-8,x+w/2+8,y-15);c.restore();
  }
  function drawEffect(c,e){
    const fade=Number.isFinite(e.age)&&e.life?clamp(1-e.age/e.life,0,1):1,t=1-fade;
    c.save();c.globalAlpha=fade;c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=1.6;
    if(e.type==='lightning'){
      const x=finite(e.x),y=finite(e.y),xx=finite(e.toX,x),yy=finite(e.toY,y),dx=xx-x,dy=yy-y,len=Math.hypot(dx,dy)||1,n=Math.max(3,Math.ceil(len/14));
      c.lineWidth=2.4;c.beginPath();c.moveTo(x,y);for(let i=1;i<n;i++){const f=i/n,k=(i%2?1:-1)*(4+(i*7%5));c.lineTo(x+dx*f-dy/len*k,y+dy*f+dx/len*k);}c.lineTo(xx,yy);c.stroke();c.lineWidth=.7;line(c,xx-4,yy-5,xx+5,yy+4);
    }else if(e.type==='fragment'){
      const x=finite(e.x),y=finite(e.y),xx=finite(e.toX,x),yy=finite(e.toY,y);line(c,x+(xx-x)*t,y+(yy-y)*t,x+(xx-x)*Math.min(1,t+.15),y+(yy-y)*Math.min(1,t+.15));
    }else{
      c.translate(finite(e.x),finite(e.y));const r=finite(e.r,e.type==='explosion'?30:12);
      if(e.type==='explosion'){
        const p=[];for(let i=0;i<24;i++){const a=i*TAU/24,s=(i%2?.58:1)*r*(.45+t*.8);p.push([Math.cos(a)*s,Math.sin(a)*s]);}path(c,p,true,true);
        c.lineWidth=.9;oval(c,1,-1,r*(.35+t*.7),r*(.32+t*.68),-.1);
        for(let i=0;i<8;i++){const a=i*TAU/8+.22,d=r*(.9+t*1.3),x=Math.cos(a)*d,y=Math.sin(a)*d;path(c,[[x-2,y-2],[x+3,y],[x-1,y+4]],true,true);line(c,x*.6,y*.6,x*.85,y*.85);}
      }else if(e.type==='shield'){c.setLineDash([5,5]);oval(c,0,0,r*(.6+t),r*(.62+t),.1);}
      else {for(let i=0;i<7;i++){const a=i*TAU/7+.35,s=3+t*r*.7,end=s+5+(1-t)*r*.35;line(c,Math.cos(a)*s,Math.sin(a)*s,Math.cos(a)*end,Math.sin(a)*end);}}
    }c.restore();
  }
  function drawBarrels(c,s){
    const gun=s.weapons&&s.weapons.gatling;if(!gun||!gun.enabled)return;
    const count=clamp(Math.floor(finite(gun.barrels,1)),1,33),front=Math.min(count,5),ship=s.ship,positions=[];
    // Keep each drawn muzzle at the simulation's exact projectile origin.
    for(let i=0;i<front;i++)positions.push({x:(i-(front-1)/2)*8,y:-20,angle:-Math.PI/2});
    for(let i=0;i<count-front;i++){
      const pair=Math.floor(i/2),side=i%2===0?-1:1,angle=side<0?-Math.PI+pair*.27:-pair*.27;
      positions.push({x:Math.cos(angle)*24,y:Math.sin(angle)*24+pair*3,angle});
    }
    c.save();c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=1.3;
    const targets=s.boss&&s.boss.hp>0?[s.boss]:(s.rocks||[]).filter(r=>r.hp>0);
    for(const p of positions){
      const x=ship.x+p.x,y=ship.y+p.y;let target=null,nearest=600;
      for(const candidate of targets){const d=Math.hypot(candidate.x-x,candidate.y-y);if(d<nearest){target=candidate;nearest=d;}}
      const angle=target?Math.atan2(target.y-y,target.x-x):p.angle;
      c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);c.beginPath();c.rect(-1.7,0,3.4,10);c.fill();c.stroke();c.restore();
    }c.restore();
  }
  function drawFields(c,s,t){
    c.save();c.strokeStyle='#757575';c.lineWidth=.9;
    if(s.slowRadius>0&&s.slowStrength>0){const r=s.slowRadius;c.globalAlpha=.35;c.setLineDash([2,7]);oval(c,s.x,s.y,r,r,.02);c.setLineDash([]);c.globalAlpha=.7;const x=s.x+r*.73,y=s.y-r*.68;oval(c,x,y,6,6);line(c,x,y,x,y-3);line(c,x,y,x+3,y+1);}
    if(s.repel>0){c.globalAlpha=.35;for(let i=0;i<2;i++){const r=38+i*15+Math.sin(t*2)*1.5;c.beginPath();c.arc(s.x,s.y-9,r,Math.PI*1.16,Math.PI*1.84);c.stroke();}}c.restore();
  }
  function draw(c,s,width,height){
    if(!c||!s||!s.ship)return;c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';c.fillStyle='#fff';c.fillRect(0,0,width,height);c.strokeStyle=INK;c.fillStyle='#fff';c.lineCap='round';c.lineJoin='round';
    const t=finite(s.time),ship=s.ship;c.save();c.globalAlpha=.22;c.lineWidth=.8;
    for(let i=0;i<11;i++){const x=((i*131+47)%Math.max(1,width-32))+16,y=((i*173+163+t*(5+i%3))%(height+30))-15;if(i%3===0)star(c,x,y,3.5+i%2,i*.2,false);else{line(c,x-2,y,x+2,y);line(c,x,y-2,x,y+2);}}c.restore();
    drawFields(c,ship,t);for(const p of s.pickups||[])drawPickup(c,p,t);for(const o of s.rocks||[])drawRock(c,o);for(const b of s.beams||[])drawBeam(c,b,ship,t);if(s.boss)drawBoss(c,s.boss,t);
    if(s.laser){const laser=s.laser,w=finite(laser.width,22),x=finite(laser.x);c.save();c.strokeStyle=INK;c.lineWidth=laser.state==='active'?2:1;c.setLineDash(laser.state==='active'?[]:[7,6]);line(c,x-w/2,0,x-w/2,height);line(c,x+w/2,0,x+w/2,height);if(laser.state==='active'){c.lineWidth=.7;line(c,x-3,0,x+2,height);line(c,x+3,0,x-2,height);}c.restore();}
    for(const b of s.bullets||[])drawBullet(c,b);
    for(const p of s.bossShots||[]){c.save();c.strokeStyle=INK;c.fillStyle='#fff';c.lineWidth=1.7;if(p.type==='seeker'){c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx)+Math.PI/2);path(c,[[0,-7],[5,3],[3,7],[-4,7],[-5,3]],true,true);path(c,[[-3,8],[0,12],[3,8]]);}else star(c,p.x,p.y,finite(p.r,5),t*.5,true);c.restore();}
    if(ship.shield>0){c.save();c.strokeStyle=INK;c.lineWidth=1.2;const r=finite(ship.visualRadius,ship.r+15)+4;oval(c,ship.x,ship.y,r,r*1.08,-.04);c.globalAlpha=.3;c.lineWidth=.7;oval(c,ship.x+1,ship.y,r+2,r*1.08+1,.02);c.restore();}
    c.save();if(ship.invuln>0)c.globalAlpha=.55+Math.sin(t*23)*.2;const id=ship.type||'needle';drawShip(c,id,ship.x,ship.y,id==='bastion'?78:id==='nomad'?70:66,t);drawBarrels(c,s);c.restore();for(const e of s.effects||[])drawEffect(c,e);c.restore();
  }
  const head='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" fill="white" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const art={
    needle:'<path d="M49 85C41 61 52 29 65 17 80 33 90 63 80 86Q67 92 49 85Z"/><path d="M53 39Q66 45 78 40M49 66Q28 83 38 105L52 85M81 66Q99 86 91 106L78 86M54 90 57 97 75 97 78 89"/><ellipse cx="65" cy="57" rx="8" ry="9"/><ellipse cx="65.5" cy="57.5" rx="5.5" ry="6.5" stroke-width="1"/><ellipse cx="67" cy="77" rx="5.5" ry="6"/><path d="M59 100 55 111 63 106 67 120 72 107 80 114 76 100M44 83Q39 66 49 44L59 24" stroke-width="1"/><path d="m20 30 3 5 6-1-4 5 1 6-5-3-5 3 1-6-4-4 6-1ZM105 74l2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" stroke-width="1.2"/>',
    bastion:'<path d="M38 58C34 19 93 17 96 58Q68 64 38 58Z"/><path d="M44 53Q44 35 59 33" stroke-width="1"/><ellipse cx="67" cy="68" rx="48" ry="14" transform="rotate(-2 67 68)"/><path d="M24 74Q38 102 100 87L110 74Q67 90 24 74Z"/><path d="M48 94 43 105 54 101M83 94l10 11-2-10M58 105l-3 11M68 104v17M78 104l4 12"/><g stroke-width="1.5"><circle cx="37" cy="68" r="3.5"/><circle cx="51" cy="70" r="3.5"/><circle cx="67" cy="71" r="3.5"/><circle cx="83" cy="70" r="3.5"/><circle cx="98" cy="67" r="3.5"/></g><path d="m24 25 3 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1ZM108 38v8m-4-4h8" stroke-width="1.1"/>',
    nomad:'<path d="m49 91-4-46 13-16 23 4 10 17-4 42ZM46 65 25 82l4 20 20-12M90 65l21 20-4 18-20-12M56 44l23 1-1 20-22-2ZM56 74l23 1-1 12-22-1Z"/><path d="M67 45v19M57 54l22 1M59 78l15 6M75 78l-16 6M79 31l7-15 10 2"/><circle cx="100" cy="17" r="3"/><path d="m56 93 2 7 20 1 2-8M59 104l-5 11 10-5 5 15 5-13 10 6-5-14"/><path d="m34 84 6 6m-7-1 5 7m59-9-5 6m8-3-6 8M48 47l9-14M17 44v8m-4-4h8m84 65 3 5 5 1-4 4 1 5-5-3-4 3 1-5-4-4 5-1Z" stroke-width="1"/>'
  };
  function shipSVG(id){return head+(art[id]||art.needle)+'</svg>';}
  return{draw,drawShip,shipSVG};
});
