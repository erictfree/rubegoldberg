/* INK — plausible physics only.
 * A marble run drawn in black line on paper. The ball draws its own path,
 * every impact prints a spot of colour, and the last ramp is a harp.
 */
registerScene({
  name: 'ink',
  voice: 'pluck',
  seed: 7,
  pipe: { line: '#141414', weight: 4 },
  ball: { shine: false, outline: '#141414', rim: false }, // a flat ball for a flat drawing

  build(M) {
    const S = SPEC;
    this.ink = '#141414';
    this.paperColor = '#FBFAF6';
    this.spot = ['#2F6FED', '#F59E0B', '#22A06B', '#F2C94C'];
    this.trail = createGraphics(S.W, S.H); // the pencil line the ball leaves
    this.marks = [];
    this.prev = null;
    this.sun = 0;

    // --- the marble run: two short ramps, then one long one ---
    this.ramps = [M.wall(60, 215, 390, 275), M.wall(440, 345, 130, 425), M.wall(80, 480, 1190, 690)];
    this.stops = [M.wall(440, 200, 440, 345), M.wall(80, 280, 80, 480)];
    this.ramps.forEach((r, i) => {
      r.kind = 'ramp';
      r.midi = [45, 43, 40][i];
    });
    this.stops.forEach((s) => {
      s.kind = 'ramp';
      s.midi = 52;
    });
    const rampY = (x) => 480 + ((x - 80) / 1110) * 210 - 6; // top surface of the long ramp

    // --- a turnstile the ball has to push through ---
    const wx = 400;
    const wy = rampY(wx) - 64;
    this.wheel = Body.create({
      parts: [Bodies.rectangle(wx, wy, 120, 8), Bodies.rectangle(wx, wy, 8, 120)],
      density: 0.0002,
      frictionAir: 0.006,
      collisionFilter: M.ballOnly,
    });
    this.wheel.kind = 'wheel';
    Body.setAngle(this.wheel, 0.25);
    M.add(this.wheel);
    M.pin(this.wheel, wx, wy);

    // --- a harp: rods hang from a beam and get longer, so the notes fall ---
    this.beamY = 330;
    this.rods = [];
    const scale = [84, 81, 79, 76, 74, 72, 69, 67];
    for (let i = 0; i < 8; i++) {
      const x = 600 + i * 68;
      const len = rampY(x) - this.beamY - 12;
      const rod = Bodies.rectangle(x, this.beamY + len / 2, 6, len, {
        density: 0.0003,
        frictionAir: 0.008,
        collisionFilter: M.ballOnly,
      });
      rod.kind = 'rod';
      rod.len = len;
      rod.midi = scale[i];
      rod.color = this.spot[i % 4];
      rod.rung = -999;
      M.add(rod);
      M.pin(rod, x, this.beamY);
      this.rods.push(rod);
    }
  },

  cleanup() {
    this.trail.remove();
  },

  hit(M, h) {
    const b = h.body;
    const power = constrain(h.speed / 8, 0.15, 1);
    if (b.kind === 'rod') {
      if (M.frame - b.rung < 20) return; // one note per pass
      b.rung = M.frame;
      M.note(b.midi, 0.3 + 0.4 * power, 'bell');
      this.mark(h.x, h.y, b.color, 10 + 14 * power);
      this.sun = 1;
    } else if (b.kind === 'wheel') {
      M.note(64 + 3 * floor(random(4)), 0.4, 'pluck');
      this.mark(h.x, h.y, random(this.spot), 12 + 16 * power);
    } else if (b.kind === 'ramp') {
      M.note(b.midi, 0.4 + 0.5 * power, 'thunk');
      this.mark(h.x, h.y, random(this.spot), 12 + 22 * power);
    }
  },

  mark(x, y, color, r) {
    this.marks.push({ x, y, color, r, born: M.frame, tilt: random(TWO_PI) });
  },

  draw(M) {
    const S = SPEC;
    background(this.paperColor);

    // the ball's pencil line
    if (M.state === 'run') {
      if (this.prev) {
        this.trail.stroke(20, 20, 20, 120);
        this.trail.strokeWeight(1.5);
        this.trail.line(this.prev.x, this.prev.y, M.x, M.y);
      }
      this.prev = { x: M.x, y: M.y };
    }

    // colour goes down first, like a print: discs multiply where they overlap
    blendMode(MULTIPLY);
    noStroke();
    this.sun *= 0.9;
    fill('#F2C94C');
    circle(905, 170, 150 + 34 * this.sun);
    for (const m of this.marks) {
      const t = constrain((M.frame - m.born) / 10, 0, 1);
      const grow = 1 - pow(1 - t, 3);
      fill(m.color);
      circle(m.x, m.y, 2 * m.r * grow);
    }
    blendMode(BLEND);
    image(this.trail, 0, 0);

    // then the black line
    stroke(this.ink);
    strokeCap(ROUND);
    noFill();

    // impact ticks, slightly off-register from their colour
    strokeWeight(2);
    for (const m of this.marks) {
      const t = constrain((M.frame - m.born) / 10, 0, 1);
      if (t <= 0) continue;
      circle(m.x + 4, m.y - 3, 2 * m.r * (1 - pow(1 - t, 3)));
      for (let k = 0; k < 3; k++) {
        const a = m.tilt + k * 0.5;
        const r0 = m.r + 8;
        const r1 = m.r + 8 + 9 * t;
        line(m.x + cos(a) * r0, m.y + sin(a) * r0, m.x + cos(a) * r1, m.y + sin(a) * r1);
      }
    }

    // ramps and stops, with drafting hatch underneath
    for (const w of [...this.ramps, ...this.stops]) {
      const { x1, y1, x2, y2 } = w.seg;
      strokeWeight(4);
      line(x1, y1, x2, y2);
      const len = dist(x1, y1, x2, y2);
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      let nx = -uy;
      let ny = ux;
      if (ny < 0 || (ny === 0 && nx > 0)) {
        nx = -nx;
        ny = -ny;
      }
      if (w === this.stops[0]) {
        nx = 1;
        ny = 0;
      }
      if (w === this.stops[1]) {
        nx = -1;
        ny = 0;
      }
      strokeWeight(1.5);
      for (let d = 14; d < len - 6; d += 22) {
        const px = x1 + ux * d;
        const py = y1 + uy * d;
        line(px + nx * 5, py + ny * 5, px + nx * 14 - ux * 7, py + ny * 14 - uy * 7);
      }
    }

    // turnstile
    const wh = this.wheel;
    strokeWeight(2.5);
    line(wh.position.x, 345 + ((440 - wh.position.x) / 310) * 80, wh.position.x, wh.position.y); // hangs from the ramp above
    push();
    translate(wh.position.x, wh.position.y);
    rotate(wh.angle);
    strokeWeight(4);
    line(-60, 0, 60, 0);
    line(0, -60, 0, 60);
    strokeWeight(2.5);
    [
      [60, 0],
      [0, 60],
      [-60, 0],
      [0, -60],
    ].forEach(([x, y], i) => {
      fill(this.spot[i]);
      circle(x, y, 13);
    });
    fill(this.paperColor);
    circle(0, 0, 18);
    pop();

    // harp
    noFill();
    strokeWeight(2.5);
    line(600, 0, 600, this.beamY);
    line(1076, 0, 1076, this.beamY);
    strokeWeight(4);
    line(566, this.beamY, 1110, this.beamY);
    for (const r of this.rods) {
      const sx = -sin(r.angle) * (r.len / 2);
      const sy = cos(r.angle) * (r.len / 2);
      const top = { x: r.position.x - sx, y: r.position.y - sy };
      const end = { x: r.position.x + sx, y: r.position.y + sy };
      strokeWeight(3);
      line(top.x, top.y, end.x, end.y);
      strokeWeight(2.5);
      fill(this.paperColor);
      circle(top.x, top.y, 10);
      fill(M.frame - r.rung < 24 ? r.color : this.paperColor);
      circle(end.x, end.y, 14);
    }

    // signed, like any drawing: the name is written out as the run begins
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(100, 600, 340 * constrain((M.frame - 8) / 40, 0, 1), 100);
    drawingContext.clip();
    noStroke();
    fill(this.ink);
    textFont('Snell Roundhand');
    textSize(46);
    textAlign(LEFT, BASELINE);
    text('Maya Okafor', 110, 660);
    stroke(this.ink);
    strokeWeight(2);
    noFill();
    bezier(104, 676, 190, 664, 280, 690, 362, 668);
    noStroke();
    fill(this.spot[1]);
    circle(380, 664, 12);
    drawingContext.restore();
    pop();
  },
});
