import test from 'node:test';
import assert from 'node:assert/strict';
import {findRoute,lineCells,CITIES,isWater} from '../dist/engine.js';
test('a house cannot serve a factory until the gap is connected',()=>{
 assert.equal(findRoute({},'12,9','15,9'),null);
 assert.equal(findRoute({'13,9':'road'},'12,9','15,9'),null);
 assert.deepEqual(findRoute({'13,9':'road','14,9':'road'},'12,9','15,9'),['12,9','13,9','14,9','15,9']);
});
test('removing a connecting tile stops new traffic',()=>{
 const roads={'1,0':'road','2,0':'bridge','3,0':'road'};
 assert.ok(findRoute(roads,'0,0','4,0'));
 delete roads['2,0'];assert.equal(findRoute(roads,'0,0','4,0'),null);
});
test('routing takes a detour and never crosses an unbuilt diagonal',()=>{
 assert.equal(findRoute({'1,1':'road'},'0,0','2,2'),null);
 const roads={'0,1':'road','1,1':'road','2,1':'road'};
 assert.deepEqual(findRoute(roads,'0,0','2,0'),['0,0','0,1','1,1','2,1','2,0']);
});
test('fast pointer movements fill every intermediate cell',()=>{
 const cells=lineCells([1,1],[7,4]);assert.deepEqual(cells[0],[1,1]);assert.deepEqual(cells.at(-1),[7,4]);
 assert.equal(cells.length,10);for(let i=1;i<cells.length;i++)assert.equal(Math.abs(cells[i][0]-cells[i-1][0])+Math.abs(cells[i][1]-cells[i-1][1]),1);
});
test('every city starts with buildings on land',()=>{for(const city of CITIES){assert.equal(isWater(12,9,city),false,city.name);assert.equal(isWater(15,9,city),false,city.name);}});
