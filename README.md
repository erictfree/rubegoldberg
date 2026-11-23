# Class Rube Goldberg Machine

Build one scene of a shared Rube Goldberg machine using p5.js and Matter.js. Each student's scene receives the same orange ball and passes it to the next scene.

## Get started

1. Download this repository using **Code → Download ZIP**, then extract it, or clone the repository.
2. Open [brief.md](brief.md) and fill in the **My scene** section.
3. Give your AI assistant the completed brief and access to this project folder. The brief explains what to build, the shared rules, and how to test it.
4. Open `index.html` in a browser to run your scene. Click once for sound.

All required libraries and background music are included. No package installation or build step is needed. If your scene loads images or fonts, use a local web server as described in the brief.

## What's included

- [brief.md](brief.md) — assignment, creative prompts, technical contract, and testing instructions.
- [machine.js](machine.js) — shared ball, scene transitions, audio, and test mode.
- [index.html](index.html) — browser entry point. It initially displays **No scene yet.**
- [scenes/ink.js](scenes/ink.js) and [scenes/neon.js](scenes/neon.js) — example scenes to read; neither is loaded by default.
- `lib/` — local p5.js, p5.sound, and Matter.js libraries.
- `assets/` — background music and a place for your scene's local assets.

Follow the brief's editing boundaries: create your own scene and add its script line to `index.html`; keep `machine.js`, `lib/`, and other students' scenes unchanged.
