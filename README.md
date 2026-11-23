# Class Rube Goldberg Machine

Work with your AI assistant to create and refine one scene of a shared Rube Goldberg machine. Each student's scene receives the same orange ball and passes it to the next scene.

## Get started

1. Download this repository using **Code → Download ZIP**, then extract it, or clone the repository.
2. Open the project folder in your AI assistant and ask it to read [brief.md](brief.md).
3. The assistant will invite you to describe the scene you want. Describe it in your own words; it will ask follow-up questions as needed to understand your idea and fit the shared rules.
4. The assistant builds a first version and adds it to `index.html`. Open `index.html` in a browser to run it. Click once for sound.
5. Watch it, then tell the assistant what you like and what you want to change: the movement, the look, the mechanisms, the timing, or the sound. You can also change your mind about the idea itself.
6. The assistant revises the scene. Refresh the browser, watch again, and give more feedback. **Repeat until you have the scene you want and it passes the shared rules.**

You can start with:

> Read brief.md and guide me through creating my Rube Goldberg scene.

There is no worksheet to fill in. Describe, build, watch, give feedback, and repeat. Your first working version is a starting point; keep shaping it with the assistant until you are happy with it.

All required libraries and background music are included. No package installation or build step is needed. If your scene loads images or fonts, use a local web server as described in the brief.

## What's included

- [brief.md](brief.md) — assignment, creative prompts, technical contract, and testing instructions.
- [machine.js](machine.js) — shared ball, scene transitions, audio, and test mode.
- [index.html](index.html) — browser entry point. It initially displays **No scene yet.**
- [scenes/ink.js](scenes/ink.js) and [scenes/neon.js](scenes/neon.js) — example scenes to read; neither is loaded by default.
- `lib/` — bundled graphics, sound, and physics libraries.
- `assets/` — background music and a place for your scene's local assets.

Follow the brief's editing boundaries: create your own scene and add its script line to `index.html`; keep `machine.js`, `lib/`, and other students' scenes unchanged.
