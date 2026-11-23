/* NEON — one magic moment allowed.
 * The ball drops into a portal, comes out somewhere it could not have
 * reached, and gets knocked around a pinball arena on its way to the lift.
 */
registerScene({
  name: 'neon',
  voice: 'bell',
  seed: 3,
  pipe: { line: '#25E6FF', weight: 3, glow: '#25E6FF' },

  build(M) {
    this.C = { bg: [11, 11, 26], cyan: '#25E6FF', pink: '#FF3DA6', violet: '#9B6CFF', lime: '#B6FF3D' };
    this.sparks = [];
    this.rings = [];
    this.zap = -999;

    this.walls = [
      M.wall(60, 230, 300, 300), // slide
      M.wall(330, 430, 520, 540), // funnel, left
      M.wall(720, 430, 580, 540), // funnel, right
      M.wall(760, 40, 760, 600), // arena
      M.wall(760, 40, 1210, 40),
      M.wall(1210, 40, 1210, 94),
      M.wall(760, 600, 1190, 700),
    ];

    // the magic: a pair of portals
    this.portalA = { x: 550, y: 612 };
    this.portalB = { x: 1020, y: 100 };
    this.exitV = { x: -2, y: 1 }; // how the ball leaves the second portal (chosen for a long run through the bumpers)
    this.tail = [];
    const sensor = Bodies.circle(this.portalA.x, this.portalA.y, 24, { isStatic: true, isSensor: true });
    sensor.kind = 'portal';
    M.add(sensor);

    // active bumpers: they kick the ball harder than it arrived
    this.bumpers = [
      [900, 255, 34, 72, this.C.pink],
      [1065, 300, 34, 76, this.C.lime],
      [945, 425, 38, 67, this.C.violet],
      [1095, 480, 24, 79, this.C.pink],
    ].map(([x, y, r, midi, color]) => {
      const b = Bodies.circle(x, y, r, { isStatic: true, restitution: 0.2 });
      Object.assign(b, { kind: 'bumper', r, midi, color, pulse: 0 });
      return M.add(b);
    });
  },

  hit(M, h) {
    const b = h.body;
    if (b.kind === 'portal') {
      M.teleport(this.portalB.x, this.portalB.y, this.exitV.x, this.exitV.y);
      this.tail = [];
      M.note(48, 0.5, 'whoosh');
      this.zap = M.frame;
      this.burst(this.portalA.x, this.portalA.y, this.C.violet, 18);
      this.burst(this.portalB.x, this.portalB.y, this.C.violet, 18);
    } else if (b.kind === 'bumper') {
      const dx = M.ball.position.x - b.position.x;
      const dy = M.ball.position.y - b.position.y;
      const d = Math.hypot(dx, dy) || 1;
      const out = max(h.speed * 0.9, 9);
      M.kick((dx / d) * out, (dy / d) * out);
      b.pulse = 1;
      M.note(b.midi, 0.55, 'bell');
      this.burst(h.x, h.y, b.color, 10);
      this.rings.push({ x: b.position.x, y: b.position.y, r: b.r, color: b.color, born: M.frame });
    } else {
      M.note(36 + 2 * floor(random(3)), constrain(h.speed / 10, 0.2, 0.7), 'thunk');
      this.burst(h.x, h.y, this.C.cyan, 5);
    }
  },

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = random(TWO_PI);
      const s = random(2, 9);
      this.sparks.push({ x, y, vx: cos(a) * s, vy: sin(a) * s, color, life: 1 });
    }
  },

  glow(color, blur) {
    drawingContext.shadowBlur = blur;
    drawingContext.shadowColor = color;
  },

  draw(M) {
    const S = SPEC;
    const C = this.C;
    background(C.bg[0], C.bg[1], C.bg[2]);
    noStroke();

    // dot grid
    fill(120, 130, 255, 26);
    for (let y = 40; y < S.H; y += 40) for (let x = 40; x < S.W; x += 40) circle(x, y, 3);

    // walls
    push();
    noFill();
    strokeCap(ROUND);
    stroke(C.cyan);
    strokeWeight(3);
    this.glow(C.cyan, 16);
    for (const w of this.walls) line(w.seg.x1, w.seg.y1, w.seg.x2, w.seg.y2);
    pop();

    // portals: nested ellipses turning against each other
    for (const p of [this.portalA, this.portalB]) {
      const hot = constrain(1 - (M.frame - this.zap) / 14, 0, 1);
      push();
      translate(p.x, p.y);
      noFill();
      stroke(C.violet);
      this.glow(C.violet, 18 + 30 * hot);
      for (let k = 0; k < 3; k++) {
        push();
        rotate(M.frame * 0.06 * (k % 2 ? -1 : 1) + k);
        strokeWeight(3 - k * 0.7);
        ellipse(0, 0, 66 - k * 16 + 26 * hot, 40 - k * 9 + 26 * hot);
        pop();
      }
      pop();
    }
    // the jump itself: a line between the two portals for a few frames
    const z = M.frame - this.zap;
    if (z >= 0 && z < 7) {
      push();
      stroke(255, 255, 255, 255 * (1 - z / 7));
      strokeWeight(5 - z * 0.6);
      this.glow(C.violet, 30);
      noFill();
      beginShape();
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const j = i === 0 || i === 12 ? 0 : 1;
        vertex(
          lerp(this.portalA.x, this.portalB.x, t) + j * random(-16, 16),
          lerp(this.portalA.y, this.portalB.y, t) + j * random(-16, 16)
        );
      }
      endShape();
      pop();
    }

    // bumpers
    for (const b of this.bumpers) {
      b.pulse *= 0.82;
      push();
      translate(b.position.x, b.position.y);
      stroke(b.color);
      this.glow(b.color, 14 + 40 * b.pulse);
      strokeWeight(3 + 3 * b.pulse);
      fill(red(b.color), green(b.color), blue(b.color), 40 + 180 * b.pulse);
      circle(0, 0, 2 * b.r * (1 + 0.16 * b.pulse));
      noFill();
      strokeWeight(1.5);
      circle(0, 0, b.r * 0.9);
      pop();
    }
    for (const r of this.rings) {
      const t = (M.frame - r.born) / 16;
      if (t > 1) continue;
      push();
      noFill();
      stroke(red(r.color), green(r.color), blue(r.color), 255 * (1 - t));
      strokeWeight(2);
      this.glow(r.color, 12);
      circle(r.x, r.y, 2 * (r.r + 70 * (1 - pow(1 - t, 2))));
      pop();
    }
    this.rings = this.rings.filter((r) => M.frame - r.born <= 16);

    // sparks
    push();
    for (const s of this.sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.3;
      s.vx *= 0.94;
      s.life -= 0.05;
      stroke(s.color);
      strokeWeight(2.5 * s.life + 0.5);
      this.glow(s.color, 10);
      line(s.x, s.y, s.x - s.vx, s.y - s.vy);
    }
    pop();
    this.sparks = this.sparks.filter((s) => s.life > 0);

    // a comet tail and a halo; the template draws the ball itself on top
    if (M.state !== 'done') {
      this.tail.push({ x: M.x, y: M.y });
      if (this.tail.length > 12) this.tail.shift();
      push();
      noStroke();
      this.tail.forEach((p, i) => {
        const t = (i + 1) / this.tail.length;
        fill(255, 90, 54, 110 * t * t);
        circle(p.x, p.y, SPEC.BALL_R * 2 * (0.35 + 0.65 * t));
      });
      this.glow(SPEC.BALL_COLOR, 34);
      fill(SPEC.BALL_COLOR);
      circle(M.x, M.y, SPEC.BALL_R * 2);
      pop();
    }

    // the maker's sign, bottom left: a tube of pink neon that flickers now and then
    push();
    const on = noise(M.frame * 0.4) > 0.22 ? 1 : 0.35;
    textFont('Helvetica');
    textStyle(BOLDITALIC);
    textAlign(CENTER, CENTER);
    noFill();
    stroke(255, 61, 166, 255 * on);
    strokeWeight(2.5);
    this.glow(C.pink, 26 * on);
    // the tubes come on one letter at a time
    const name = 'JORDAN REYES';
    textSize(36);
    const lit = constrain(floor((M.frame - 6) / 3), 0, name.length);
    text(name.slice(0, lit), 190 - (textWidth(name) - textWidth(name.slice(0, lit))) / 2, 630);
    stroke(37, 230, 255, 220);
    strokeWeight(2);
    this.glow(C.cyan, 14);
    rect(30, 590, 320, 84, 14);
    textSize(13);
    textStyle(NORMAL);
    noStroke();
    fill(37, 230, 255, 220);
    text('O P E N   A L L   N I G H T', 190, 664);
    pop();
  },
});
