# Class Rube Goldberg Machine

Build one scene of a shared Rube Goldberg machine using p5.js and Matter.js. Each student's scene receives the same orange ball and passes it to the next scene.

## Get started

1. Download this repository using **Code → Download ZIP**, then extract it, or clone the repository.
2. Open the project folder in your AI assistant and ask it to read [brief.md](brief.md).
3. The assistant will invite you to describe the scene you want. Describe it in your own words; it will ask follow-up questions as needed to understand your idea and fit the shared rules.
4. The assistant builds your scene and adds it to `index.html`. Open `index.html` in a browser to run it. Click once for sound.

You can start with:

> Read brief.md and guide me through creating my Rube Goldberg scene.

There is no worksheet to fill in. The brief instructs the assistant to start with your description, clarify what is missing, and build the scene in small steps with you.

All required libraries and background music are included. No package installation or build step is needed. If your scene loads images or fonts, use a local web server as described in the brief.

## What's included

- [brief.md](brief.md) — assignment, creative prompts, technical contract, and testing instructions.
- [machine.js](machine.js) — shared ball, scene transitions, audio, and test mode.
- [index.html](index.html) — browser entry point. It initially displays **No scene yet.**
- [scenes/ink.js](scenes/ink.js) and [scenes/neon.js](scenes/neon.js) — example scenes to read; neither is loaded by default.
- `lib/` — local p5.js, p5.sound, and Matter.js libraries.
- `assets/` — background music and a place for your scene's local assets.

Follow the brief's editing boundaries: create your own scene and add its script line to `index.html`; keep `machine.js`, `lib/`, and other students' scenes unchanged.
