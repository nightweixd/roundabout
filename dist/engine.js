export const COLS=34, ROWS=23, CELL=36;
export const key=(x,y)=>`${x},${y}`;
export const decode=k=>k.split(',').map(Number);
export function neighbors(k){const[x,y]=decode(k);return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&b>=0&&a<COLS&&b<ROWS).map(([a,b])=>key(a,b));}
export function findRoute(roads,start,end){
  if(start===end)return[start];
  const seen=new Map([[start,null]]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i])){
    if(seen.has(n)||(!roads[n]&&n!==end))continue;
    // A destination still needs an adjacent road; houses cannot teleport.
    if(queue[i]===start&&!roads[n]&&n===end&& !neighbors(start).includes(end))continue;
    seen.set(n,queue[i]);
    if(n===end){const path=[n];while(seen.get(path.at(-1))!==null)path.push(seen.get(path.at(-1)));return path.reverse();}
    queue.push(n);
  }
  return null;
}
export function lineCells(from,to){const out=[];let[x,y]=from;const[tx,ty]=to;out.push([x,y]);while(x!==tx||y!==ty){if(Math.abs(tx-x)>=Math.abs(ty-y)&&x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);out.push([x,y]);}return out;}
export const CITIES=[
 {id:'bali',name:'Bali',caption:'A little island. A fresh start.',difficulty:'Gentle · Start here',seed:3,kind:'island',rate:1},
 {id:'sf',name:'San Francisco',caption:'A bay, a bridge, a morning fog.',difficulty:'Easy · Morning fog',seed:12,kind:'bay',rate:1.12},
 {id:'ny',name:'New York',caption:'Two shores. A city that never rests.',difficulty:'Medium · Bridge tolls',seed:26,kind:'river',rate:1.2},
 {id:'kl',name:'Kuala Lumpur',caption:'Keep moving through the monsoon.',difficulty:'Medium · Passing showers',seed:42,kind:'river',rate:1.15},
 {id:'bangkok',name:'Bangkok',caption:'Find your way across the canals.',difficulty:'Medium · A bridge each week',seed:56,kind:'canal',rate:1.2},
 {id:'dhaka',name:'Dhaka',caption:'A growing city. Always rush hour.',difficulty:'Hard · Higher demand',seed:73,kind:'river',rate:1.55},
 {id:'riverside',name:'Riverside',caption:'Room to breathe, along the water.',difficulty:'Easy · Room to grow',seed:84,kind:'river',rate:.9}
];
export function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function riverX(y,city){return city.kind==='bay'?28+Math.sin(y*.22)*2:19+Math.sin(y*.27+city.seed)*1.5;}
export function isWater(x,y,city){if(city.kind==='island'&&y>20+Math.sin(x*.32)*.5)return true;if(city.kind==='bay')return x>riverX(y,city);if(Math.abs(x-riverX(y,city))<1.15)return true;return city.kind==='canal'&&y>15&&y<17;}
