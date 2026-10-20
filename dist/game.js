import {COLS,ROWS,CELL,key,decode,neighbors,findRoute,lineCells,CITIES,random,riverX,isWater} from './engine.js';

const $=s=>document.querySelector(s),canvas=$('#city'),ctx=canvas.getContext('2d');
const COLORS=['#df8a35','#df5965','#5e9dc9','#9b78bd','#50a68f'];
const SAVE='roundabout-recreation-v1',BEST='roundabout-recreation-best';
const icons={
 road:'<path d="M8 3 4 21M16 3l4 18M12 4v3m0 4v3m0 4v3"/>',
 bridge:'<path d="M2 15h20M7 4v16M17 4v16M2 12 7 4q5 13 10 0l5 8M2 21q3-3 6 0t6 0t6 0"/>',
 motorway:'<path d="M2 5h20M2 19h20M4 9l4 3-4 3m7-6 4 3-4 3m7-3h4"/>',
 erase:'<path d="m3 14 9-10 9 8-8 9H9zM8 9l9 8M9 21h12"/>',
 roundabout:'<circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 0 1 10 9m0-6v6h-5M12 22A10 10 0 0 1 2 13m0 6v-6h5"/>',
 light:'<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1" fill="#e36b61"/><circle cx="12" cy="12" r="1" fill="#edc24b"/><circle cx="12" cy="17" r="1" fill="#71b584"/>'
};
const svg=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]}</svg>`;
const TOOLS=[['road','Road','1'],['bridge','Bridge','2'],['motorway','Motorway','3'],['erase','Erase','4'],['roundabout','Roundabout','5'],['light','Traffic light','6']];
const SHOP=[['road','Road crew','25 road tiles',8,25],['bridge','Bridge','1 bridge + 10 roads',14,1],['motorway','Motorway','8 motorway tiles',18,8],['roundabout','Roundabout','1 smoother junction',10,1],['light','Traffic lights','2 traffic lights',10,2]];
let state=null,screen='welcome',tool='road',drag=null,panKey=false,paused=false,dialogOpen=false,wasPaused=false,lastTime=0,spawnClock=0,saveClock=0,toastTimer;
let width=innerWidth,height=innerHeight,dpr=1,view={scale:1,x:0,y:0},hover=null,sound=false,audio=null,tutorial=0;
let scenery=[],rng=random(3),best={},hasActiveRun=false;
try{best=JSON.parse(localStorage.getItem(BEST)||'{}');}catch{}

function createState(city){
 return{city:city.id,roads:{},buildings:[{x:12,y:9,color:0,type:'house',demand:0,spawn:0},{x:15,y:9,color:0,type:'factory',demand:1,spawn:0}],cars:[],inventory:{road:40,bridge:2,motorway:0,roundabout:1,light:2},trips:0,coins:0,week:1,time:0,expanded:0,over:false};
}
const city=()=>CITIES.find(c=>c.id===state?.city)||CITIES[0];
function setupScenery(){rng=random(city().seed);scenery=[];for(let n=0;n<72;n++){let x=rng()*COLS,y=rng()*ROWS;if(!isWater(x,y,city())&&Math.hypot(x-13,y-9)>3)scenery.push({x,y,r:9+rng()*10,t:rng()});}}
function fit(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;const s=Math.max(width/(COLS*CELL),height/(ROWS*CELL));view={scale:s,x:(width-COLS*CELL*s)/2,y:(height-ROWS*CELL*s)/2};if(width<600){view.scale=Math.max(width/720,height/1150);view.x=width/2-14*CELL*view.scale;view.y=height*.43-10*CELL*view.scale;}}
addEventListener('resize',fit);fit();
function persist(){if(!hasActiveRun||!state||state.over)return;try{localStorage.setItem(SAVE,JSON.stringify({...state,cars:[]}));}catch{}}
function load(){try{const value=JSON.parse(localStorage.getItem(SAVE));if(value&&CITIES.some(c=>c.id===value.city)&&Array.isArray(value.buildings)&&value.inventory&&value.roads){state=value;state.cars=[];hasActiveRun=true;return true;}}catch{}return false;}
function notify(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function beep(pitch=440){if(!sound)return;try{audio ||= new AudioContext();audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=pitch;gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.13);}catch{}}
function setScreen(next){screen=next;$('#welcome').hidden=next!=='welcome';$('#menu').hidden=next!=='menu';$('#hud').hidden=next!=='game';$('#controls').hidden=next!=='game';$('#coach').hidden=next!=='game'||tutorial>=3;$('#toast').hidden=true;}
function start(id){state=createState(CITIES.find(c=>c.id===id));hasActiveRun=true;paused=false;spawnClock=0;saveClock=0;tutorial=id==='bali'?0:3;tool='road';setupScenery();fit();setScreen('game');updateUI();updateCoach();persist();canvas.focus();}
function updateUI(){
 if(!state)return;
 $('#score').textContent=`Trips ${state.trips} · Week ${state.week}`;$('#coins').textContent=state.coins;
 let hour=8+Math.floor(state.time*4/60),minute=Math.floor(state.time*4)%60;hour%=24;
 $('#clock').textContent=`${hour>=6&&hour<19?'☀':'☾'} ${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`;
 $('#pause span').textContent=paused?'Resume':'Pause';
 for(const[id]of TOOLS){const b=$(`#tool-${id}`);b.classList.toggle('active',tool===id);b.setAttribute('aria-pressed',String(tool===id));b.querySelector('.count').textContent=id==='erase'?'':state.inventory[id];b.disabled=!['road','erase'].includes(id)&&state.inventory[id]<=0;}
}
function selectTool(id){if(!['road','erase'].includes(id)&&state.inventory[id]<=0){notify('Pick up more supplies at the workshop.');return;}tool=id;updateUI();}
$('#tools').innerHTML=TOOLS.map(([id,label,shortcut])=>`<button id="tool-${id}" title="${label} (${shortcut})" aria-label="${label}" aria-pressed="false">${svg(id)}<small>${label}</small><span class="count"></span></button>`).join('');
TOOLS.forEach(([id])=>$(`#tool-${id}`).onclick=()=>selectTool(id));

function renderMenu(){
 $('#resume').hidden=!state||state.over;$('#city-list').innerHTML=CITIES.map(c=>`<button class="city-card" data-city="${c.id}"><canvas width="420" height="190" aria-hidden="true"></canvas><div class="city-words"><strong>${c.name}</strong><small>${c.caption}</small><small class="level">${best[c.id]?`Best: ${best[c.id]} trips · `:''}${c.difficulty}</small></div></button>`).join('');
 document.querySelectorAll('.city-card').forEach(b=>{preview(b.querySelector('canvas'),CITIES.find(c=>c.id===b.dataset.city));b.onclick=()=>{if(state&&!state.over&&state.trips>0){showDialog('Start a new city?',`<div class="prose"><p>Your current run will be replaced. Your best score will stay saved.</p><button class="primary" id="confirm-new">Start ${CITIES.find(c=>c.id===b.dataset.city).name}</button></div>`);$('#confirm-new').onclick=()=>{closeDialog();start(b.dataset.city);};}else start(b.dataset.city);};});
}
function preview(c,config){const g=c.getContext('2d');g.fillStyle='#dfdfd8';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#92bfd6';g.lineWidth=38;g.beginPath();for(let y=0;y<=200;y+=4){const x=riverX(y/9,config)*12; y?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();const r=random(config.seed);for(let n=0;n<11;n++){const x=25+r()*320,y=20+r()*140;if(!isWater(x/12,y/9,config)){g.fillStyle='#b5c5a5';g.beginPath();g.arc(x,y,12+r()*12,0,7);g.fill();}}g.strokeStyle='#000000';g.lineCap='round';g.lineWidth=8;g.beginPath();g.moveTo(75,135);g.lineTo(75,80);g.lineTo(178,80);g.lineTo(178,42);g.stroke();for(const[x,y,col]of [[75,135,COLORS[0]],[178,42,COLORS[0]],[130,110,COLORS[2]]]){g.fillStyle='#fff';g.fillRect(x-10,y-10,20,20);g.fillStyle=col;g.fillRect(x-7,y-7,14,14);}}
$('#get-started').onclick=()=>{if(load()){setupScenery();renderMenu();setScreen('menu');}else start('bali');};
$('#resume').onclick=()=>{paused=false;tutorial=3;setScreen('game');updateUI();};
$('#open-menu').onclick=()=>{persist();renderMenu();setScreen('menu');};
$('#pause').onclick=()=>{paused=!paused;updateUI();notify(paused?'City paused. Take your time to plan.':'City moving again.');};
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-label',sound?'Disable sound':'Enable sound');beep(520);};
function showDialog(title,html){wasPaused=paused;paused=true;dialogOpen=true;$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;$('#dialog').hidden=false;$('#close-dialog').focus();}
function closeDialog(){dialogOpen=false;$('#dialog').hidden=true;paused=wasPaused;updateUI();if(screen==='game')canvas.focus();}
$('#close-dialog').onclick=closeDialog;
$('#how-to').onclick=()=>showDialog('Every road has a purpose.',`<div class="prose"><p><strong>Connect matching colours.</strong> Drag from a small house to the larger building of its colour. Cars will find their way along your roads.</p><p><strong>Keep an eye on demand.</strong> The dots above buildings are waiting visitors. A full, red ring means time is running out.</p><p><strong>Build a better network.</strong> Use bridges over water, roundabouts at busy junctions, and traffic lights to regulate traffic. Trips earn coins for supplies at the workshop.</p><p><kbd>1–6</kbd> Tools · <kbd>Space</kbd> Pause<br><kbd>S</kbd> Workshop · <kbd>Esc</kbd> Menu<br>Scroll to zoom · Hold <kbd>H</kbd> and drag to pan<br>Right-click to erase · Touch: drag to build, pinch to zoom</p></div>`);
$('#about').onclick=()=>showDialog('A little space to think.',`<div class="prose"><p>A calm traffic puzzle inspired by <a href="https://roundabout.ahmadfiroz.com/" target="_blank" rel="noopener noreferrer">Roundabout, created by Ahmad Firoz</a>.</p><p>This is an independently written recreation using Canvas and JavaScript. It does not use or redistribute the original game’s code or assets. The city layouts, simulation and progression are new implementations.</p><p>Progress and best scores are stored on your device. There are no accounts or leaderboards.</p></div>`);
function workshop(){
 showDialog(`Workshop · ◉ ${state.coins}`,`<div class="shop-grid">${SHOP.map(([id,label,desc,cost])=>`<button class="shop-item" data-buy="${id}" ${state.coins<cost?'disabled':''}>${svg(id)}<strong>${label}</strong><small>${desc}</small><span class="price">◉ ${cost}</span></button>`).join('')}</div>`);
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const[id,,,cost,amount]=SHOP.find(i=>i[0]===b.dataset.buy);if(state.coins<cost)return;state.coins-=cost;state.inventory[id]+=amount;if(id==='bridge')state.inventory.road+=10;beep(640);persist();closeDialog();updateUI();workshop();});
}
$('#shop').onclick=workshop;
function updateCoach(){
 const text=['Drag a road from the house to the building of the same colour.','Nice connection! Your cars will find their own way. Wait for the first trip.','One trip, one coin. New neighbours will arrive soon. Connect their colours and visit the workshop for supplies.'];
 $('#coach-text').textContent=text[tutorial]||'';$('#coach').hidden=tutorial>=3||screen!=='game';$('#coach-dots').innerHTML=[0,1,2].map(i=>`<i class="${i===tutorial?'current':''}"></i>`).join('');$('#skip').textContent=tutorial===2?'Got it':'Skip';
}
$('#skip').onclick=()=>{tutorial=3;updateCoach();};

function point(e){return[(e.clientX-view.x)/view.scale/CELL,(e.clientY-view.y)/view.scale/CELL];}
function cell(e){return point(e).map(Math.floor);}
function buildingAt(x,y){return state.buildings.find(b=>b.x===x&&b.y===y);}
function build(x,y,mode){
 if(x<0||x>=COLS||y<0||y>=ROWS)return;
 const k=key(x,y),existing=state.roads[k],building=buildingAt(x,y);
 if(mode==='erase'){if(existing){state.inventory[existing]++;delete state.roads[k];beep(210);}return;}
 if(building||existing===mode)return;
 if(mode==='roundabout'||mode==='light'){
  if(!existing||existing==='bridge'||existing==='motorway'){notify('Place this on an existing land road.');return;}
 }else if(existing)return;
 if(isWater(x,y,city())&&!['bridge','motorway'].includes(mode)){notify('Water ahead. Select the bridge tool (2).');return;}
 if(mode==='bridge'&&!isWater(x,y,city()))mode='road';
 if(state.inventory[mode]<=0){notify('Out of supplies. Visit the workshop to get more.');return;}
 if(existing)state.inventory[existing]++;
 state.roads[k]=mode;state.inventory[mode]--;beep(260+Math.random()*80);updateUI();
}
const touches=new Map();let pinch=null;
canvas.addEventListener('pointerdown',e=>{
 if(screen!=='game'||dialogOpen||state.over)return;
 if(e.pointerType==='touch')touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touches.size===2){const p=[...touches.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),scale:view.scale};drag=null;return;}
 canvas.setPointerCapture(e.pointerId);const c=cell(e);drag={from:c,mode:e.button===2?'erase':tool,pan:panKey||e.button===1,x:e.clientX,y:e.clientY};if(!drag.pan)build(...c,drag.mode);
});
canvas.addEventListener('pointermove',e=>{
 hover=cell(e);
 if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&touches.size===2){const p=[...touches.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);zoom(pinch.scale*distance/pinch.distance,(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);return;}
 if(!drag)return;
 if(drag.pan){view.x+=e.clientX-drag.x;view.y+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;return;}
 const c=cell(e);for(const[x,y]of lineCells(drag.from,c))build(x,y,drag.mode);drag.from=c;
});
function endPointer(e){touches.delete(e.pointerId);pinch=null;drag=null;if(screen==='game'){persist();if(tutorial===0&&findRoute(state.roads,key(12,9),key(15,9))){tutorial=1;updateCoach();}}}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('contextmenu',e=>e.preventDefault());
function zoom(scale,x,y){const old=view.scale;view.scale=Math.max(.4,Math.min(3,scale));view.x=x-(x-view.x)*view.scale/old;view.y=y-(y-view.y)*view.scale/old;}
canvas.addEventListener('wheel',e=>{if(screen!=='game')return;e.preventDefault();zoom(view.scale*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
addEventListener('keydown',e=>{
 if(e.key==='Tab'&&dialogOpen){const list=[...$('#dialog').querySelectorAll('button:not(:disabled),a')];if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}return;}
 if(e.key==='Escape'){e.preventDefault();if(dialogOpen){closeDialog();return;}if(screen==='game')$('#open-menu').click();else if(screen==='menu'&&state&&!state.over)$('#resume').click();return;}
 if(screen!=='game'||dialogOpen)return;
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)$('#pause').click();}
 if(e.key.toLowerCase()==='s')workshop();if(e.key.toLowerCase()==='h'){panKey=true;canvas.style.cursor='grab';}
 const t=TOOLS.find(t=>t[2]===e.key);if(t)selectTool(t[0]);
});
addEventListener('keyup',e=>{if(e.key.toLowerCase()==='h'){panKey=false;canvas.style.cursor='crosshair';}});addEventListener('blur',()=>{panKey=false;drag=null;persist();});addEventListener('pagehide',persist);

function expandCity(){
 const count=state.expanded+1,color=count%Math.min(5,2+Math.floor(count/3)),base=[[[9,6],[13,4]],[[23,11],[26,7]],[[7,14],[12,16]],[[23,16],[28,18]],[[4,9],[7,4]],[[13,13],[9,18]],[[24,4],[29,10]],[[5,17],[14,19]]][(count-1)%8];
 for(let i=0;i<2;i++){
  let[x,y]=base[i],attempts=0;while((buildingAt(x,y)||isWater(x,y,city()))&&attempts++<80){x=3+Math.floor(rng()*27);y=3+Math.floor(rng()*15);}
  if(attempts>=80)continue;
  if(state.roads[key(x,y)]){state.inventory[state.roads[key(x,y)]]++;delete state.roads[key(x,y)];}
  state.buildings.push({x,y,color,type:i===0?'house':'factory',demand:i===0?0:1,spawn:0});
 }
 state.expanded++;state.inventory.road+=12;notify('The city is growing. New neighbours + 12 road tiles.');updateUI();
}
function finish(){state.over=true;best[state.city]=Math.max(best[state.city]||0,state.trips);try{localStorage.setItem(BEST,JSON.stringify(best));localStorage.removeItem(SAVE);}catch{}showDialog('A busy city. A good run.',`<div class="result-score">${state.trips}</div><p>trips completed in ${state.week} ${state.week===1?'week':'weeks'}</p><p>A building waited too long. Try a shorter route next time.</p><button class="primary" id="again">Try this city again</button> <button id="pick-city">Choose another city</button>`);$('#again').onclick=()=>{closeDialog();start(state.city);};$('#pick-city').onclick=()=>{closeDialog();renderMenu();setScreen('menu');};}
function simulate(dt){
 state.time+=dt;spawnClock+=dt;saveClock+=dt;
 if(saveClock>4){persist();saveClock=0;}
 const week=1+Math.floor(state.time/90);if(week>state.week){state.week=week;state.inventory.road+=25;state.coins+=8;if(city().id==='bangkok')state.inventory.bridge++;notify('A new week! +25 roads and 8 coins. Time to plan ahead.');beep(700);}
 if(state.expanded<8&&state.time>(state.expanded+1)*38)expandCity();
 for(const b of state.buildings){
  if(b.type==='factory'){
   b.demand+=dt*(.026+state.week*.006)*city().rate;
   if(b.demand>=9){finish();return;}
  }else{
   b.spawn+=dt;
   if(b.spawn>3.5&&state.cars.filter(c=>c.origin===key(b.x,b.y)).length<3){
    const targets=state.buildings.filter(f=>f.type==='factory'&&f.color===b.color&&f.demand>=.5).sort((a,b)=>b.demand-a.demand);
    for(const target of targets){const path=findRoute(state.roads,key(b.x,b.y),key(target.x,target.y));if(path){state.cars.push({path,progress:0,color:b.color,origin:key(b.x,b.y),target:key(target.x,target.y)});b.spawn=0;break;}}
   }
  }
 }
 let completed=[];
 for(const car of state.cars){
  const segment=Math.min(Math.floor(car.progress),car.path.length-2),tile=car.path[segment+1],type=state.roads[tile];
  if(segment>0&&!state.roads[car.path[segment]]){completed.push(car);continue;}
  let speed=type==='motorway'?3.6:1.9;
  if(city().id==='kl'&&state.time%85>55)speed*=.7;
  if(city().id==='sf'&&state.time%120<25)speed*=.8;
  const junction=neighbors(tile).filter(n=>state.roads[n]).length>=3;
  if(junction&&type!=='roundabout'&&type!=='motorway')speed*=.65;
  if(type==='light'&&Math.floor(state.time/3)%2===0)speed=.15;
  if(state.cars.some(other=>other!==car&&other.path[Math.floor(other.progress)]===tile&&other.progress%1<.4))speed*=.3;
  car.progress+=dt*speed;
  if(car.progress>=car.path.length-1){completed.push(car);const target=state.buildings.find(b=>key(b.x,b.y)===car.target);if(target)target.demand=Math.max(0,target.demand-1);state.trips++;state.coins+=city().id==='ny'&&car.path.some(k=>state.roads[k]==='bridge')?2:1;if(state.trips===1){beep(650);if(tutorial===1){tutorial=2;updateCoach();}}}
 }
 state.cars=state.cars.filter(c=>!completed.includes(c));updateUI();
}

function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function waterPath(){ctx.beginPath();for(let y=-4;y<=ROWS+4;y+=.2){const x=riverX(y,city())*CELL;y===-4?ctx.moveTo(x,y*CELL):ctx.lineTo(x,y*CELL);}}
function drawLand(){
 ctx.fillStyle='#e3e1de';ctx.fillRect(-4000,-4000,9000,9000);
 if(city().kind==='island'){
  ctx.beginPath();ctx.moveTo(-300,20*CELL);for(let x=-5;x<COLS+6;x+=.2)ctx.lineTo(x*CELL,(21+Math.sin(x*.32)*.5)*CELL);ctx.lineTo(2000,2000);ctx.lineTo(-300,2000);ctx.closePath();ctx.fillStyle='#91bdd5';ctx.fill();ctx.strokeStyle='#bacbd1';ctx.lineWidth=18;ctx.stroke();
 }
 ctx.lineCap='round';ctx.lineJoin='round';waterPath();ctx.strokeStyle='#c7cfcf';ctx.lineWidth=115;ctx.stroke();waterPath();ctx.strokeStyle='#a8c4d3';ctx.lineWidth=98;ctx.stroke();waterPath();ctx.strokeStyle='#91bdd5';ctx.lineWidth=82;ctx.stroke();
 if(city().kind==='bay'){ctx.fillStyle='#91bdd5';ctx.beginPath();ctx.moveTo(2000,-300);for(let y=-4;y<ROWS+5;y+=.2)ctx.lineTo(riverX(y,city())*CELL,y*CELL);ctx.lineTo(2000,2000);ctx.fill();}
 if(city().kind==='canal'){ctx.fillStyle='#91bdd5';ctx.fillRect(-200,15.5*CELL,1800,48);}
 for(const tree of scenery){
  const x=tree.x*CELL,y=tree.y*CELL;
  ctx.fillStyle='#bdcbb0';ctx.beginPath();ctx.ellipse(x,y,tree.r*1.5,tree.r*1.2,tree.t*4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#9eb58f';ctx.lineWidth=2.5;ctx.beginPath();for(let a=0;a<7;a++){const t=a/7*Math.PI*2;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(t)*tree.r*.63,y+Math.sin(t)*tree.r*.63);}ctx.stroke();
 }
}
function drawRoads(){
 const roads=state.roads;
 for(const[k,type]of Object.entries(roads)){
  const[x,y]=decode(k),cx=(x+.5)*CELL,cy=(y+.5)*CELL,adjacent=neighbors(k).filter(n=>roads[n]||state.buildings.some(b=>key(b.x,b.y)===n));
  ctx.lineWidth=16;ctx.strokeStyle='#c2c0bd';ctx.lineCap='round';ctx.beginPath();if(!adjacent.length){ctx.moveTo(cx-.1,cy);ctx.lineTo(cx+.1,cy);}for(const n of adjacent){const[nx,ny]=decode(n);ctx.moveTo(cx,cy+2);ctx.lineTo((x+nx+1)/2*CELL,(y+ny+1)/2*CELL+2);}ctx.stroke();
  ctx.strokeStyle='#000000';ctx.lineWidth=12;ctx.beginPath();if(!adjacent.length){ctx.moveTo(cx-.1,cy);ctx.lineTo(cx+.1,cy);}for(const n of adjacent){const[nx,ny]=decode(n);ctx.moveTo(cx,cy);ctx.lineTo((x+nx+1)/2*CELL,(y+ny+1)/2*CELL);}ctx.stroke();
  if(type==='bridge'){ctx.strokeStyle='#4e7288';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-12,cy-12);ctx.lineTo(cx+12,cy-12);ctx.moveTo(cx-12,cy+12);ctx.lineTo(cx+12,cy+12);ctx.stroke();}
  if(type==='roundabout'){ctx.beginPath();ctx.arc(cx,cy,10,0,7);ctx.fillStyle='#000000';ctx.fill();ctx.beginPath();ctx.arc(cx,cy,4.5,0,7);ctx.fillStyle='#a5bd91';ctx.fill();}
  if(type==='light'){rounded(cx+6,cy-16,7,15,3,'#273744');ctx.fillStyle=Math.floor(state.time/3)%2?'#7acb83':'#ea6e62';ctx.beginPath();ctx.arc(cx+9.5,cy-11,2,0,7);ctx.fill();}
 }
}
function drawBuilding(b){
 const x=(b.x+.5)*CELL,y=(b.y+.5)*CELL,c=COLORS[b.color];
 ctx.save();ctx.translate(x,y);ctx.lineWidth=2.5;
 if(b.type==='house'){
  rounded(-11,-8,23,23,4,'#00000014');rounded(-12,-12,24,24,4,'#faf8f0');rounded(-9,-9,18,18,2,c);ctx.strokeStyle='#0002';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-9,-2);ctx.lineTo(9,-2);ctx.stroke();ctx.fillStyle='#ffffffc9';ctx.fillRect(3,4,3,5);
 }else{
  rounded(-22,-16,45,36,7,'#00000019');rounded(-23,-21,46,39,7,'#faf8f0');rounded(-19,-17,38,31,4,c);ctx.fillStyle='#0002';ctx.fillRect(-19,-5,38,2);ctx.fillRect(-19,5,38,2);rounded(9,-23,10,10,2,'#293a46','#faf8f0');ctx.fillStyle='#f8f4e7';ctx.fillRect(11,-21,6,5);
  const waiting=Math.ceil(b.demand);for(let i=0;i<Math.min(8,waiting);i++){ctx.beginPath();ctx.arc(-17+(i%4)*11,-32-Math.floor(i/4)*9,3,0,7);ctx.fillStyle=b.demand>6?'#df5965':'#faf8f0';ctx.fill();}
  if(b.demand>4){ctx.beginPath();ctx.arc(0,-2,29,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,(b.demand-4)/5));ctx.strokeStyle=b.demand>7?'#d84b53':'#dfab4c';ctx.lineWidth=3;ctx.stroke();}
 }
 if(tutorial===0&&b.color===0&&screen==='game'){ctx.strokeStyle='#d99f45';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(0,0,b.type==='house'?21:34,0,7);ctx.stroke();ctx.setLineDash([]);}
 ctx.restore();
}
function drawCars(){for(const car of state.cars){const i=Math.min(car.path.length-2,Math.floor(car.progress)),t=car.progress-i;const[a,b]=decode(car.path[i]),[c,d]=decode(car.path[i+1]);ctx.save();ctx.translate((a+.5+(c-a)*t)*CELL,(b+.5+(d-b)*t)*CELL);ctx.rotate(Math.atan2(d-b,c-a));rounded(-6,-3.7,12,7.4,2,COLORS[car.color],'#ffffffaa');ctx.fillStyle='#fff1d2';ctx.fillRect(1,-2.5,3,5);ctx.restore();}}
function draw(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);drawLand();drawRoads();for(const b of state.buildings)drawBuilding(b);drawCars();
 if(screen==='game'&&hover&&!dialogOpen){const[x,y]=hover;ctx.fillStyle=tool==='erase'?'#df596530':'#ffffff55';rounded(x*CELL+2,y*CELL+2,CELL-4,CELL-4,5,ctx.fillStyle);}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 if(screen==='game'&&city().id==='sf'&&state.time%120<25){const fog=ctx.createLinearGradient(0,0,width,height);fog.addColorStop(0,'#ffffff55');fog.addColorStop(1,'#ffffff05');ctx.fillStyle=fog;ctx.fillRect(0,0,width,height);}
 if(screen==='game'&&city().id==='kl'&&state.time%85>55){ctx.strokeStyle='#527a9633';ctx.lineWidth=1;const t=performance.now()/35;ctx.beginPath();for(let i=0;i<70;i++){let x=(i*179+t*2)%width,y=(i*73+t*8)%height;ctx.moveTo(x,y);ctx.lineTo(x-4,y+15);}ctx.stroke();}
 if(paused&&screen==='game'&&!dialogOpen){ctx.fillStyle='#20303c';ctx.font='700 14px system-ui';ctx.textAlign='center';ctx.fillText('PAUSED',width/2,85);}
}
state=createState(CITIES[0]);setupScenery();setScreen('welcome');
function frame(time){const dt=Math.min((time-lastTime)/1000,.07);lastTime=time;if(screen==='game'&&!paused&&!dialogOpen&&!state.over)simulate(dt);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
