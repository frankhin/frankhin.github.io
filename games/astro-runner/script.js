/* ============================================
   ASTRO RUNNER
   A small endless runner set in the void.
   Mounts itself into #astro-runner-mount when that
   element exists on the page.
   ============================================ */

(function () {
  'use strict';

  const mount = document.getElementById('astro-runner-mount');
  if (!mount) return;

  mount.innerHTML = `
    <style>
      .ar-wrap { display:flex; flex-direction:column; align-items:center; margin-top:36px; }
      .ar-hud { display:flex; justify-content:space-between; width:100%; max-width:640px;
        font-family:'Space Grotesk',sans-serif; font-size:0.85rem; letter-spacing:0.06em;
        color:rgba(245,243,255,0.6); margin-bottom:10px; text-transform:uppercase; }
      .ar-hud b { color:#f5f3ff; font-weight:600; }
      #ar-canvas { width:100%; max-width:640px; aspect-ratio:16/7; border-radius:6px;
        border:1px solid rgba(139,92,246,0.35); background:radial-gradient(ellipse at 50% 0%,rgba(107,63,160,0.15),#05060d 70%);
        touch-action:none; }
      .ar-controls { margin-top:18px; font-family:'Space Grotesk',sans-serif; font-size:0.78rem;
        color:rgba(245,243,255,0.4); text-align:center; }
      .ar-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
        justify-content:center; text-align:center; background:rgba(5,6,13,0.72); border-radius:6px;
        font-family:'Space Grotesk',sans-serif; }
      .ar-overlay h3 { font-family:'Cinzel',serif; font-size:1.5rem; margin-bottom:10px; letter-spacing:0.06em; }
      .ar-overlay p { color:rgba(245,243,255,0.6); margin-bottom:18px; font-size:0.9rem; }
      .ar-btn { font-family:'Space Grotesk',sans-serif; letter-spacing:0.08em; text-transform:uppercase;
        font-size:0.8rem; padding:11px 26px; border:1px solid rgba(77,168,255,0.5); background:transparent;
        color:#f5f3ff; border-radius:2px; cursor:pointer; transition:box-shadow .3s ease,border-color .3s ease; }
      .ar-btn:hover { border-color:#4da8ff; box-shadow:0 0 18px rgba(77,168,255,0.4); }
      .ar-canvas-holder { position:relative; width:100%; max-width:640px; }
      .ar-pause-btn { position:absolute; top:10px; right:10px; background:rgba(10,14,36,0.6);
        border:1px solid rgba(245,243,255,0.15); color:#f5f3ff; width:32px; height:32px; border-radius:50%;
        cursor:pointer; font-size:0.85rem; }
    </style>
    <div class="ar-wrap">
      <div class="ar-hud">
        <span>Score: <b id="ar-score">0</b></span>
        <span>Best: <b id="ar-best">0</b></span>
      </div>
      <div class="ar-canvas-holder">
        <canvas id="ar-canvas"></canvas>
        <button class="ar-pause-btn" id="ar-pause" aria-label="Pause">⏸</button>
        <div class="ar-overlay" id="ar-overlay">
          <h3>Astro Runner</h3>
          <p>Jump the debris. Survive the void.</p>
          <button class="ar-btn" id="ar-start">Launch</button>
        </div>
      </div>
      <div class="ar-controls">Space / Tap to jump &nbsp;·&nbsp; P to pause</div>
    </div>
  `;

  const canvas = document.getElementById('ar-canvas');
  const cctx = canvas.getContext('2d');
  const overlay = document.getElementById('ar-overlay');
  const startBtn = document.getElementById('ar-start');
  const pauseBtn = document.getElementById('ar-pause');
  const scoreEl = document.getElementById('ar-score');
  const bestEl = document.getElementById('ar-best');

  let cw, ch, scale;
  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    scale = Math.min(window.devicePixelRatio || 1, 2);
    cw = rect.width; ch = rect.height;
    canvas.width = cw * scale; canvas.height = ch * scale;
    cctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener('resize', fitCanvas);

  const GROUND_RATIO = 0.82;
  let player, obstacles, gameStars, speed, gravity, score, best, running, paused, frame;

  function loadBest() {
    try { return parseInt(localStorage.getItem('astroRunnerBest') || '0', 10); } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('astroRunnerBest', String(v)); } catch (e) { /* ignore */ }
  }
  best = loadBest();
  bestEl.textContent = best;

  function resetGame() {
    fitCanvas();
    const groundY = ch * GROUND_RATIO;
    player = { x: cw * 0.14, y: groundY - 30, w: 26, h: 30, vy: 0, onGround: true, rot: 0 };
    obstacles = [];
    gameStars = [];
    speed = 5.2;
    gravity = 0.62;
    score = 0;
    frame = 0;
    running = true;
    paused = false;
  }

  function spawnObstacle() {
    const groundY = ch * GROUND_RATIO;
    const kind = Math.random();
    let h, w;
    if (kind < 0.5) { w = 20; h = 24; }        // asteroid
    else if (kind < 0.8) { w = 30; h = 34; }   // alien rock
    else { w = 34; h = 16; }                   // satellite (lower, needs precise timing)
    obstacles.push({ x: cw + 20, y: groundY - h, w, h, kind: kind < 0.5 ? 'asteroid' : kind < 0.8 ? 'rock' : 'sat' });
  }

  function spawnStar() {
    gameStars.push({ x: cw + 10, y: Math.random() * ch * 0.6, r: Math.random() * 1.5 + 0.5, s: Math.random() * 1.5 + 0.5 });
  }

  function jump() {
    if (!running || paused) return;
    if (player.onGround) {
      player.vy = -11.5;
      player.onGround = false;
    }
  }

  function update() {
    frame++;
    const groundY = ch * GROUND_RATIO;

    player.vy += gravity;
    player.y += player.vy;
    if (player.y + player.h >= groundY) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.onGround = true;
    }
    player.rot = player.onGround ? 0 : Math.max(-0.4, Math.min(0.4, player.vy * 0.03));

    if (frame % Math.max(18, 70 - Math.floor(speed * 4)) === 0) spawnObstacle();
    if (frame % 6 === 0) spawnStar();

    obstacles.forEach((o) => (o.x -= speed));
    obstacles = obstacles.filter((o) => o.x + o.w > -10);

    gameStars.forEach((s) => (s.x -= speed * 0.4 * s.s));
    gameStars = gameStars.filter((s) => s.x > -10);

    // collisions
    for (const o of obstacles) {
      if (player.x < o.x + o.w && player.x + player.w > o.x && player.y < o.y + o.h && player.y + player.h > o.y) {
        endGame();
        break;
      }
    }

    score += 0.12;
    speed += 0.0015;
    scoreEl.textContent = Math.floor(score);
  }

  function drawShip(x, y, w, h, rot) {
    cctx.save();
    cctx.translate(x + w / 2, y + h / 2);
    cctx.rotate(rot);
    cctx.fillStyle = '#4da8ff';
    cctx.shadowColor = 'rgba(77,168,255,0.8)';
    cctx.shadowBlur = 14;
    cctx.beginPath();
    cctx.moveTo(-w / 2, h / 2);
    cctx.lineTo(0, -h / 2);
    cctx.lineTo(w / 2, h / 2);
    cctx.lineTo(0, h / 4);
    cctx.closePath();
    cctx.fill();
    cctx.restore();
  }

  function drawObstacle(o) {
    cctx.save();
    cctx.shadowBlur = 10;
    if (o.kind === 'sat') {
      cctx.fillStyle = '#22d3ee';
      cctx.shadowColor = 'rgba(34,211,238,0.7)';
      cctx.fillRect(o.x, o.y + o.h * 0.3, o.w, o.h * 0.4);
      cctx.fillRect(o.x - 6, o.y, 6, o.h);
      cctx.fillRect(o.x + o.w, o.y, 6, o.h);
    } else {
      cctx.fillStyle = o.kind === 'asteroid' ? '#8b5cf6' : '#f5f3ff';
      cctx.shadowColor = o.kind === 'asteroid' ? 'rgba(139,92,246,0.6)' : 'rgba(245,243,255,0.5)';
      cctx.beginPath();
      cctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
      cctx.fill();
    }
    cctx.restore();
  }

  function render() {
    cctx.clearRect(0, 0, cw, ch);
    const groundY = ch * GROUND_RATIO;

    // background stars
    cctx.fillStyle = 'rgba(245,243,255,0.5)';
    gameStars.forEach((s) => {
      cctx.globalAlpha = 0.6;
      cctx.beginPath();
      cctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      cctx.fill();
    });
    cctx.globalAlpha = 1;

    // ground line
    cctx.strokeStyle = 'rgba(77,168,255,0.35)';
    cctx.lineWidth = 1;
    cctx.beginPath();
    cctx.moveTo(0, groundY);
    cctx.lineTo(cw, groundY);
    cctx.stroke();

    obstacles.forEach(drawObstacle);
    drawShip(player.x, player.y, player.w, player.h, player.rot);
  }

  function loop() {
    if (running && !paused) {
      update();
      render();
    }
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    if (Math.floor(score) > best) {
      best = Math.floor(score);
      saveBest(best);
      bestEl.textContent = best;
    }
    overlay.innerHTML = `
      <h3>Signal Lost</h3>
      <p>Score: ${Math.floor(score)} &nbsp;·&nbsp; Best: ${best}</p>
      <button class="ar-btn" id="ar-restart">Restart</button>
    `;
    overlay.style.display = 'flex';
    document.getElementById('ar-restart').addEventListener('click', () => {
      overlay.style.display = 'none';
      resetGame();
    });
  }

  startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    resetGame();
  });

  pauseBtn.addEventListener('click', () => {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : '⏸';
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); jump(); }
    if (e.key === 'p' || e.key === 'P') pauseBtn.click();
  });
  canvas.addEventListener('pointerdown', jump);

  running = false;
  obstacles = [];
  gameStars = [];
  fitCanvas();
  requestAnimationFrame(loop);
})();

