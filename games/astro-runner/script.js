/* ============================================
   ASTRO RUNNER
   Endless runner. Registers itself into window.Games
   so the Games picker can mount/unmount it cleanly.
   ============================================ */

(function () {
  'use strict';
  window.Games = window.Games || {};

  window.Games['astro-runner'] = {
    name: 'Astro Runner',
    tagline: 'Jump the debris. Survive the void.',
    color: '77,168,255',
    icon: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6c4 4 7 10 7 16 0 4-1.5 8-3 10.5l-1-4h-6l-1 4C18.5 30 17 26 17 22c0-6 3-12 7-16Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="24" cy="19" r="2.4" stroke="currentColor" stroke-width="1.6"/><path d="M18 30l-3 6M30 30l3 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',

    mount(root) {
      root.innerHTML = `
        <style>
          .ar-wrap { display:flex; flex-direction:column; align-items:center; }
          .ar-hud { display:flex; justify-content:space-between; width:100%; max-width:640px;
            font-family:'Space Grotesk',sans-serif; font-size:0.85rem; letter-spacing:0.06em;
            color:rgba(245,243,255,0.6); margin-bottom:10px; text-transform:uppercase; }
          .ar-hud b { color:#f5f3ff; font-weight:600; }
          #ar-canvas { width:100%; max-width:640px; aspect-ratio:16/7; border-radius:6px;
            border:1px solid rgba(139,92,246,0.35); background:radial-gradient(ellipse at 50% 0%,rgba(107,63,160,0.15),#05060d 70%);
            touch-action:none; display:block; }
          .ar-controls-hint { margin-top:14px; font-family:'Space Grotesk',sans-serif; font-size:0.78rem;
            color:rgba(245,243,255,0.4); text-align:center; }
          .ar-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
            justify-content:center; text-align:center; background:rgba(5,6,13,0.72); border-radius:6px;
            font-family:'Space Grotesk',sans-serif; padding: 0 16px; }
          .ar-overlay h3 { font-family:'Cinzel',serif; font-size:1.5rem; margin-bottom:10px; letter-spacing:0.06em; }
          .ar-overlay p { color:rgba(245,243,255,0.6); margin-bottom:18px; font-size:0.9rem; }
          .ar-btn { font-family:'Space Grotesk',sans-serif; letter-spacing:0.08em; text-transform:uppercase;
            font-size:0.8rem; padding:11px 26px; border:1px solid rgba(77,168,255,0.5); background:transparent;
            color:#f5f3ff; border-radius:2px; cursor:pointer; transition:box-shadow .3s ease,border-color .3s ease; }
          .ar-btn:hover { border-color:#4da8ff; box-shadow:0 0 18px rgba(77,168,255,0.4); }
          .ar-canvas-holder { position:relative; width:100%; max-width:640px; }
          .ar-pause-btn { position:absolute; top:10px; right:10px; background:rgba(10,14,36,0.6);
            border:1px solid rgba(245,243,255,0.15); color:#f5f3ff; width:34px; height:34px; border-radius:50%;
            cursor:pointer; font-size:0.85rem; z-index:3; }
          /* Always-visible touch/click controls, shown on all inputs so
             there's a clear affordance instead of tap-anywhere-on-canvas */
          .ar-touch-controls { display:flex; gap:14px; margin-top:16px; width:100%; max-width:640px; justify-content:center; }
          .ar-touch-btn {
            flex: 0 0 auto; min-width:120px; padding:14px 22px;
            font-family:'Space Grotesk',sans-serif; font-size:0.85rem; letter-spacing:0.08em; text-transform:uppercase;
            background:rgba(77,168,255,0.08); border:1px solid rgba(77,168,255,0.4); color:#f5f3ff;
            border-radius:8px; cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:manipulation;
            transition:background .2s ease, transform .1s ease;
          }
          .ar-touch-btn:active { background:rgba(77,168,255,0.28); transform:scale(0.96); }
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
          <div class="ar-touch-controls">
            <button class="ar-touch-btn" id="ar-jump-btn">⤴ Jump</button>
          </div>
          <div class="ar-controls-hint">Space, tap, or the Jump button &nbsp;·&nbsp; P to pause</div>
        </div>
      `;

      const canvas = root.querySelector('#ar-canvas');
      const cctx = canvas.getContext('2d');
      const overlay = root.querySelector('#ar-overlay');
      const startBtn = root.querySelector('#ar-start');
      const pauseBtn = root.querySelector('#ar-pause');
      const jumpBtn = root.querySelector('#ar-jump-btn');
      const scoreEl = root.querySelector('#ar-score');
      const bestEl = root.querySelector('#ar-best');

      let alive = true; // set false on unmount to stop the rAF loop
      let cw, ch, scale;
      function fitCanvas() {
        const rect = canvas.getBoundingClientRect();
        scale = Math.min(window.devicePixelRatio || 1, 2);
        cw = rect.width; ch = rect.height;
        canvas.width = cw * scale; canvas.height = ch * scale;
        cctx.setTransform(scale, 0, 0, scale, 0, 0);
      }

      const GROUND_RATIO = 0.82;
      // Speeds/sizes below are expressed as a FRACTION of canvas width and
      // scaled back to pixels every frame. A 640px desktop canvas and a
      // 320px phone canvas now present the same relative difficulty,
      // instead of the old fixed-pixel speed eating a mobile player's
      // reaction time much faster than a desktop player's.
      const BASE_SPEED_FRAC = 0.0081;   // fraction of canvas width per frame
      const SPEED_GROWTH_FRAC = 0.0000023;
      let player, obstacles, gameStars, speedPx, speedFrac, gravity, score, best, running, paused, frame;

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
        const shipW = cw * 0.045, shipH = cw * 0.052;
        player = { x: cw * 0.14, y: groundY - shipH, w: shipW, h: shipH, vy: 0, onGround: true, rot: 0 };
        obstacles = [];
        gameStars = [];
        speedFrac = BASE_SPEED_FRAC;
        speedPx = speedFrac * cw;
        gravity = ch * 0.021;
        score = 0;
        frame = 0;
        running = true;
        paused = false;
      }

      function spawnObstacle() {
        const groundY = ch * GROUND_RATIO;
        const kind = Math.random();
        let h, w;
        if (kind < 0.5) { w = cw * 0.032; h = cw * 0.038; }
        else if (kind < 0.8) { w = cw * 0.047; h = cw * 0.053; }
        else { w = cw * 0.053; h = cw * 0.025; }
        obstacles.push({ x: cw + 20, y: groundY - h, w, h, kind: kind < 0.5 ? 'asteroid' : kind < 0.8 ? 'rock' : 'sat' });
      }

      function spawnStar() {
        gameStars.push({ x: cw + 10, y: Math.random() * ch * 0.6, r: Math.random() * 1.5 + 0.5, s: Math.random() * 1.5 + 0.5 });
      }

      function jump() {
        if (!running || paused) return;
        if (player.onGround) {
          player.vy = -ch * 0.041;
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
        player.rot = player.onGround ? 0 : Math.max(-0.4, Math.min(0.4, player.vy * 0.02));

        // spawn interval also scales with speed so density feels the same
        // relative to travel distance regardless of screen size
        const spawnEvery = Math.max(16, Math.round(0.115 / speedFrac));
        if (frame % spawnEvery === 0) spawnObstacle();
        if (frame % 6 === 0) spawnStar();

        obstacles.forEach((o) => (o.x -= speedPx));
        obstacles = obstacles.filter((o) => o.x + o.w > -10);

        gameStars.forEach((s) => (s.x -= speedPx * 0.4 * s.s));
        gameStars = gameStars.filter((s) => s.x > -10);

        for (const o of obstacles) {
          if (player.x < o.x + o.w && player.x + player.w > o.x && player.y < o.y + o.h && player.y + player.h > o.y) {
            endGame();
            break;
          }
        }

        score += 0.12;
        speedFrac += SPEED_GROWTH_FRAC;
        speedPx = speedFrac * cw;
        scoreEl.textContent = Math.floor(score);
      }

      // A recognizable little ship: pointed nose, swept wings, engine glow —
      // reads clearly at small sizes instead of an ambiguous triangle.
      function drawShip(x, y, w, h, rot) {
        cctx.save();
        cctx.translate(x + w / 2, y + h / 2);
        cctx.rotate(rot);

        // engine glow trail
        cctx.beginPath();
        const flicker = 0.6 + Math.random() * 0.4;
        const grad = cctx.createRadialGradient(0, h * 0.55, 0, 0, h * 0.55, w * 0.5);
        grad.addColorStop(0, `rgba(34,211,238,${0.8 * flicker})`);
        grad.addColorStop(1, 'rgba(34,211,238,0)');
        cctx.fillStyle = grad;
        cctx.arc(0, h * 0.55, w * 0.5, 0, Math.PI * 2);
        cctx.fill();

        // hull
        cctx.fillStyle = '#e8f2ff';
        cctx.shadowColor = 'rgba(77,168,255,0.9)';
        cctx.shadowBlur = 12;
        cctx.beginPath();
        cctx.moveTo(0, -h / 2);              // nose
        cctx.lineTo(w * 0.32, h * 0.18);      // right shoulder
        cctx.lineTo(w * 0.5, h * 0.46);       // right wingtip
        cctx.lineTo(w * 0.14, h * 0.3);       // right wing root
        cctx.lineTo(0, h * 0.46);             // tail notch
        cctx.lineTo(-w * 0.14, h * 0.3);      // left wing root
        cctx.lineTo(-w * 0.5, h * 0.46);      // left wingtip
        cctx.lineTo(-w * 0.32, h * 0.18);     // left shoulder
        cctx.closePath();
        cctx.fill();

        // cockpit
        cctx.fillStyle = '#4da8ff';
        cctx.shadowBlur = 6;
        cctx.beginPath();
        cctx.ellipse(0, -h * 0.08, w * 0.13, h * 0.16, 0, 0, Math.PI * 2);
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
          cctx.fillRect(o.x - o.w * 0.18, o.y, o.w * 0.18, o.h);
          cctx.fillRect(o.x + o.w, o.y, o.w * 0.18, o.h);
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

        cctx.fillStyle = 'rgba(245,243,255,0.5)';
        gameStars.forEach((s) => {
          cctx.globalAlpha = 0.6;
          cctx.beginPath();
          cctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          cctx.fill();
        });
        cctx.globalAlpha = 1;

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
        if (!alive) return; // stop scheduling once unmounted
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
        root.querySelector('#ar-restart').addEventListener('click', () => {
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

      function onKeydown(e) {
        if (e.code === 'Space') { e.preventDefault(); jump(); }
        if (e.key === 'p' || e.key === 'P') pauseBtn.click();
      }
      window.addEventListener('keydown', onKeydown);
      canvas.addEventListener('pointerdown', jump);
      jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
      window.addEventListener('resize', fitCanvas);

      running = false;
      obstacles = [];
      gameStars = [];
      fitCanvas();
      requestAnimationFrame(loop);

      // Teardown, called by the picker when leaving this game
      this._cleanup = () => {
        alive = false;
        window.removeEventListener('keydown', onKeydown);
        window.removeEventListener('resize', fitCanvas);
      };
    },

    unmount() {
      if (this._cleanup) this._cleanup();
    }
  };
})();
