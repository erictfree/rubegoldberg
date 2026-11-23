# Class Rube Goldberg Machine

Work with your AI assistant to create and refine one scene of a shared Rube Goldberg machine. Each student's scene receives the same orange ball, sets off a chain of different kinetic mechanisms to accomplish a simple task, and passes the ball to the next scene.

## Get started

1. Download this repository using **Code → Download ZIP**, then extract it, or clone the repository.
2. Open the project folder in VS Code and ask your AI assistant to read [brief.md](brief.md).
3. The assistant will invite you to describe the scene you want. Describe it in your own words; it will ask follow-up questions as needed and help you develop a chain of different mechanisms, where each action causes the next.
4. The assistant builds and tests the mechanism chain in small steps, then develops the look and sound. It adds your scene to `index.html`. In VS Code, right-click `index.html` and choose **Open with Live Server** to run it. Click once in the preview for sound.
5. Watch it, then tell the assistant what you like and what you want to change: the movement, the look, how one mechanism triggers another, the timing, or the sound. You can also change your mind about the idea itself.
6. The assistant revises the scene. Watch the updated Live Server preview, refresh if needed, and give more feedback. **Repeat until you have the scene you want and it passes the shared rules.**

You can start with:

> Read brief.md and guide me through creating my Rube Goldberg scene.

There is no worksheet to fill in. Describe, build, watch, give feedback, and repeat. Your first working version is a starting point; keep shaping it with the assistant until you are happy with it.

The invention should do more than roll a ball down ramps. Combine actions such as tipping, toppling, pulling, lifting, spinning, and releasing stored energy. Other objects should carry the action forward toward a small payoff; ramps are connections between mechanisms.

All required libraries and background music are included. No package installation or build step is needed. Use Live Server throughout so your scene and its local assets load together.

## What's included

- [brief.md](brief.md) — assignment, creative prompts, technical contract, and testing instructions.
- [machine.js](machine.js) — shared ball, scene transitions, audio, and test mode.
- [index.html](index.html) — scene entry point to run with Live Server. It initially displays **No scene yet.**
- [scenes/ink.js](scenes/ink.js) and [scenes/neon.js](scenes/neon.js) — example scenes to read; neither is loaded by default.
- `lib/` — bundled graphics, sound, and physics libraries.
- `assets/` — background music and a place for your scene's local assets.

Follow the brief's editing boundaries: create your own scene and add its script line to `index.html`; keep `machine.js`, `lib/`, and other students' scenes unchanged.
