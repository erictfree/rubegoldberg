/* machine.js — shared template for the class Rube Goldberg machine.
 *
 * Every scene gets the same ball, entering from the pipe on the left and
 * leaving through the lift on the right. Everything in between belongs to
 * the scene. Students edit a scene file, not this file.
 *
 *   index.html                plays every scene back to back, looping
 *   index.html?scene=ink      plays one scene, with the timing readout
 *   index.html?scene=ink&end  shows just the end of that scene, held and still animating
 *   with only one scene loaded, that scene loops in test mode automatically
 *   keys: D debug view, SPACE restart, T test mode (loop this scene), arrows other scenes, M music, click for sound
 */

const { Engine, Composite, Bodies, Body, Constraint, Events } = Matter;

/* ---------- the spec every scene shares ---------- */
const SPEC = {
  W: 1280,
  H: 720,
  FPS: 30,
  STEPS_PER_FRAME: 4, // physics runs at a fixed 120 Hz, so every run is identical
  STEP_MS: 1000 / 120,
  BALL_R: 18,
  BALL_COLOR: '#FF5A36',
  ENTRY_Y: 120, // the ball leaves the left pipe at this height...
  ENTRY_VX: 7, // ...moving right at this speed (pixels per 1/60 s)
  PIPE_LIP: 46, // the left pipe ends at this x
  MIN_SECONDS: 8, // the ball must leave the frame inside this window
  MAX_SECONDS: 12,
  CATCH: { x: 1280 - 96, y: 570, w: 96, h: 150 }, // deliver the ball here
  LIFT_X: 1280 - 44,
  LIFT_SPEED: 24, // pixels per frame
  LOOP: false, // false: the show stops on the last scene, which keeps animating; SPACE starts it again
  SLIDE_FRAMES: 14, // when all scenes play in a row, the next one slides in over this many frames (0 = cut)
  MUSIC: "assets/Rube's Wild Ride.mp3", // background music for the whole machine ('' for none)
  MUSIC_VOLUME: 0.4, // 0 to 1; kept low so the scenes' own notes stay on top
  // The music is in C major, so every note a scene plays is moved to the nearest
  // note of C major pentatonic (C D E G A). Set SCALE to [] to turn this off.
  KEY: { root: 0, scale: [0, 2, 4, 7, 9] }, // root: 0 = C, 1 = C sharp, ... 11 = B
};

const SCENES = [];
function registerScene(scene) {
  SCENES.push(scene);
}

/* Move a MIDI note to the nearest note in the music's key. */
function snapToKey(midi) {
  const { root, scale } = SPEC.KEY;
  if (!scale || !scale.length) return midi;
  for (let d = 0; d < 12; d++) {
    for (const m of [midi - d, midi + d]) {
      if (scale.includes((((Math.round(m) - root) % 12) + 12) % 12)) return Math.round(m);
    }
  }
  return midi;
}

/* ---------- the machine: what a scene gets to use ---------- */
const M = {
  engine: null,
  world: null,
  ball: null,
  scene: null,
  index: 0,
  frame: 0,
  state: 'run', // run -> lift -> fire -> done
  x: 0, // ball position, valid in every state
  y: 0,
  ballVisible: true,
  debug: false,
  solo: false,
  capture: false,
  notes: [],
  cues: [], // samples and music changes, logged like notes
  problem: '',
  _pending: [],
  _cool: new Map(),
  _stillFrames: 0,
  _hold: 0,

  get seconds() {
    return this.frame / SPEC.FPS;
  },

  /** Give a body this collisionFilter and only the ball can touch it. */
  ballOnly: { category: 0x0004, mask: 0x0002 },

  /** Add any Matter body or constraint to the world. */
  add(...things) {
    Composite.add(this.world, things);
    return things.length === 1 ? things[0] : things;
  },

  /** A static wall or ramp between two points. */
  wall(x1, y1, x2, y2, opts = {}) {
    const th = opts.thickness || 12;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const body = Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len, th, {
      isStatic: true,
      angle: Math.atan2(y2 - y1, x2 - x1),
      friction: 0.05,
      label: 'wall',
      ...opts,
    });
    body.seg = { x1, y1, x2, y2 };
    return this.add(body);
  },

  /** Pin a body to a fixed point in the world so it can only rotate. */
  pin(body, x, y) {
    const c = Constraint.create({
      pointA: { x, y },
      bodyB: body,
      pointB: { x: x - body.position.x, y: y - body.position.y },
      length: 0,
      stiffness: 1,
    });
    return this.add(c);
  },

  ballVelocity() {
    return this.state === 'run' ? Body.getVelocity(this.ball) : { x: 0, y: 0 };
  },

  /** Move the ball somewhere else. Safe to call from inside hit(). */
  teleport(x, y, vx, vy) {
    this._pending.push(() => {
      Body.setPosition(this.ball, { x, y });
      Body.setVelocity(this.ball, { x: vx, y: vy });
      Body.setAngularVelocity(this.ball, 0);
    });
  },

  /** Change the ball's velocity. Safe to call from inside hit(). */
  kick(vx, vy) {
    this._pending.push(() => Body.setVelocity(this.ball, { x: vx, y: vy }));
  },

  /** Play a recorded sound once, such as 'assets/boom.mp3'. `from` starts it that many seconds in.
   *  List the file in the scene's `samples` so it is loaded ahead of time. */
  sample(file, volume = 1, from = 0) {
    this.cues.push({ frame: this.frame, sample: file, volume, from });
    Sound.sample(file, volume, from);
  },

  /** Fade the background music to a new volume (0 to 1) over some seconds. The next scene start restores it. */
  fadeMusic(volume, seconds = 0.5) {
    this.cues.push({ frame: this.frame, fade: volume, seconds });
    Sound.fadeTo(volume, seconds);
  },

  /** Change the background music to another looping track. The next scene start puts the usual track back. */
  music(file, volume = SPEC.MUSIC_VOLUME) {
    this.cues.push({ frame: this.frame, music: file, volume });
    Sound.setMusic(file, volume);
  },

  /** Play a note and log it, so the render can rebuild the soundtrack. */
  note(midi, gain = 0.5, voice) {
    const n = { frame: this.frame, midi: snapToKey(midi), gain, voice: voice || this.scene.voice || 'pluck' };
    this.notes.push(n);
    Sound.play(n);
  },
};

/* ---------- scene lifecycle ---------- */
function startScene(i) {
  if (M.scene && M.scene.cleanup) M.scene.cleanup(M);
  M.index = i;
  M.scene = SCENES[i];
  M.engine = Engine.create();
  M.engine.gravity.y = 1;
  M.world = M.engine.world;
  M.frame = 0;
  M.state = 'run';
  M.ballVisible = true;
  M.notes = [];
  M.cues = [];
  Sound.setMusic(SPEC.MUSIC, SPEC.MUSIC_VOLUME); // every scene starts on the usual track
  for (const f of M.scene.samples || []) Sound.load(f);
  M.problem = '';
  M.ended = false;
  M._pending = [];
  M._cool = new Map();
  M._stillFrames = 0;
  M._hold = 0;
  M._liftV = 0;
  M._roll = 0;
  M._lastX = undefined;

  const S = SPEC;
  // template hardware: the floor of the entry pipe and the wall of the lift tube
  M.wall(-60, S.ENTRY_Y + S.BALL_R + 6, S.PIPE_LIP, S.ENTRY_Y + S.BALL_R + 6, { label: 'pipe' });
  M.wall(S.W - 70, S.ENTRY_Y - 26, S.W - 70, S.CATCH.y, { label: 'pipe' });

  M.ball = Bodies.circle(-S.BALL_R, S.ENTRY_Y, S.BALL_R, {
    restitution: 0.45,
    friction: 0, // Matter's friction is not physical: any value makes the ball crawl down ramps
    frictionStatic: 0,
    frictionAir: 0.0005,
    density: 0.002,
    label: 'ball',
    collisionFilter: { category: 0x0002, mask: 0xffffffff, group: 0 },
  });
  Composite.add(M.world, M.ball);
  Body.setVelocity(M.ball, { x: S.ENTRY_VX, y: 0 });
  M.x = M.ball.position.x;
  M.y = M.ball.position.y;

  Events.on(M.engine, 'collisionStart', onCollisions);

  randomSeed(M.scene.seed || 1);
  noiseSeed(M.scene.seed || 1);
  M.scene.build(M);
}

function onCollisions(event) {
  for (const pair of event.pairs) {
    const a = pair.bodyA.parent || pair.bodyA;
    const b = pair.bodyB.parent || pair.bodyB;
    if (a !== M.ball && b !== M.ball) continue;
    const other = a === M.ball ? b : a;
    const n = pair.collision.normal;
    const vb = Body.getVelocity(M.ball);
    const vo = Body.getVelocity(other);
    const speed = Math.abs((vb.x - vo.x) * n.x + (vb.y - vo.y) * n.y);
    if (!other.isSensor && speed < 0.8) continue; // ignore rolling chatter
    const last = M._cool.get(other.id);
    if (last !== undefined && M.frame - last < 6) continue;
    M._cool.set(other.id, M.frame);
    const s = pair.collision.supports && pair.collision.supports[0];
    if (M.scene.hit) {
      M.scene.hit(M, {
        body: other,
        label: other.label,
        speed,
        x: s ? s.x : M.ball.position.x,
        y: s ? s.y : M.ball.position.y,
      });
    }
  }
}

function advance() {
  const S = SPEC;
  for (let i = 0; i < S.STEPS_PER_FRAME; i++) {
    Engine.update(M.engine, S.STEP_MS);
    while (M._pending.length) M._pending.shift()();
  }

  if (M.state === 'run') {
    M.x = M.ball.position.x;
    M.y = M.ball.position.y;
    const c = S.CATCH;
    if (M.x > c.x && M.y > c.y) {
      M.state = 'lift';
      M._liftV = 0;
      Composite.remove(M.world, M.ball);
      M.note(55, 0.5, 'lift');
    } else if (M.x < -80 || M.x > S.W + 80 || M.y > S.H + 80 || M.y < -400) {
      M.problem = 'LOST: the ball left the frame';
    } else {
      M._stillFrames = Body.getSpeed(M.ball) < 0.05 ? M._stillFrames + 1 : 0;
      if (M._stillFrames > 45) M.problem = 'STUCK: the ball stopped moving';
    }
  } else if (M.state === 'lift') {
    M._liftV = Math.min(S.LIFT_SPEED, M._liftV + 6);
    M.x += (S.LIFT_X - M.x) * 0.35;
    M.y -= M._liftV;
    if (M.y <= S.ENTRY_Y) {
      M.y = S.ENTRY_Y;
      M.x = S.LIFT_X;
      M.state = 'fire';
    }
  } else if (M.state === 'fire') {
    M.x += S.ENTRY_VX * 2; // same speed the next scene's ball enters with
    if (M.x - S.BALL_R > S.W) M.state = 'done';
  }

  M.frame++;
  if (M.state !== 'done' && M.seconds > 20) {
    M.problem = M.problem || 'TIMEOUT';
    M.state = 'done';
  }
}

/* ---------- p5 ---------- */
function preload() {
  // a scene that uses images or fonts loads them in its own preload()
  for (const s of SCENES) if (s.preload) s.preload();
}

function setup() {
  const q = new URLSearchParams(location.search);
  pixelDensity(1);
  createCanvas(SPEC.W, SPEC.H);
  frameRate(SPEC.FPS);
  M.capture = q.has('capture');
  M.debug = q.has('debug');
  if (!SCENES.length) {
    // a fresh folder: nothing to play until the first scene file is added to index.html
    background('#1b1b1b');
    fill('#dddddd');
    noStroke();
    textFont('monospace');
    textAlign(CENTER, CENTER);
    textSize(26);
    text('No scene yet.', SPEC.W / 2, SPEC.H / 2 - 26);
    textSize(18);
    text('Ask your AI assistant to read brief.md and help you describe your scene.', SPEC.W / 2, SPEC.H / 2 + 18);
    noLoop();
    return;
  }
  let start = 0;
  // Test mode loops one scene with the timing readout. It is on when the address names a scene
  // (?scene=ink), and also whenever index.html loads only one scene, which is how a student's
  // own folder is set up: there is nothing to choose, so their scene just loops.
  if (q.has('scene')) {
    const found = SCENES.findIndex((s) => s.name === q.get('scene'));
    if (found < 0) M.notFound = `no scene named "${q.get('scene')}" — loaded: ${SCENES.map((s) => s.name).join(', ')}`;
    start = Math.max(0, found);
    M.solo = true;
  } else if (SCENES.length === 1) {
    M.solo = true;
  }
  startScene(start);
  // ?scene=NAME&end jumps straight to the end of that scene and stays there, still animating
  M.holdEnd = M.solo && q.has('end') && !M.capture;
  if (M.holdEnd) {
    while (M.state !== 'done' && !M.problem) {
      M.scene.draw(M);
      advance();
    }
  }
  if (M.capture) noLoop();
}

function draw() {
  if (!M.scene) return; // no scene loaded yet
  if (M.capture && !M._stepping) return; // the renderer drives every frame itself
  if (M.state === 'done') {
    if (!M.solo && !SPEC.LOOP && M.index === SCENES.length - 1) {
      // The end of the show: stay on the last scene and let it keep animating.
      M.ended = true;
      M.frame++;
    } else if (!M.solo) {
      // Keep a picture of the scene the ball just left, so the next one can slide in beside it.
      M._slide = !M.capture && SPEC.SLIDE_FRAMES > 0 ? { picture: get(), frame: 0 } : null;
      startScene((M.index + 1) % SCENES.length);
    } else if (M.holdEnd) {
      M.ended = true;
      M.frame++;
    } else if (M.capture) {
      if (++M._hold > 60) startScene(M.index);
    } else {
      // Test mode: the scene loops straight into itself. The ball leaves on the right and comes
      // back in on the left, so one scene on its own shows both of its hand-offs.
      const t = M.seconds;
      M.lastRun = { name: M.scene.name, seconds: t, ok: t >= SPEC.MIN_SECONDS && t <= SPEC.MAX_SECONDS };
      M._slide = SPEC.SLIDE_FRAMES > 0 ? { picture: get(), frame: 0 } : null;
      startScene(M.index);
    }
  }
  // The ball leaves one scene on the right and enters the next on the left at the same
  // height, so the camera pans: the new scene is drawn shifted right, the old picture beside it.
  const slide = M._slide;
  let shift = 0;
  if (slide) {
    const t = ++slide.frame / SPEC.SLIDE_FRAMES;
    shift = SPEC.W * (1 - t * t * (3 - 2 * t));
  }
  push();
  translate(shift, 0);
  M.scene.draw(M);
  if (M.scene.drawPipes) M.scene.drawPipes(M);
  else drawPipes(M.scene.pipe || {});
  if (M.ballVisible && M.state !== 'done') drawBall();
  pop();
  if (slide) {
    image(slide.picture, shift - SPEC.W, 0, SPEC.W, SPEC.H);
    if (slide.frame >= SPEC.SLIDE_FRAMES) M._slide = null;
  }
  if (!M.capture && (M.solo || M.debug) && !M.holdEnd) drawReadout();
  if (M.debug) drawDebug();
  if (M.state !== 'done') advance();
}

/* The ball: the same size and colour in every scene. It has an outline so it reads on any
 * background, a stripe that turns as it travels so it looks like it rolls, and a soft shine.
 * A scene can adjust the finish with `ball: { outline, rim, shine, stripe }`:
 *   outline  the colour of its edge (default: near black)
 *   rim      the colour of a thin ring just outside the edge, or false for none
 *   shine    false for a flat ball, for flat-drawn worlds
 *   stripe   false for no rolling stripe
 */
function drawBall() {
  const R = SPEC.BALL_R;
  const look = M.scene.ball || {};
  // The ball has no friction, so it never really spins. Turn the stripe by how far it has
  // travelled sideways instead, which is what rolling would look like.
  const dx = M.x - (M._lastX === undefined ? M.x : M._lastX);
  M._lastX = M.x;
  if (Math.abs(dx) < 60) M._roll = (M._roll || 0) + dx / R; // a bigger jump is a teleport, not a roll
  const ctx = drawingContext;
  push();
  translate(M.x, M.y);
  if (look.rim !== false) {
    noFill();
    stroke(look.rim || 'rgba(255,255,255,0.6)');
    strokeWeight(1.5);
    circle(0, 0, R * 2 + 5);
  }
  noStroke();
  fill(SPEC.BALL_COLOR);
  circle(0, 0, R * 2);
  push(); // everything in here is clipped to the ball
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.clip();
  if (look.stripe !== false) {
    push();
    rotate(M._roll || 0);
    stroke(255, 232, 214);
    strokeWeight(R * 0.34);
    strokeCap(SQUARE);
    line(-R, 0, R, 0);
    pop();
  }
  if (look.shine !== false) {
    // light from the upper left: a bright spot there, and shade towards the lower right
    const shade = ctx.createRadialGradient(-R * 0.4, -R * 0.45, R * 0.1, 0, 0, R * 1.05);
    shade.addColorStop(0, 'rgba(255,255,255,0.55)');
    shade.addColorStop(0.35, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(60,10,0,0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(-R, -R, R * 2, R * 2);
  }
  pop();
  noFill();
  stroke(look.outline || '#22140e');
  strokeWeight(2.5);
  circle(0, 0, R * 2);
  pop();
}

/* The entry pipe and the exit lift, drawn in the scene's line colour. */
function drawPipes(style) {
  const S = SPEC;
  const r = 26;
  push();
  noFill();
  stroke(style.line || '#141414');
  strokeWeight(style.weight || 4);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  if (style.glow) {
    drawingContext.shadowBlur = 16;
    drawingContext.shadowColor = style.glow;
  }
  // entry pipe
  line(0, S.ENTRY_Y - r, S.PIPE_LIP, S.ENTRY_Y - r);
  line(0, S.ENTRY_Y + r, S.PIPE_LIP, S.ENTRY_Y + r);
  line(S.PIPE_LIP, S.ENTRY_Y - r - 7, S.PIPE_LIP, S.ENTRY_Y - r + 5);
  line(S.PIPE_LIP, S.ENTRY_Y + r - 5, S.PIPE_LIP, S.ENTRY_Y + r + 7);
  // lift tube with an elbow out to the right
  const xl = S.LIFT_X - r;
  const xr = S.LIFT_X + r;
  beginShape();
  vertex(xl, S.CATCH.y);
  vertex(xl, S.ENTRY_Y - r);
  vertex(S.W, S.ENTRY_Y - r);
  endShape();
  beginShape();
  vertex(xr, S.H);
  vertex(xr, S.ENTRY_Y + r);
  vertex(S.W, S.ENTRY_Y + r);
  endShape();
  line(xl - 7, S.CATCH.y, xl + 5, S.CATCH.y);
  pop();
}

function drawReadout() {
  const S = SPEC;
  const t = M.seconds;
  let msg = `${M.scene.name}   ${t.toFixed(2)} s`;
  let col = '#888';
  if (M.notFound) msg = M.notFound + '   |   ' + msg;
  // the result of the run before this one stays up, since the scene loops without stopping
  const last = M.lastRun && M.lastRun.name === M.scene.name ? M.lastRun : null;
  if (last && !M.problem && M.state !== 'done') {
    msg += `   last run ${last.seconds.toFixed(2)} s  ` + (last.ok ? 'PASS' : `OUTSIDE ${S.MIN_SECONDS}-${S.MAX_SECONDS} s`);
    col = last.ok ? '#22A06B' : '#E5484D';
  }
  if (M.problem) {
    msg += '   ' + M.problem;
    col = '#E5484D';
  } else if (M.state === 'done') {
    const ok = t >= S.MIN_SECONDS && t <= S.MAX_SECONDS;
    msg += ok ? '   PASS' : `   OUTSIDE ${S.MIN_SECONDS}-${S.MAX_SECONDS} s`;
    col = ok ? '#22A06B' : '#E5484D';
  }
  push();
  noStroke();
  fill(col);
  textFont('monospace');
  textSize(16);
  textAlign(LEFT, BOTTOM);
  text(msg, 14, S.H - 12);
  pop();
}

function drawDebug() {
  const c = SPEC.CATCH;
  push();
  noFill();
  strokeWeight(1);
  stroke('#22A06B');
  rect(c.x, c.y, c.w, c.h);
  stroke('#E5484D');
  for (const body of Composite.allBodies(M.world)) {
    const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
    for (const p of parts) {
      beginShape();
      for (const v of p.vertices) vertex(v.x, v.y);
      endShape(CLOSE);
    }
  }
  // where the mouse is, for placing things
  noStroke();
  fill('#E5484D');
  textFont('monospace');
  textSize(14);
  textAlign(LEFT, BOTTOM);
  text(`${Math.round(mouseX)}, ${Math.round(mouseY)}`, mouseX + 12, mouseY - 6);
  pop();
}

function keyPressed() {
  if (!M.scene) return;
  Sound.unlock();
  if (key === 'd' || key === 'D') M.debug = !M.debug;
  if (key === ' ') startScene(M.ended && !M.solo ? 0 : M.index);
  if (key === 'm' || key === 'M') Sound.toggleMusic();
  // T switches test mode (loop this scene) on and off; the arrow keys step to the scene before or after
  if (key === 't' || key === 'T') {
    M.solo = !M.solo;
    M.holdEnd = false;
    M._hold = 0;
    showInAddress();
  }
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    const n = SCENES.length;
    startScene((M.index + (keyCode === LEFT_ARROW ? n - 1 : 1)) % n);
    showInAddress();
  }
}

/* Keep the address bar in step with test mode, so a refresh comes back to the same scene. */
function showInAddress() {
  if (M.capture) return;
  const u = new URL(location.href);
  if (M.solo && SCENES.length > 1) u.searchParams.set('scene', M.scene.name);
  else u.searchParams.delete('scene');
  M.notFound = '';
  history.replaceState(null, '', u);
}

function mousePressed() {
  Sound.unlock();
}

/* For the headless tools: run the current scene to its end without waiting. */
window.runToEnd = function () {
  M._stepping = true;
  while (M.state !== 'done' && !M.problem) redraw();
  return { frames: M.frame, seconds: M.seconds, problem: M.problem, notes: M.notes };
};

/* For the headless renderer: advance exactly one frame. */
window.stepFrame = function () {
  M._stepping = true;
  redraw();
  return { done: M.state === 'done', frame: M.frame, problem: M.problem };
};

/* ---------- sound: a few small synth voices, played with p5.sound 0.4.2 ----------
 * Each voice is one or two p5.Oscillator objects with a hand-drawn volume
 * envelope. The same voices are mirrored in tools/soundtrack.py, which
 * rebuilds the soundtrack for the video from the logged notes.
 */
const Sound = {
  on: false,
  unlock() {
    if (M.capture) return;
    this.unlocked = true;
    this.startMusic();
    if (typeof userStartAudio !== 'function' || !p5.Oscillator) {
      if (!this.warned) console.warn('machine: lib/p5.sound.min.js is not loaded, so there is no sound');
      this.warned = true;
      return;
    }
    userStartAudio();
    this.on = true;
  },
  /* The background music is one looping track that keeps playing across scenes
   * and restarts. It is a plain <audio> element, so it also works when
   * index.html is opened straight from the file. A scene can swap the track
   * with M.music(); starting any scene puts the usual one back. */
  music: null,
  musicOff: false,
  unlocked: false,
  track: SPEC.MUSIC,
  trackVolume: SPEC.MUSIC_VOLUME,
  fadeTo(volume, seconds) {
    clearInterval(this.fading);
    this.trackVolume = volume;
    if (!this.music) return;
    const from = this.music.volume;
    const steps = Math.max(1, Math.round(seconds * 30));
    let i = 0;
    this.fading = setInterval(() => {
      i++;
      if (this.music) this.music.volume = from + ((volume - from) * i) / steps;
      if (i >= steps) clearInterval(this.fading);
    }, 33);
  },
  setMusic(file, volume) {
    clearInterval(this.fading);
    this.trackVolume = volume;
    if (file === this.track) {
      if (this.music) this.music.volume = volume;
      return;
    }
    this.track = file;
    if (this.music) this.music.pause();
    this.music = null;
    if (this.unlocked) this.startMusic();
  },
  startMusic() {
    if (M.capture || !this.track || this.musicOff) return;
    if (!this.music) {
      this.music = new Audio(encodeURI(this.track));
      this.music.loop = true;
    }
    this.music.volume = this.trackVolume;
    if (this.music.paused) this.music.play().catch((e) => console.warn('machine: could not play the music —', e.message));
  },
  toggleMusic() {
    this.musicOff = !this.musicOff;
    if (this.musicOff && this.music) this.music.pause();
    else this.startMusic();
  },
  /* One-shot recorded sounds. */
  samples: {},
  load(file) {
    if (M.capture || this.samples[file]) return;
    this.samples[file] = new Audio(encodeURI(file));
    this.samples[file].preload = 'auto';
  },
  sample(file, volume, from) {
    if (M.capture || !this.unlocked) return;
    this.load(file);
    const a = this.samples[file];
    a.currentTime = Math.max(0, from || 0);
    a.volume = Math.min(1, Math.max(0, volume));
    a.play().catch((e) => console.warn('machine: could not play ' + file + ' —', e.message));
  },
  play(n) {
    if (!this.on) return;
    const c = getAudioContext();
    if (c.state !== 'running') return;
    const t = c.currentTime + 0.01;
    const f = 440 * Math.pow(2, (n.midi - 69) / 12);
    const g = n.gain * 0.5;
    // one oscillator: its wave, pitch, peak level, how its volume moves, and when it stops
    const osc = (type, freq, peak, envelope, stop) => {
      const o = new p5.Oscillator(freq, type);
      o.node.volume.value = 0; // p5.sound starts oscillators at -6 dB; the envelope sets the level here
      const vol = o.output.gain; // every p5.sound object ends in a Web Audio gain node
      vol.setValueAtTime(0.0001, t);
      envelope(vol, Math.max(peak, 0.0002));
      o.node.frequency.setValueAtTime(freq, t);
      o.node.start(t);
      o.node.stop(t + stop);
      setTimeout(() => {
        o.node.dispose();
        o.output.disconnect();
      }, (stop + 0.3) * 1000);
      return o;
    };
    const ping = (decay) => (vol, peak) => {
      vol.exponentialRampToValueAtTime(peak, t + 0.005);
      vol.exponentialRampToValueAtTime(0.0001, t + decay);
    };
    if (n.voice === 'bell') {
      osc('sine', f, g, ping(1.4), 1.5);
      osc('sine', f * 2.76, g * 0.35, ping(1.4), 1.5);
    } else if (n.voice === 'thunk') {
      const o = osc('sine', f * 1.6, g, ping(0.16), 0.2);
      o.node.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    } else if (n.voice === 'whoosh') {
      const o = osc('sawtooth', f, g * 0.6, ping(0.6), 0.65);
      o.node.frequency.exponentialRampToValueAtTime(f * 4, t + 0.55);
    } else if (n.voice === 'lift') {
      const hold = (vol, peak) => {
        vol.exponentialRampToValueAtTime(peak, t + 0.08);
        vol.setValueAtTime(peak, t + 0.7);
        vol.exponentialRampToValueAtTime(0.0001, t + 0.95);
      };
      const o = osc('triangle', f, g * 0.6, hold, 1.0);
      o.node.frequency.exponentialRampToValueAtTime(f * 4, t + 0.9);
    } else {
      osc('triangle', f, g, ping(0.45), 0.5); // pluck
    }
  },
};
