/* ============================================
   COMET DASH
   Tap/click/space to flap a small comet through
   gaps in drifting asteroid columns. Same fixed
   logical-coordinate approach as Red Orb, so
   difficulty is consistent across screen sizes.
   ============================================ */

(function () {
  'use strict';
  window.Games = window.Games || {};

  const LOGICAL_W = 480;
  const LOGICAL_H = 640;

  window.Games['comet-dash'] = {
    name: 'Comet Dash',
    tagline: 'Flap through the asteroid field.',
    color: '245,158,11',
    icon: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="18" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M25 22 8 40M14 30l4 4M20 24l4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',

    mount(root) {
      root.innerHTML = `
        <style>
          .cd-wrap { display:flex; flex-direction:column; align-items:center; }
          .cd-hud { display:flex; justify-content:space-between; width:100%; max-width:360px;
            font-family:'Space Grotesk',sans-serif; font-size:0.85rem; letter-spacing:0.06em;
            color:rgba(245,243,255,0.6); margin-bottom:10px; text-transform:uppercase; }
          .cd-hud b { color:#f5f3ff; font-weight:600; }
          #cd-canvas { width:100%; max-width:360px; aspect-ratio:${LOGICAL_W}/${LOGICAL_H}; border-radius:6px;
            border:1px solid rgba(245,158,11,0.3); background:radial-gradient(ellipse at 50% 0%,rgba(107,63,160,0.15),#05060d 70%);
            touch-action:none; display:block; cursor:pointer; }
          .cd-canvas-holder { position:relative; width:100%; max-width:360px; }
          .cd-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
            justify-content:center; text-align:center; background:rgba(5,6,13,0.78); border-radius:6px;
            font-family:'Space Grotesk',sans-serif; padding:0 16px; pointer-events:none; }
          .cd-overlay.active { pointer-events:auto; }
          .cd-overlay h3 { font-family:'Cinzel',serif; font-size:1.4rem; margin-bottom:8px; letter-spacing:0.06em; }
          .cd-overlay p { color:rgba(245,243,255,0.6); margin-bottom:16px; font-size:0.88rem; }
          .cd-btn { font-family:'Space Grotesk',sans-serif; letter-spacing:0.08em; text-transform:uppercase;
            font-size:0.8rem; padding:11px 26px; border:1px solid rgba(245,158,11,0.55); background:transparent;
            color:#f5f3ff; border-radius:2px; cursor:pointer; transition:box-shadow .3s ease,border-color .3s ease; }
          .cd-btn:hover { border-color:#f59e0b; box-shadow:0 0 18px rgba(245,158,11,0.4); }
          .cd-hint { margin-top:14px; font-family:'Space Grotesk',sans-serif; font-size:0.78rem; color:rgba(245,243,255,0.4); text-align:center; }
        </style>
        <div class="cd-wrap">
          <div class="cd-hud">
            <span>Score: <b id="cd-score">0</b></span>
            <span>Best: <b id="cd-best">0</b></span>
          </div>
          <div class="cd-canvas-holder">
            <canvas id="cd-canvas"></canvas>
            <div class="cd-overlay active" id="cd-overlay">
              <h3>Comet Dash</h3>
              <p>Tap to flap. Thread the gaps.</p>
              <button class="cd-btn" id="cd-start">Launch</button>
            </div>
          </div>
          <div class="cd-hint">Tap the field, click, or press Space to flap</div>
        </div>
      `;

      const canvas = root.querySelector('#cd-canvas');
      const cctx = canvas.getContext('2d');
      const overlay = root.querySelector('#cd-overlay');
      const startBtn = root.querySelector('#cd-start');
      const scoreEl = root.querySelector('#cd-score');
      const bestEl = root.querySelector('#cd-best');

      let alive = true;
      let scale = 1, dpr = 1;

      function fitCanvas() {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        scale = rect.width / LOGICAL_W;
        cctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      }

      function loadBest() {
        try { return parseInt(localStorage.getItem('cometDashBest') || '0', 10); } catch (e) { return 0; }
      }
      function saveBest(v) {
        try { localStorage.setItem('cometDashBest', String(v)); } catch (e) { /* ignore */ }
      }
      let best = loadBest();
      bestEl.textContent = best;

      const GRAVITY = 0.38;
      const FLAP_VELOCITY = -7.2;
      const GAP_HEIGHT = 165;
      const PIPE_WIDTH = 54;
      const PIPE_SPACING = 220;
      const PIPE_SPEED = 2.3;
      const COMET_X = LOGICAL_W * 0.28;
      const COMET_R = 12;

      let comet, pipes, score, running, frame, tail;

      function resetGame() {
        comet = { y: LOGICAL_H / 2, vy: 0 };
        pipes = [];
        tail = [];
        score = 0;
        frame = 0;
        running = true;
        spawnPipe(LOGICAL_W + 100);
      }

      function spawnPipe(x) {
        const margin = 70;
        const gapCenter = margin + Math.random() * (LOGICAL_H - margin * 2 - GAP_HEIGHT) + GAP_HEIGHT / 2;
        pipes.push({ x, gapCenter, passed: false });
      }

      function flap() {
        if (!running) return;
        comet.vy = FLAP_VELOCITY;
      }

      function update() {
        frame++;
        comet.vy += GRAVITY;
        comet.y += comet.vy;

        tail.unshift({ x: COMET_X, y: comet.y });
        if (tail.length > 10) tail.pop();

        pipes.forEach((p) => (p.x -= PIPE_SPEED));
        if (pipes.length && pipes[pipes.length - 1].x < LOGICAL_W - PIPE_SPACING) {
          spawnPipe(LOGICAL_W + 30);
        }
        pipes = pipes.filter((p) => p.x > -PIPE_WIDTH - 10);

        for (const p of pipes) {
          if (!p.passed && p.x + PIPE_WIDTH < COMET_X) {
            p.passed = true;
            score++;
            scoreEl.textContent = score;
          }
          const withinX = COMET_X + COMET_R > p.x && COMET_X - COMET_R < p.x + PIPE_WIDTH;
          if (withinX) {
            const gapTop = p.gapCenter - GAP_HEIGHT / 2;
            const gapBottom = p.gapCenter + GAP_HEIGHT / 2;
            if (comet.y - COMET_R < gapTop || comet.y + COMET_R > gapBottom) {
              endGame();
              return;
            }
          }
        }

        if (comet.y + COMET_R > LOGICAL_H || comet.y - COMET_R < 0) {
          endGame();
        }
      }

      function drawComet() {
        // faint tail
        tail.forEach((t, i) => {
          const a = (1 - i / tail.length) * 0.35;
          cctx.fillStyle = `rgba(245,158,11,${a})`;
          cctx.beginPath();
          cctx.arc(t.x - i * 2.2, t.y, COMET_R * (1 - i / tail.length * 0.7), 0, Math.PI * 2);
          cctx.fill();
        });

        cctx.save();
        const grad = cctx.createRadialGradient(COMET_X - 4, comet.y - 4, 1, COMET_X, comet.y, COMET_R);
        grad.addColorStop(0, '#fff3d6');
        grad.addColorStop(0.5, '#f59e0b');
        grad.addColorStop(1, '#b45309');
        cctx.fillStyle = grad;
        cctx.shadowColor = 'rgba(245,158,11,0.8)';
        cctx.shadowBlur = 16;
        cctx.beginPath();
        cctx.arc(COMET_X, comet.y, COMET_R, 0, Math.PI * 2);
        cctx.fill();
        cctx.restore();
      }

      function drawPipe(p) {
        const gapTop = p.gapCenter - GAP_HEIGHT / 2;
        const gapBottom = p.gapCenter + GAP_HEIGHT / 2;
        cctx.save();
        cctx.fillStyle = 'rgba(139,92,246,0.28)';
        cctx.strokeStyle = 'rgba(139,92,246,0.7)';
        cctx.shadowColor = 'rgba(139,92,246,0.5)';
        cctx.shadowBlur = 8;
        cctx.lineWidth = 2;
        cctx.fillRect(p.x, 0, PIPE_WIDTH, gapTop);
        cctx.strokeRect(p.x, 0, PIPE_WIDTH, gapTop);
        cctx.fillRect(p.x, gapBottom, PIPE_WIDTH, LOGICAL_H - gapBottom);
        cctx.strokeRect(p.x, gapBottom, PIPE_WIDTH, LOGICAL_H - gapBottom);
        cctx.restore();
      }

      function render() {
        cctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
        // background stars (static pattern, cheap)
        cctx.fillStyle = 'rgba(245,243,255,0.2)';
        for (let i = 0; i < 40; i++) {
          const sx = (i * 53 - frame * 0.15) % LOGICAL_W;
          cctx.fillRect(((sx + LOGICAL_W) % LOGICAL_W), (i * 71) % LOGICAL_H, 1.3, 1.3);
        }
        pipes.forEach(drawPipe);
        drawComet();
      }

      function loop() {
        if (!alive) return;
        if (running) {
          update();
          render();
        }
        requestAnimationFrame(loop);
      }

      function endGame() {
        running = false;
        if (score > best) {
          best = score;
          saveBest(best);
          bestEl.textContent = best;
        }
        overlay.innerHTML = `
          <h3>Impact</h3>
          <p>Score: ${score} &nbsp;·&nbsp; Best: ${best}</p>
          <button class="cd-btn" id="cd-restart">Restart</button>
        `;
        overlay.classList.add('active');
        root.querySelector('#cd-restart').addEventListener('click', () => {
          overlay.classList.remove('active');
          resetGame();
        });
      }

      startBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        resetGame();
      });

      canvas.addEventListener('pointerdown', flap);
      function onKeydown(e) {
        if (e.code === 'Space') { e.preventDefault(); flap(); }
      }
      window.addEventListener('keydown', onKeydown);
      window.addEventListener('resize', fitCanvas);

      comet = { y: LOGICAL_H / 2, vy: 0 };
      pipes = [];
      tail = [];
      frame = 0;
      running = false;
      fitCanvas();
      render();
      requestAnimationFrame(loop);

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
