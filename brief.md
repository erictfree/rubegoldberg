# Scene brief — Class Rube Goldberg Machine

**How to use this.** Give this whole file to your AI assistant, in a mode where it can read and edit the files in the project folder. Ask it to read the brief and guide you through creating your scene. It will invite you to describe what you want and ask follow-up questions as needed. You do not need to fill in or edit this file. Open `index.html` in a browser to run the scene it builds with you.

You do not set anything up by hand. Your assistant creates your scene file and adds it to `index.html` as part of the build.

If you are writing the scene yourself, without an assistant, everything you need is here too. Skip "How I want to work".

---

I'm building one scene of a class Rube Goldberg machine in p5.js and Matter.js, and I'd like your help building it.

Every student builds one scene. The same ball travels through all of them: it enters my scene from a pipe at the top left and leaves through a lift at the bottom right. The scenes are played back to back for an audience, so my scene has two jobs. It has to hand the ball on exactly as this brief says, or the machine breaks at my scene. And it has to be fun to watch and recognizably mine.

Before you write any code, read `machine.js`, which is the shared template, and one or two of the finished scenes in `scenes/`. Use those scenes to learn how a scene is put together. Do not treat them as the style to imitate.

## Start with a conversation

Read this whole brief before asking me anything. If I have not already described my scene, invite me to describe it in my own words. For example: "What kind of world should the ball travel through, and what would you like to happen along the way?" Do not ask me to complete a form or fill in this file.

Use my description and anything I have already told you to understand:

- The world and its visual style.
- Whether the physics should be believable or can include magic.
- Two or three mechanisms the ball should go through.
- How the world reacts when the ball hits things, including sound.

Ask follow-up questions only where something is missing or unclear and the answer would affect the scene. Ask one or two questions at a time; do not repeat questions I have already answered or turn the conversation into a questionnaire. Help me develop an incomplete idea, and explain any conflicts with the shared contract below.

Suggest a short scene name using lowercase letters and digits for the file name, and ask what name I want in the scene's author credit if you do not already know it. Once you understand enough to begin, briefly describe the scene you will build and start with the bare mechanisms, following "How I want to work" below. Refine the details with me as we go.

## What is up to me

The look and the logic of the world are my decision. The style can be realistic, hand-drawn, pixel art, abstract, or anything else. The physics can be strictly believable, or the ball can teleport, float, or be swallowed and spat out. If I ask for realism, commit to it: lighting, shadows, materials and texture, drawn in code or with image files. Do not steer me toward the look of the example scenes, and do not simplify my idea without telling me.

## What gets built

1. One file: `scenes/<name>.js`.
2. Optionally, a folder `assets/<name>/` for any images, fonts or sound files the scene uses.
3. One line added to `index.html`, with the other scene lines. If `scenes/title.js` and `scenes/finale.js` are listed, mine goes between them:

```html
<script src="scenes/<name>.js"></script>
```

Add that line yourself, in the first step. Do not ask me to do it. It is the only change to `index.html`.

Do not change `machine.js`, `lib/`, or anyone else's scene. If you think the template needs a change, explain it to me and I will ask my instructor.

## The contract

These are fixed, because every scene shares them. They are what make the scenes line up. If something I ask for would break one, tell me so. Do not quietly work around it.

| | |
| --- | --- |
| Canvas | 1280 × 720 pixels, 30 frames per second |
| Ball | Radius 18, orange, with an outline, a shine and a stripe that turns as it rolls. The template creates it, draws it, and gives it zero friction. Do not create, recolour, resize or change it. A scene can adjust its finish with the `ball` option below, and can draw a shadow, a glow or a trail under it |
| Entry | The ball leaves the left pipe at x = 46, y = 120, moving right at 7 pixels per 1/60 s. Do not move it at the start. Keep x < 46, y 90 to 150 clear |
| Exit | Get the ball into the catch zone: x > 1184 and y > 570. The template's lift takes it from there. Leave the zone open, and build nothing to the right of x = 1210 |
| Time | The ball must leave the frame between 8 and 12 seconds after it enters. Aim for about 10, the middle of the window, so a small change does not push it out. The lift takes about 1 second of that, so the ball should reach the catch zone at about 9 seconds |
| Same every time | The ball must take the same path, in the same time, on every run. See "The same every time" below |
| In frame | The ball must stay on the canvas and keep moving. The template reports LOST if it leaves, and STUCK if it stops for 1.5 seconds |
| Sound | Two ways, and a scene can use both: synth notes with `M.note()`, and recorded sound files with `M.sample()`. No sound libraries, and leave the background music alone |
| Assets | Images, fonts and sound files stay local, in `assets/<name>/`. Nothing loads from a URL |
| Speed | The scene must hold 30 frames per second on a laptop |

The libraries are p5.js 1.11.11 and Matter.js 0.20.0, already loaded. Do not add others.

### The same every time

A scene that passes ten times and strands the ball on the eleventh will do it in front of the audience. It is also impossible to fix a stuck ball that you cannot make happen again. So:

**A hard rule: anything that affects the ball is repeatable.** That means where bodies are, how they move, and when anything happens to the ball. For all of that:

- Use p5's `random()` and `noise()`. The template seeds them from the scene's `seed`, so they give the same numbers on every run. `Math.random()` cannot be seeded, so it gives different numbers each time.
- Use `M.frame` for timing. It counts frames from the moment the ball enters, and the physics counts frames too, so they never drift apart. `millis()` and `Date` measure real time, which drifts whenever the browser hitches. `frameCount` counts from when the page loaded, so it is different every time the scene starts and does not reset on a restart.
- Do not read the mouse or the keyboard. Nobody is at the controls when the machine plays.

**A recommendation: use the same tools for everything else too.** A sparkle placed with `Math.random()`, or a cloud that drifts on `millis()`, will not break the hand-off, because it never touches the ball. But `random()` and `M.frame` do the same job at no cost, they keep a restart looking like the first run, and they are what the frame-by-frame render tools need. If there is a good reason to break this for something purely cosmetic, say so in a comment.

## The shape of a scene

A scene is one call to `registerScene`. Wrap the whole file in `{ }` so its constants do not collide with another scene's.

```js
/* MYSCENE — Your Name — "Title"
 * One sentence about the idea.
 */
{
  registerScene({
    name: 'myscene',                        // must match the file name
    seed: 1,                                // seeds random() and noise()
    voice: 'pluck',                         // default sound for M.note()
    pipe: { line: '#222222', weight: 4 },   // how the template draws its pipes in this world
    ball: { outline: '#222222' },           // optional: the ball's finish in this world (see below)
    samples: [],                            // optional: sound files to load ahead, e.g. ['assets/myscene/splash.mp3']

    preload() {},       // optional: loadImage() and loadFont() calls go here
    build(M) {},        // required: create every body and reset every variable
    hit(M, h) {},       // optional: the ball hit something
    draw(M) {},         // required: draw one frame
    cleanup(M) {},      // optional: remove anything made with createGraphics()
  });
}
```

Do not define `setup()`, `draw()` or `preload()` as global functions, do not call `createCanvas()` or `frameRate()`, and do not step the physics engine.

**`ball`** adjusts how the shared ball is finished, so it sits well in the scene's style. All four settings are optional: `outline` is the colour of its edge, `rim` is the colour of a thin ring just outside the edge (or `false` for none), `shine: false` gives a flat ball for flat-drawn worlds, and `stripe: false` removes the rolling stripe. Its size and its orange stay the same in every scene.

**`build(M)`** runs every time the scene starts, including restarts. Keep all state on `this` and set it here, so a restart resets everything.

**`draw(M)`** runs once per frame, before the physics moves. It is the only per-frame hook, so animation, timers and any moving of the scene's own bodies go here. Draw the world; the template draws the ball and the pipes on top.

**`hit(M, h)`** runs when the ball strikes a body. `h.body` is the Matter body, `h.label` its label, `h.speed` how hard the impact was, and `h.x`, `h.y` where. Rolling contact slower than 0.8 is ignored, and each body reports at most once every 6 frames. Sensors always report.

## What `M` gives you

| | |
| --- | --- |
| `M.wall(x1, y1, x2, y2, opts)` | A static wall or ramp between two points, 12 thick. `opts` can set `thickness`, `label`, or any Matter option. The body remembers its ends in `body.seg` |
| `M.add(body)` | Adds any Matter body or constraint. `Bodies`, `Body`, `Composite`, `Constraint` and `Events` are available as globals |
| `M.pin(body, x, y)` | Pins a body to a point so it can only rotate |
| `M.ballOnly` | A collision filter. Give it to a moving part and only the ball can touch it |
| `M.x`, `M.y` | Where the ball is |
| `M.ballVelocity()` | Its velocity, as `{ x, y }` |
| `M.frame`, `M.seconds` | Time since the ball entered: frames, and seconds |
| `M.state` | `'run'` while the ball is in the scene, then `'lift'`, `'fire'`, `'done'` |
| `M.note(midi, gain, voice)` | Plays a note. `midi` is a note number (60 is middle C), `gain` is 0 to 1, and `voice` is `'pluck'`, `'bell'`, `'thunk'` or `'whoosh'` |
| `M.sample(file, volume, from)` | Plays a sound file once, such as `'assets/myscene/splash.mp3'`. `volume` is 0 to 1. `from` is optional and starts it that many seconds in. List the file in the scene's `samples` so it is loaded before it is needed |
| `M.teleport(x, y, vx, vy)` | Moves the ball. Only if the scene allows magic |
| `M.kick(vx, vy)` | Changes the ball's velocity. Only if the scene allows magic |
| `M.ballVisible` | Set to `false` to hide the ball briefly. It must be visible and unchanged when it reaches the catch zone |

`SPEC` holds the fixed numbers: `SPEC.W`, `SPEC.H`, `SPEC.BALL_R`, `SPEC.FPS`.

**Notes** are the quick way to make sound: no files, and the template moves every note into the key of the background music, so any pitch will be in tune.

**Sound files** are for anything a synth cannot do: a splash, a meow, a door creak. Put them in `assets/<name>/` as `.mp3` or `.wav`, list them in `samples`, and play them from `hit()` or `draw()` with `M.sample()`. Keep them short, and set the volume so they sit with the music instead of over it. Scale the volume by `h.speed` where it makes sense, the same as for notes.

The machine plays background music under every scene, so a few well-placed sounds read better than many. That music belongs to the whole machine: do not call `M.music()` or `M.fadeMusic()`, which change it.

## The scene should react

The ball passing through should change the world. Each collision should cause something I can see, and ideally something I can hear, whether that is a note or a recorded sound. Use `h.speed`, so a hard hit looks and sounds different from a light one.

## A scene that already works

This passes as written, at 8.6 seconds, which is near the short end of the window; a finished scene should run closer to 10. It is a safe place to start: save it as the scene file, add its line to `index.html`, check that it passes, then change it into my scene.

```js
/* MYSCENE — Your Name — "Three Ramps"
 * The ball zigzags down three levels and leaves a mark wherever it lands.
 */
{
  // layout: every number you are likely to tune, in one place
  const L = {
    ramps: [
      [40, 162, 600, 218],    // from the pipe, down to the right
      [590, 276, 1085, 330],  // the next level, still heading right
      [1152, 402, 420, 525],  // back to the left
      [292, 606, 500, 650],   // a steep start for the last run...
      [500, 650, 1190, 700],  // ...which ends at the catch zone
    ],
    bumperR: { x: 1178, top: 150, bottom: 430, w: 56 },  // turns the ball back at the right
    bumperL: { x: 300, top: 430, bottom: 640, w: 16 },   // and again at the left
  };

  registerScene({
    name: 'myscene',
    voice: 'thunk',
    seed: 1,
    pipe: { line: '#222222', weight: 4 },

    build(M) {
      this.marks = [];  // one mark per impact; reset here so a restart starts clean
      this.ramps = L.ramps.map((r) => M.wall(...r, { label: 'ramp' }));
      this.bumpers = [L.bumperR, L.bumperL].map((b) =>
        M.add(Bodies.rectangle(b.x, (b.top + b.bottom) / 2, b.w, b.bottom - b.top, { isStatic: true, label: 'bumper' }))
      );
    },

    hit(M, h) {
      const power = constrain(h.speed / 10, 0.15, 1);  // a tap is 0.15, a hard hit is 1
      M.note(h.label === 'bumper' ? 60 : 48, 0.3 + 0.5 * power, 'thunk');
      this.marks.push({ x: h.x, y: h.y, r: 10 + 30 * power, born: M.frame });
    },

    draw(M) {
      background(246);
      noStroke();
      for (const m of this.marks) {
        fill(255, 90, 54, 160 * constrain(1 - (M.frame - m.born) / 30, 0, 1));
        circle(m.x, m.y, m.r * 2);
      }
      stroke(34);
      strokeWeight(12);
      strokeCap(SQUARE);
      for (const r of this.ramps) line(r.seg.x1, r.seg.y1, r.seg.x2, r.seg.y2);
      noStroke();
      fill(34);
      for (const b of this.bumpers) rect(b.bounds.min.x, b.bounds.min.y, b.bounds.max.x - b.bounds.min.x, b.bounds.max.y - b.bounds.min.y);
    },
  });
}
```

## How I want to work

- **You cannot see the canvas, and I can.** After each change, tell me which URL to open and what I should see. I will tell you what happened. If you can open a browser yourself, run it and check before you tell me it works.
- **Work in small steps.** First get the ball from the pipe to the catch zone with bare mechanisms, and check the time. Then build the look. Then add reactions and sound. Do not write the whole scene in one go.
- **Make layout easy to tune.** Put the positions and sizes I am likely to adjust in named constants at the top of the file, as the starter scene does. If we are going back and forth on coordinates, stop guessing and ask me to read them off the debug view.
- **Explain what I will have to explain.** When you use a Matter.js technique that is not in the starter scene, tell me in two or three sentences what it does and why you chose it. I have to be able to explain my scene in class.
- **Tell me when my idea has a problem.** If a mechanism is unlikely to work, or will not fit in the time, say so and suggest the closest thing that will.

## Testing

Open `index.html` in a browser. A scene drawn entirely in code runs straight from the file; one that loads images needs a local server, such as Live Server in VS Code or `python3 -m http.server`.

**If my scene is the only one loaded,** it runs in test mode automatically. A readout at the bottom left shows the time, and the result of the last run: PASS, or what went wrong.

In test mode the scene loops into itself. The ball leaves through the lift on the right and comes straight back in through the pipe on the left, exactly as it will between two scenes in the full machine. So one scene on its own shows both of its hand-offs.

**If other scenes are loaded too,** `index.html` plays the whole machine. To loop one scene:

| | |
| --- | --- |
| `index.html?scene=myscene` | Loops that scene in test mode |
| `T` | Switches test mode on or off for the scene now playing. The address updates, so a refresh comes back to it |
| `←` `→` | Step to the scene before or after |
| `D`, or `&debug` in the address | Physics outlines, the catch zone, and the mouse coordinates for placing things |
| `SPACE` | Restart |

Click once to turn sound on.

Check the readout after every change. Small layout changes can strand the ball.

## What goes wrong

- **The ball crawls.** Do not add friction to it. Control speed with slope, bumpers and obstacles.
- **The ball passes through a wall.** Thin walls leak when the ball is fast. Keep walls 12 thick or more.
- **A moving part stops the ball dead.** Make moving parts light (density about 0.0003), and give them `M.ballOnly` so they do not snag on the ramps.
- **The ball loses most of its speed bouncing off a wall.** A rebound keeps under half its speed. Follow a turn-around with a steep ramp to get it moving again.
- **The ball wedges between two parts.** It is 36 wide. Any gap it has to drop through must be wider than that.
- **Something should trigger without a bounce.** Use a sensor body (`isSensor: true`), as the portal in `scenes/neon.js` does.
- **A restart throws an error.** If the scene made an image with `createGraphics()`, remove it in `cleanup()` and set the variable to `null`.
- **`pop is not a function`, or a shape stops drawing.** A variable has been named after a p5 function. `pop`, `scale`, `fill`, `rotate`, `text` and `color` are the easy ones to shadow by accident.
- **Text is in the wrong font.** Give `textFont()` one font name, not a comma-separated list.
- **The scene looks wrong as it slides in.** In the full machine each scene slides in from the right, so its first frame must already be a complete picture. Do not call `resetMatrix()`.

## Done means

- In test mode the scene ends with PASS, with the same time on every run, and never LOST or STUCK.
- The browser console shows no errors, including after a restart.
- The scene's line is in `index.html`, and that is the only change there.
- As the scene loops into itself in test mode, the ball hands off cleanly at both ends: nothing is in the way of the pipe or the lift, and the first frame is a complete picture.
- It holds 30 frames per second on a laptop.
- Every collision causes something I can see, and ideally something I can hear.
- The file starts with a comment giving my name, the scene's title, and one sentence about the idea.
- Any temporary tuning aids are removed.
