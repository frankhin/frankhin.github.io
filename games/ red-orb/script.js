/* ============================================
   RED ORB
   A physics platformer: roll and jump a red orb
   through fixed levels full of gaps and spikes.
   Uses a fixed LOGICAL coordinate system rather than
   raw pixels, so a 320px phone canvas and a 640px
   desktop canvas play identically — everything is
   defined in logical units and scaled to fit.
   ============================================ */

(function () {
  'use strict';
  window.Games = window.Games || {};

  const LOGICAL_W = 640;
  const LOGICAL_H = 280;
  const GROUND_Y = 220;
  const RADIUS = 13;

  const LEVELS = [
    {
      platforms: [{ x0: 0, x1: 220 }, { x0: 270, x1: 430 }, { x0: 480, x1: 640 }, { x0: 690, x1: 980 }],
      spikes: [{ x: 350 }],
      goalX: 940,
      startX: 40
    },
    {
      platforms: [{ x0: 0, x1: 180 }, { x0: 230, x1: 340 }, { x0: 390, x1: 460 }, { x0: 510, x1: 660 }, { x0: 710, x1: 1000 }],
      spikes: [{ x: 280 }, { x: 600 }, { x: 780 }],
      goalX: 960,
      startX: 40
    },
    {
      platforms: [{ x0: 0, x1: 160 }, { x0: 210, x1: 300 }, { x0: 350, x1: 400 }, { x0: 450, x1: 540 }, { x0: 590, x1: 660 }, { x0: 710, x1: 1040 }],
      spikes: [{ x: 250 }, { x: 370 }, { x: 500 }, { x: 850 }, { x: 920 }],
      goalX: 1000,
      startX: 40
    }
  ];

  window.Games['red-orb'] = {
    name: 'Red Orb',
    tagline: 'Roll, jump, survive the drop.',
    color: '239,68,68',
    icon: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.6"/><path d="M12 26c4 3.5 20 3.5 24 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="19" cy="19" r="2.4" fill="currentColor" opacity="0.6"/></svg>',

    mount(root) {
      root.innerHTML = `
        <style>
          .ro-wrap { display:flex; flex-direction:column; align-items:center; }
          .ro-hud { display:flex; justify-content:space-between; width:100%; max-width:640px;
            font-family:'Space Grotesk',sans-serif; font-size:0.85rem; letter-spacing:0.06em;
            color:rgba(245,243,255,0.6); margin-bottom:10px; text-transform:uppercase; }
          .ro-hud b { color:#f5f3ff; font-weight:600; }
          #ro-canvas { width:100%; max-width:640px; aspect-ratio:${LOGICAL_W}/${LOGICAL_H}; border-radius:6px;
            border:1px solid rgba(239,68,68,0.3); background:radial-gradient(ellipse at 50% 0%,rgba(107,63,160,0.15),#05060d 70%);
            touch-action:none; display:block; }
          .ro-canvas-holder { position:relative; width:100%; max-width:640px; }
          .ro-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
            justify-content:center; text-align:center; background:rgba(5,6,13,0.78); border-radius:6px;
            font-family:'Space Grotesk',sans-serif; padding:0 16px; }
          .ro-overlay h3 { font-family:'Cinzel',serif; font-size:1.4rem; margin-bottom:8px; letter-spacing:0.06em; }
          .ro-overlay p { color:rgba(245,243,255,0.6); margin-bottom:16px; font-size:0.88rem; }
          .ro-btn { font-family:'Space Grotesk',sans-serif; letter-spacing:0.08em; text-transform:uppercase;
            font-size:0.8rem; padding:11px 26px; border:1px solid rgba(239,68,68,0.55); background:transparent;
            color:#f5f3ff; border-radius:2px; cursor:pointer; transition:box-shadow .3s ease,border-color .3s ease; }
          .ro-btn:hover { border-color:#ef4444; box-shadow:0 0 18px rgba(239,68,68,0.4); }
          .ro-controls { display:flex; justify-content:space-between; width:100%; max-width:640px; margin-top:16px; gap:12px; }
          .ro-dpad { display:flex; gap:10px; }
          .ro-ctl-btn {
            width:58px; height:50px; font-size:1.1rem;
            background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.4); color:#f5f3ff;
            border-radius:8px; cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:manipulation;
            transition:background .2s ease, transform .1s ease;
          }
          .ro-ctl-btn:active { background:rgba(239,68,68,0.28); transform:scale(0.95); }
          .ro-jump-btn { min-width:120px; }
          .ro-hint { margin-top:10px; font-family:'Space Grotesk',sans-serif; font-size:0.76rem; color:rgba(245,243,255,0.4); text-align:center; }
        </style>
        <div class="ro-wrap">
          <div class="ro-hud">
            <span>Level: <b id="ro-level">1 / ${LEVELS.length}</b></span>
            <span>Deaths: <b id="ro-deaths">0</b></span>
          </div>
          <div class="ro-canvas-holder">
            <canvas id="ro-canvas"></canvas>
            <div class="ro-overlay" id="ro-overlay">
              <h3>Red Orb</h3>
              <p>Roll past the spikes. Don't fall in the gaps.</p>
              <button class="ro-btn" id="ro-start">Start Rolling</button>
            </div>
          </div>
          <div class="ro-controls">
            <div class="ro-dpad">
              <button class="ro-ctl-btn" id="ro-left" aria-label="Roll left">◀</button>
              <button class="ro-ctl-btn" id="ro-right" aria-label="Roll right">▶</button>
            </div>
            <button class="ro-ctl-btn ro-jump-btn" id="ro-jump" aria-label="Jump">⤴ Jump</button>
          </div>
          <div class="ro-hint">Arrow keys / A,D to roll &nbsp;·&nbsp; Space or ▲ to jump</div>
        </div>
      `;

      const canvas = root.querySelector('#ro-canvas');
      const rctx = canvas.getContext('2d');
      const overlay = root.querySelector('#ro-overlay');
      const startBtn = root.querySelector('#ro-start');
      const leftBtn = root.querySelector('#ro-left');
      const rightBtn = root.querySelector('#ro-right');
      const jumpBtn = root.querySelector('#ro-jump');
      const levelEl = root.querySelector('#ro-level');
      const deathsEl = root.querySelector('#ro-deaths');

      let alive = true;
      let scale = 1, dpr = 1;

      function fitCanvas() {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        scale = rect.width / LOGICAL_W;
        rctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      }

      let levelIndex = 0;
      let deaths = 0;
      let ball, cameraX, running, paused, keys, rotation;

      function loadLevel(i) {
        const lvl = LEVELS[i];
        ball = { x: lvl.startX, y: GROUND_Y - RADIUS, vx: 0, vy: 0, onGround: true };
        cameraX = 0;
        rotation = 0;
        running = true;
        levelEl.textContent = (i + 1) + ' / ' + LEVELS.length;
      }

      function platformAt(x) {
        const lvl = LEVELS[levelIndex];
        return lvl.platforms.find((p) => x >= p.x0 && x <= p.x1);
      }

      function respawn() {
        deaths++;
        deathsEl.textContent = deaths;
        loadLevel(levelIndex);
      }

      function levelComplete() {
        running = false;
        const isLast = levelIndex === LEVELS.length - 1;
        overlay.innerHTML = `
          <h3>${isLast ? 'All Levels Cleared' : 'Level Complete'}</h3>
          <p>${isLast ? 'You made it through every field. Deaths: ' + deaths : 'On to the next one.'}</p>
          <button class="ro-btn" id="ro-continue">${isLast ? 'Play Again' : 'Next Level'}</button>
        `;
        overlay.style.display = 'flex';
        root.querySelector('#ro-continue').addEventListener('click', () => {
          overlay.style.display = 'none';
          if (isLast) {
            levelIndex = 0;
            deaths = 0;
            deathsEl.textContent = 0;
          } else {
            levelIndex++;
          }
          loadLevel(levelIndex);
        });
      }

      const GRAVITY = 0.85;
      const MOVE_ACCEL = 0.6;
      const MAX_SPEED = 4.3;
      const FRICTION = 0.86;
      const JUMP_VELOCITY = -12.5;

      function update() {
        if (!running || paused) return;
        const lvl = LEVELS[levelIndex];

        if (keys.left) ball.vx -= MOVE_ACCEL;
        if (keys.right) ball.vx += MOVE_ACCEL;
        ball.vx *= FRICTION;
        ball.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ball.vx));

        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        rotation += ball.vx * 0.06;

        const plat = platformAt(ball.x);
        if (plat && ball.y + RADIUS >= GROUND_Y && ball.vy >= 0) {
          ball.y = GROUND_Y - RADIUS;
          ball.vy = 0;
          ball.onGround = true;
        } else {
          ball.onGround = false;
        }

        if (ball.y - RADIUS > LOGICAL_H + 40 || ball.x < -40) {
          respawn();
          return;
        }

        for (const sp of lvl.spikes) {
          const dx = ball.x - sp.x;
          const dy = ball.y - (GROUND_Y - 10);
          if (Math.abs(dx) < RADIUS * 0.8 && Math.abs(dy) < RADIUS + 8) {
            respawn();
            return;
          }
        }

        if (ball.x + RADIUS >= lvl.goalX) {
          levelComplete();
          return;
        }

        const anchor = LOGICAL_W * 0.35;
        cameraX = Math.max(0, ball.x - anchor);
      }

      function jump() {
        if (!running || paused) return;
        if (ball.onGround) {
          ball.vy = JUMP_VELOCITY;
          ball.onGround = false;
        }
      }

      function drawSpike(x, groundY) {
        rctx.save();
        rctx.fillStyle = '#f5f3ff';
        rctx.shadowColor = 'rgba(245,243,255,0.5)';
        rctx.shadowBlur = 6;
        rctx.beginPath();
        rctx.moveTo(x - 9, groundY);
        rctx.lineTo(x, groundY - 20);
        rctx.lineTo(x + 9, groundY);
        rctx.closePath();
        rctx.fill();
        rctx.restore();
      }

      function drawBall() {
        rctx.save();
        rctx.translate(ball.x - cameraX, ball.y);
        rctx.rotate(rotation);
        const grad = rctx.createRadialGradient(-RADIUS * 0.35, -RADIUS * 0.35, 1, 0, 0, RADIUS);
        grad.addColorStop(0, '#ff8a8a');
        grad.addColorStop(0.55, '#ef4444');
        grad.addColorStop(1, '#a11d1d');
        rctx.fillStyle = grad;
        rctx.shadowColor = 'rgba(239,68,68,0.7)';
        rctx.shadowBlur = 14;
        rctx.beginPath();
        rctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
        rctx.fill();
        rctx.strokeStyle = 'rgba(0,0,0,0.25)';
        rctx.lineWidth = 2;
        rctx.beginPath();
        rctx.moveTo(-RADIUS * 0.6, 0);
        rctx.lineTo(RADIUS * 0.6, 0);
        rctx.stroke();
        rctx.restore();
      }

      function render() {
        rctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
        const lvl = LEVELS[levelIndex];

        rctx.fillStyle = 'rgba(245,243,255,0.25)';
        for (let i = 0; i < 30; i++) {
          const sx = (i * 97 - cameraX * 0.3) % LOGICAL_W;
          rctx.fillRect(((sx + LOGICAL_W) % LOGICAL_W), (i * 53) % (GROUND_Y - 20), 1.4, 1.4);
        }

        rctx.save();
        rctx.translate(-cameraX, 0);

        lvl.platforms.forEach((p) => {
          rctx.fillStyle = 'rgba(139,92,246,0.12)';
          rctx.fillRect(p.x0, GROUND_Y, p.x1 - p.x0, LOGICAL_H - GROUND_Y);
          rctx.strokeStyle = 'rgba(139,92,246,0.6)';
          rctx.lineWidth = 2;
          rctx.beginPath();
          rctx.moveTo(p.x0, GROUND_Y);
          rctx.lineTo(p.x1, GROUND_Y);
          rctx.stroke();
        });

        lvl.spikes.forEach((sp) => drawSpike(sp.x, GROUND_Y));

        rctx.save();
        rctx.strokeStyle = 'rgba(34,211,238,0.9)';
        rctx.shadowColor = 'rgba(34,211,238,0.7)';
        rctx.shadowBlur = 10;
        rctx.lineWidth = 3;
        rctx.beginPath();
        rctx.moveTo(lvl.goalX, GROUND_Y);
        rctx.lineTo(lvl.goalX, GROUND_Y - 55);
        rctx.stroke();
        rctx.fillStyle = 'rgba(34,211,238,0.85)';
        rctx.beginPath();
        rctx.moveTo(lvl.goalX, GROUND_Y - 55);
        rctx.lineTo(lvl.goalX + 22, GROUND_Y - 45);
        rctx.lineTo(lvl.goalX, GROUND_Y - 35);
        rctx.closePath();
        rctx.fill();
        rctx.restore();

        rctx.restore();

        drawBall();
      }

      function loop() {
        if (!alive) return;
        update();
        render();
        requestAnimationFrame(loop);
      }

      keys = { left: false, right: false };
      function onKeydown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') { e.preventDefault(); jump(); }
      }
      function onKeyup(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
      }
      window.addEventListener('keydown', onKeydown);
      window.addEventListener('keyup', onKeyup);

      function bindHold(el, onDown, onUp) {
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointerleave', onUp);
        el.addEventListener('pointercancel', onUp);
      }
      bindHold(leftBtn, () => (keys.left = true), () => (keys.left = false));
      bindHold(rightBtn, () => (keys.right = true), () => (keys.right = false));
      jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });

      window.addEventListener('resize', fitCanvas);

      startBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        loadLevel(levelIndex);
      });

      paused = false;
      fitCanvas();
      loadLevel(0);
      running = false; // wait for Start Rolling
      requestAnimationFrame(loop);

      this._cleanup = () => {
        alive = false;
        window.removeEventListener('keydown', onKeydown);
        window.removeEventListener('keyup', onKeyup);
        window.removeEventListener('resize', fitCanvas);
      };
    },

    unmount() {
      if (this._cleanup) this._cleanup();
    }
  };
})();
                  
