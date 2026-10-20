# Roundabout recreation

An independent Canvas / JavaScript implementation inspired by [Roundabout by Ahmad Firoz](https://roundabout.ahmadfiroz.com/). All implementation and drawing code in `dist/` was written for this recreation. No original game bundles, images, or fonts are included.

## Run

```sh
npm start
```

Open http://127.0.0.1:4177. No dependencies or build step required. Deploy the contents of `dist/` to any static host.

## Play

Draw roads between matching houses and factories. Cars follow the road network and complete trips to reduce demand. Each trip earns coins; buy road tiles, bridges, motorways, roundabouts and lights in the workshop. New neighbours arrive as the city grows. Every 90 seconds a new week adds supplies. A factory that accumulates nine waiting visitors ends the run.

- Drag: build; right-click drag: erase.
- 1–6: road, bridge, motorway, erase, roundabout, traffic light.
- Space: pause; S: workshop; Esc: menu.
- Wheel: zoom; hold H and drag: pan. Touch supports drag and pinch zoom.
- Progress and personal bests are saved in localStorage.

Seven city themes include Bali, San Francisco, New York, Kuala Lumpur, Bangkok, Dhaka and Riverside. Layouts, simulation, progression and weather are independently implemented approximations, not the original game engine. There is no shared leaderboard or original backend connection.

## Files

- `dist/game.js`: simulation, rendering and UI.
- `dist/engine.js`: grid routing, city definitions and terrain.
- `dist/style.css`: responsive interface.
- `server.mjs`: dependency-free local preview server.
- `tests/`: routing and supply verification.

## Reference observations

REA captured the reference landing screen at 1440 × 900 and inspected its rendered DOM. Evidence IDs: `ev_f90a3a046c8309d66b64e63a9de050dfa13c14d70d9ea1314b140130318401fb` (rendered DOM / accessibility). Visual reference: navy controls, pale terrain, blue rivers, green vegetation, compact coloured buildings, full-screen canvas, road tools and a workshop. Original compiled code was inspected only to identify delivery format and restrictions and was excluded from this project.
