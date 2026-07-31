/* ============================================
   FRANKHIN — a personal universe
   Core script: starfield, warp transitions, navigation
   ============================================ */

(function () {
  'use strict';

  /* ---------- Canvas starfield ---------- */
  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, DPR;

  const STAR_LAYERS = 3;
  let stars = [];
  let nebulas = [];
  let particles = [];
  let shootingStars = [];

  let warpSpeed = 0;       // 0 = calm drift, ramps up during warp
  let warpTarget = 0;
  let mouseX = 0, mouseY = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function initStars() {
    stars = [];
    const total = Math.floor((W * H) / 3400);
    for (let i = 0; i < total; i++) {
      const layer = Math.floor(Math.random() * STAR_LAYERS);
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.4 + layer * 0.55 + Math.random() * 0.5,
        layer,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.2,
        baseAlpha: 0.35 + Math.random() * 0.65
      });
    }
  }

  function initNebulas() {
    nebulas = [
      { x: W * 0.2, y: H * 0.3, r: Math.max(W, H) * 0.35, color: '107,63,160', phase: 0 },
      { x: W * 0.78, y: H * 0.65, r: Math.max(W, H) * 0.3, color: '77,108,255', phase: 2 },
      { x: W * 0.55, y: H * 0.15, r: Math.max(W, H) * 0.22, color: '34,211,238', phase: 4 }
    ];
  }

  function initParticles() {
    particles = [];
    const total = Math.floor((W * H) / 26000);
    for (let i = 0; i < total; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        r: 0.6 + Math.random() * 1.2,
        alpha: 0.15 + Math.random() * 0.25
      });
    }
  }

  function maybeSpawnShootingStar() {
    if (Math.random() < 0.0035 && shootingStars.length < 2) {
      const y = Math.random() * H * 0.5;
      shootingStars.push({
        x: Math.random() * W * 0.4,
        y,
        vx: 8 + Math.random() * 6,
        vy: 3 + Math.random() * 2,
        life: 1
      });
    }
  }

  let t = 0;
  function draw() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    // Nebulas
    nebulas.forEach((n) => {
      const pulse = 0.85 + Math.sin(t * 0.15 + n.phase) * 0.12;
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * pulse);
      grad.addColorStop(0, `rgba(${n.color},0.16)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    });

    // Warp speed easing
    warpSpeed += (warpTarget - warpSpeed) * 0.05;

    // Stars
    const cx = W / 2, cy = H / 2;
    stars.forEach((s) => {
      s.twinklePhase += 0.016 * s.twinkleSpeed;
      const alpha = s.baseAlpha * (0.55 + 0.45 * Math.sin(s.twinklePhase));

      if (warpSpeed > 0.02) {
        // Streak stars outward from center to simulate flying through space
        const dx = s.x - cx, dy = s.y - cy;
        s.x += dx * warpSpeed * 0.02 * (1 + s.layer);
        s.y += dy * warpSpeed * 0.02 * (1 + s.layer);
        if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) {
          s.x = cx + (Math.random() - 0.5) * 40;
          s.y = cy + (Math.random() - 0.5) * 40;
        }
        ctx.strokeStyle = `rgba(245,243,255,${Math.min(alpha + warpSpeed * 0.3, 1)})`;
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - dx * warpSpeed * 0.03, s.y - dy * warpSpeed * 0.03);
        ctx.stroke();
      } else {
        // gentle parallax drift with mouse
        const px = s.x + (mouseX - 0.5) * s.layer * 6;
        const py = s.y + (mouseY - 0.5) * s.layer * 6;
        ctx.fillStyle = `rgba(245,243,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Ambient particles
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Shooting stars
    maybeSpawnShootingStar();
    shootingStars.forEach((s, i) => {
      ctx.strokeStyle = `rgba(255,255,255,${s.life})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
      ctx.stroke();
      s.x += s.vx; s.y += s.vy; s.life -= 0.012;
    });
    shootingStars = shootingStars.filter((s) => s.life > 0 && s.x < W + 50 && s.y < H + 50);

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); initStars(); initNebulas(); initParticles(); });
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / W; mouseY = e.clientY / H;
  });

  resize(); initStars(); initNebulas(); initParticles(); draw();

  /* ---------- Landing sequence ---------- */
  const titleEl = document.getElementById('title');
  const subtitleEl = document.getElementById('subtitle');
  const beginBtn = document.getElementById('begin-btn');
  const landing = document.getElementById('landing');
  const universe = document.getElementById('universe');
  const muteBtn = document.getElementById('mute-toggle');

  requestAnimationFrame(() => {
    setTimeout(() => titleEl.classList.add('in'), 300);
    setTimeout(() => subtitleEl.classList.add('in'), 1200);
    setTimeout(() => beginBtn.classList.add('in'), 2000);
  });

  function warpTo(callback) {
    if (window.FrankhinAudio) window.FrankhinAudio.playWarp();
    warpTarget = 1;
    setTimeout(() => {
      warpTarget = 0;
      callback && callback();
    }, 1100);
  }

  beginBtn.addEventListener('click', () => {
    if (window.FrankhinAudio) window.FrankhinAudio.init();
    titleEl.classList.add('fade-out');
    subtitleEl.classList.add('fade-out');
    beginBtn.classList.add('fade-out');
    setTimeout(() => {
      landing.classList.add('hidden');
      warpTo(() => {
        universe.classList.remove('hidden');
        muteBtn.classList.remove('hidden');
        buildCelestialField();
        document.getElementById('return-hint').classList.remove('hidden');
      });
    }, 500);
  });

  /* ---------- Celestial navigation field ---------- */
  const ICONS = {
    games: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 20h4M16 18v4M28 21h.01M33 25h.01M12 30c-3 0-5-2.5-5-6.5S9.5 16 13 16h22c3.5 0 6 3.5 6 7.5S38.5 30 35.5 30c-2 0-3-1-4.5-3l-1.8-2.4a3 3 0 0 0-2.4-1.2h-5.6a3 3 0 0 0-2.4 1.2L16.5 27c-1.5 2-2.5 3-4.5 3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ideas: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 8c-6.6 0-12 5.4-12 12 0 4.4 2.4 7.5 4.8 9.8.9.9 1.2 1.7 1.2 2.7V34h12v-1.5c0-1 .3-1.8 1.2-2.7C33.6 27.5 36 24.4 36 20c0-6.6-5.4-12-12-12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 39h8M21.5 43h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    projects: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6c4 3.5 9 10.5 9 18 0 3-1 6-2 8l-2-4h-10l-2 4c-1-2-2-5-2-8 0-7.5 5-14.5 9-18Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="24" cy="19" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M17 30l-4 4v4l4-2M31 30l4 4v4l-4-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    secrets: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 8l2.6 9.4L36 20l-9.4 2.6L24 32l-2.6-9.4L12 20l9.4-2.6L24 8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M37 30l1 3.6L41.6 34l-3.6 1L37 38.6 36 35l-3.6-1L36 33l1-3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
  };

  const CELESTIALS = [
    { id: 'games', label: 'Games', color: '77,168,255', size: 96, x: 0.24, y: 0.34 },
    { id: 'ideas', label: 'Ideas', color: '139,92,246', size: 70, x: 0.72, y: 0.24 },
    { id: 'projects', label: 'Projects', color: '34,211,238', size: 110, x: 0.68, y: 0.68 },
    { id: 'secrets', label: 'Hidden Secrets', color: '245,243,255', size: 46, x: 0.28, y: 0.72 }
  ];

  function buildCelestialField() {
    const field = document.getElementById('celestial-field');
    field.innerHTML = '';
    CELESTIALS.forEach((c) => {
      const wrap = document.createElement('div');
      wrap.className = 'celestial';
      wrap.style.left = (c.x * 100) + '%';
      wrap.style.top = (c.y * 100) + '%';
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('aria-label', c.label);

      const body = document.createElement('div');
      body.className = 'celestial-body';
      body.style.width = c.size + 'px';
      body.style.height = c.size + 'px';
      body.style.background = `radial-gradient(circle at 35% 30%, rgba(${c.color},0.5), rgba(${c.color},0.14) 60%, transparent 75%)`;
      body.style.boxShadow = `0 0 40px rgba(${c.color},0.5)`;
      body.style.animationDelay = (Math.random() * -9) + 's';
      body.style.color = `rgb(${c.color})`;
      body.style.display = 'flex';
      body.style.alignItems = 'center';
      body.style.justifyContent = 'center';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'celestial-icon';
      iconWrap.style.width = (c.size * 0.44) + 'px';
      iconWrap.style.height = (c.size * 0.44) + 'px';
      iconWrap.style.filter = `drop-shadow(0 0 6px rgba(${c.color},0.85))`;
      iconWrap.innerHTML = ICONS[c.id];
      body.appendChild(iconWrap);

      const label = document.createElement('span');
      label.className = 'celestial-label';
      label.textContent = c.label;

      wrap.appendChild(body);
      wrap.appendChild(label);
      wrap.addEventListener('mouseenter', () => { if (window.FrankhinAudio) window.FrankhinAudio.playHover(); });
      wrap.addEventListener('click', () => {
        if (window.FrankhinAudio) window.FrankhinAudio.playClick();
        goTo(c.id);
      });
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter') goTo(c.id); });
      field.appendChild(wrap);
    });
  }

  /* ---------- Section travel ---------- */
  // currentSection is null when the universe is showing, otherwise the id
  // of the visible view. goTo() always hides whatever is CURRENTLY visible
  // before showing the target — this is what fixes the bug where jumping
  // from one section straight into another (e.g. Projects -> Games) used
  // to leave both views stacked on top of each other, since the old code
  // only ever knew how to hide the universe.
  let currentSection = null;

  function goTo(targetId, after) {
    warpTo(() => {
      if (currentSection === 'games') unmountActiveGame();

      if (currentSection) {
        document.getElementById('view-' + currentSection).classList.add('hidden');
      } else {
        universe.classList.add('hidden');
      }

      if (targetId === 'universe') {
        universe.classList.remove('hidden');
        currentSection = null;
      } else {
        document.getElementById('view-' + targetId).classList.remove('hidden');
        currentSection = targetId;
        if (targetId === 'ideas') buildIdeas();
        if (targetId === 'projects') buildProjects();
        if (targetId === 'games') buildGamePicker();
      }

      if (after) after();
    });
  }

  document.querySelectorAll('.back-btn').forEach((btn) => btn.addEventListener('click', () => {
    if (window.FrankhinAudio) window.FrankhinAudio.playClick();
    goTo('universe');
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentSection) goTo('universe');
  });

  /* ---------- Ideas ---------- */
  const IDEAS = [
    {
      title: 'The Gifting Startup',
      body: 'A platform that removes the guesswork from gift-giving — built around relationships, not products. Still early, still burning.'
    },
    {
      title: 'AI as a quiet collaborator',
      body: 'Tools that work in the background of your day rather than demanding attention — assistance that feels like ambient intelligence, not another inbox.'
    },
    {
      title: 'Finance made human',
      body: 'Accounting and reporting tools that speak in plain language instead of ledger-speak, built from years of sitting inside spreadsheets that should be simpler.'
    },
    {
      title: 'Slow travel journaling',
      body: 'A way of documenting a journey that resists the highlight reel — more field notes, less feed.'
    }
  ];

  function buildIdeas() {
    const field = document.getElementById('idea-field');
    if (field.dataset.built) return;
    field.dataset.built = '1';
    IDEAS.forEach((idea) => {
      const star = document.createElement('div');
      star.className = 'idea-star';
      const label = document.createElement('span');
      label.textContent = idea.title;
      star.appendChild(label);
      star.addEventListener('mouseenter', () => { if (window.FrankhinAudio) window.FrankhinAudio.playHover(); });
      star.addEventListener('click', () => {
        if (window.FrankhinAudio) window.FrankhinAudio.playClick();
        openIdea(idea);
      });
      field.appendChild(star);
    });
  }

  function openIdea(idea) {
    document.getElementById('idea-detail-title').textContent = idea.title;
    document.getElementById('idea-detail-body').textContent = idea.body;
    document.getElementById('idea-detail').classList.remove('hidden');
  }
  document.getElementById('idea-close').addEventListener('click', () => {
    document.getElementById('idea-detail').classList.add('hidden');
  });

  /* ---------- Projects ---------- */
  const PROJECTS = [
    { name: 'Astro Runner', desc: 'Browser game', color: '77,168,255', locked: false, action: () => goTo('games', () => mountGame('astro-runner')) },
    { name: 'Business', desc: 'In orbit', color: '139,92,246', locked: true },
    { name: 'AI Projects', desc: 'Forming', color: '34,211,238', locked: true },
    { name: 'Websites', desc: 'Forming', color: '245,243,255', locked: true },
    { name: 'Gifting Startup', desc: 'Early stage', color: '77,108,255', locked: true }
  ];

  function buildProjects() {
    const field = document.getElementById('project-field');
    if (field.dataset.built) return;
    field.dataset.built = '1';
    PROJECTS.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'project-planet' + (p.locked ? ' locked' : '');
      const orb = document.createElement('div');
      orb.className = 'orb';
      orb.style.background = `radial-gradient(circle at 35% 30%, rgba(${p.color},0.9), rgba(${p.color},0.25) 65%)`;
      const h4 = document.createElement('h4');
      h4.textContent = p.name;
      const desc = document.createElement('p');
      desc.textContent = p.locked ? 'Coming soon' : p.desc;
      card.appendChild(orb);
      card.appendChild(h4);
      card.appendChild(desc);
      if (!p.locked) card.addEventListener('mouseenter', () => { if (window.FrankhinAudio) window.FrankhinAudio.playHover(); });
      if (!p.locked && p.action) card.addEventListener('click', () => {
        if (window.FrankhinAudio) window.FrankhinAudio.playClick();
        p.action();
      });
      field.appendChild(card);
    });
  }

  /* ---------- Games picker ---------- */
  // Each game module registers itself into window.Games (see games/*/script.js)
  // as { name, tagline, color, icon, mount(root), unmount() }. The picker below
  // just reads that registry, so adding a new game never requires touching this file.
  let activeGameId = null;

  function buildGamePicker() {
    const picker = document.getElementById('game-picker');
    if (picker.dataset.built) return;
    picker.dataset.built = '1';
    const games = window.Games || {};
    Object.keys(games).forEach((id) => {
      const g = games[id];
      const card = document.createElement('div');
      card.className = 'game-card';
      card.style.setProperty('--accent', g.color);
      card.style.color = `rgb(${g.color})`;

      const icon = document.createElement('div');
      icon.className = 'game-card-icon';
      icon.innerHTML = g.icon || '';

      const h4 = document.createElement('h4');
      h4.style.color = 'var(--star-white)';
      h4.textContent = g.name;

      const p = document.createElement('p');
      p.textContent = g.tagline || '';

      card.appendChild(icon);
      card.appendChild(h4);
      card.appendChild(p);
      card.addEventListener('mouseenter', () => { if (window.FrankhinAudio) window.FrankhinAudio.playHover(); });
      card.addEventListener('click', () => {
        if (window.FrankhinAudio) window.FrankhinAudio.playClick();
        mountGame(id);
      });
      picker.appendChild(card);
    });
  }

  function mountGame(id) {
    const g = window.Games && window.Games[id];
    if (!g) return;
    unmountActiveGame();
    activeGameId = id;
    document.getElementById('game-picker').classList.add('ui-hidden');
    const wrap = document.getElementById('game-mount-wrap');
    wrap.classList.remove('ui-hidden');
    g.mount(document.getElementById('game-mount'));
  }

  function unmountActiveGame() {
    if (activeGameId && window.Games[activeGameId] && window.Games[activeGameId].unmount) {
      window.Games[activeGameId].unmount();
    }
    activeGameId = null;
    const mount = document.getElementById('game-mount');
    if (mount) mount.innerHTML = '';
    document.getElementById('game-mount-wrap').classList.add('ui-hidden');
    document.getElementById('game-picker').classList.remove('ui-hidden');
  }

  document.getElementById('game-back').addEventListener('click', () => {
    if (window.FrankhinAudio) window.FrankhinAudio.playClick();
    unmountActiveGame();
  });

  /* ---------- Hidden secret: Konami-style key sequence ---------- */
  const SECRET_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
  let seqProgress = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === SECRET_SEQUENCE[seqProgress]) {
      seqProgress++;
      if (seqProgress === SECRET_SEQUENCE.length) {
        document.getElementById('secret-modal').classList.remove('hidden');
        seqProgress = 0;
      }
    } else {
      seqProgress = (e.key === SECRET_SEQUENCE[0]) ? 1 : 0;
    }
  });
  document.getElementById('secret-close').addEventListener('click', () => {
    document.getElementById('secret-modal').classList.add('hidden');
  });

  /* ---------- Mute toggle ---------- */
  const SOUND_ON_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const SOUND_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  function paintMuteBtn(isOn) {
    muteBtn.innerHTML = isOn ? SOUND_ON_ICON : SOUND_OFF_ICON;
    muteBtn.classList.toggle('is-on', isOn);
    muteBtn.setAttribute('aria-label', isOn ? 'Mute ambient sound' : 'Unmute ambient sound');
  }

  paintMuteBtn(false); // starts muted; visitor opts in to sound
  muteBtn.addEventListener('click', () => {
    if (!window.FrankhinAudio) return;
    window.FrankhinAudio.init();
    const nextMuted = !window.FrankhinAudio.isMuted();
    window.FrankhinAudio.setMuted(nextMuted);
    paintMuteBtn(!nextMuted);
  });

})();
