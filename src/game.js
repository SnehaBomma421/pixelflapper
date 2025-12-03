// src/game.js
// Full game file with sprite preload fix and dashboard integration:
// - Uses persisted current user (flappy_bird_current_user) for score submission
// - Dispatches returnedFromGame event when navigating to dashboard (ESC / submit)
// - Prevents yellow fallback bird on READY screen (shows fallback only while playing)
// - Includes death particle effect and proper GAME OVER rendering

const CANVAS_W = 480;
const CANVAS_H = 800;
const GROUND_HEIGHT = 40;

const STAR_COUNT = 140;
const STAR_MIN_SIZE = 1;
const STAR_MAX_SIZE = 3;

export function renderGame(container) {
  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-header" style="display:none;"></div>

      <div class="canvas-shell">
        <canvas id="gameCanvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        <div class="game-overlay" id="gameOverlay" style="display:flex;align-items:center;justify-content:center;">
          <div id="overlayReady" class="overlay-pane">
            <h2 class="overlay-title">PIXEL FLAPPER</h2>
            <p class="overlay-sub">Press SPACE or Click to flap</p>
            <button id="startBtn" class="btn big pink">Start</button>
          </div>
        </div>
      </div>

      <div id="outsideControls" style="margin-top:10px;"></div>
    </div>
  `;

  const canvas = container.querySelector('#gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = { textContent: '' };
  const overlay = container.querySelector('#gameOverlay');
  const outside = container.querySelector('#outsideControls');

  /*******************
   * BIRD SPRITE LOAD
   *******************/
  const birdImg = new Image();
  birdImg.src = '/bird.png'; // matches C:\FlappyBird\pixelflapper\src\bird.png served at /src/bird.png

  function spriteLoaded() {
    return birdImg && birdImg.complete && birdImg.naturalWidth !== 0;
  }

  birdImg.onload = () => {
    drawFrame();
  };
  birdImg.onerror = () => {
    console.warn('Bird sprite failed to load from /src/bird.png. Falling back to rectangle when playing.');
  };

  /* Stars */
  const stars = createStars(STAR_COUNT);

  /* Game state */
  let state = 'ready';
  let score = 0;
  let lastTs = 0;
  let pipes = [];
  let spawnTimer = 0;
  let pipeGap = 150;
  let pipeSpeed = 2.8;

  // bird properties
  const bird = { x: 80, y: CANVAS_H/2, vy: 0, w: 48, h: 36, rot: 0, alive: true, alpha: 1 };

  // blood particle system
  let bloodParticles = [];

  reset();

  /* Input */
  function flap() {
    if (state === 'ready') { startGame(); return; }
    if (state !== 'playing') return;
    bird.vy = -7.8;
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); flap(); }
    if (e.key === 'r' || e.key === 'R') { reset(); startGame(); }
    if (e.key === 'Escape') {
      location.hash = '#/';
      // notify dashboard to update UI immediately
      window.dispatchEvent(new Event('returnedFromGame'));
    }
  });
  canvas.addEventListener('click', flap);
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); flap(); });

  /* Lifecycle */
  function reset() {
    state = 'ready';
    score = 0;
    pipes = [];
    spawnTimer = 0;
    bird.y = CANVAS_H/2;
    bird.vy = 0;
    bird.rot = 0;
    bird.alive = true;
    bird.alpha = 1;
    bloodParticles = [];
    outside.innerHTML = '';
    showReadyOverlay();
    drawFrame();
  }

  function startGame() {
    state = 'playing';
    overlay.style.display = 'none';
    score = 0;
    pipes = [];
    spawnTimer = 0;
    bird.y = CANVAS_H/2;
    bird.vy = -6;
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function showReadyOverlay() {
    overlay.style.display = 'flex';
    overlay.innerHTML = `<div id="overlayReady" class="overlay-pane">
      <h2 class="overlay-title">PIXEL FLAPPER</h2>
      <p class="overlay-sub">Press SPACE or Click to flap</p>
      <button id="startBtn" class="btn big pink">Start</button>
    </div>`;
    const btn = container.querySelector('#startBtn');
    if (btn) btn.addEventListener('click', startGame);
  }

  /* Death / blood helpers */
  function spawnBlood(x, y, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.0;
      bloodParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        life: 600 + Math.random() * 400,
        age: 0,
        size: 2 + Math.floor(Math.random() * 3),
        color: randomRedShade()
      });
    }
  }
  function randomRedShade() {
    const shades = ['#ff4a4a', '#ff2a2a', '#ff6b6b', '#ff1a3a'];
    return shades[Math.floor(Math.random() * shades.length)];
  }
  function killBird() {
    if (!bird.alive) return;
    bird.alive = false;
    spawnBlood(bird.x, bird.y, 26);
    bird.vy = -2;
    bird.rot = 0.6;
  }

  /* Canvas Game Over */
  function showGameOverCanvas(finalScore) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#f7c7cf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '52px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 30);

    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffdfe6';
    ctx.fillText(`Final Score: ${finalScore}`, CANVAS_W / 2, CANVAS_H / 2 + 26);
  }

  function showOutsideControls() {
    outside.innerHTML = `
      <div class="game-over-title" style="font-family:'Press Start 2P',monospace;color:#ffcade;font-size:12px;">GAME OVER</div>
      <div class="game-score" style="font-family:'Press Start 2P',monospace;color:#ffe2f0;font-size:12px;margin-top:6px;">Final Score: ${score}</div>

      <div style="font-family:'Press Start 2P', monospace; color:#ffe2f0; font-size:10px; margin-top:8px;">
        Press ESC to return to dashboard
      </div>

      <div class="button-row" style="margin-top:10px; display:flex; gap:12px; align-items:center;">
        <button id="retryBtn" class="btn-retro" style="padding:10px 18px; border-radius:10px; font-family:'Press Start 2P',monospace;">RETRY</button>
        <button id="prettySubmitBtn" class="btn-retro" style="padding:10px 18px; border-radius:10px; font-family:'Press Start 2P',monospace;">SUBMIT SCORE</button>
      </div>
    `;
    const retry = outside.querySelector('#retryBtn');
    const submit = outside.querySelector('#prettySubmitBtn');
    if (retry) retry.addEventListener('click', ()=>{ reset(); startGame(); });
    if (submit) submit.addEventListener('click', submitScoreFromGame);
  }

  function showGameOver() {
    state = 'gameover';
    overlay.style.display = 'flex';
    overlay.innerHTML = '';
    showOutsideControls();
    drawFrame();
  }

  /* Main loop */
  function loop(ts) {
    const dt = Math.min((ts - lastTs) / (1000/60), 4);
    lastTs = ts;
    update(dt);
    drawFrame();
    if (state === 'playing') requestAnimationFrame(loop);
  }

  function update(dt) {
    if (state !== 'playing') {
      updateBlood(dt);
      return;
    }

    bird.vy += 0.45 * dt;
    bird.y += bird.vy * dt;
    if (!bird.alive) {
      bird.rot += 0.02 * dt;
      bird.alpha = Math.max(0, bird.alpha - 0.01 * dt);
    } else {
      bird.rot = Math.max(Math.min(bird.vy / 10, 1), -1) * 0.6;
    }

    spawnTimer += dt;
    if (spawnTimer > 90) { spawnTimer = 0; spawnPipe(); }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= pipeSpeed * dt;
      if (!p.counted && p.x + p.w < bird.x) {
        p.counted = true;
        score += 1;
        scoreEl.textContent = score;
      }
      if (p.x + p.w < -50) pipes.splice(i,1);
    }

    if (bird.y + bird.h/2 >= CANVAS_H - GROUND_HEIGHT) {
      bird.y = CANVAS_H - GROUND_HEIGHT - bird.h/2;
      if (bird.alive) {
        killBird();
        setTimeout(()=> { showGameOver(); }, 220);
      }
    }

    if (bird.y - bird.h/2 <= 0) {
      bird.y = bird.h/2;
      bird.vy = 0;
    }

    for (const p of pipes) {
      const topRect = { x: p.x, y: 0, w: p.w, h: p.topH };
      const bottomRect = { x: p.x, y: p.bottomY, w: p.w, h: CANVAS_H - p.bottomY - GROUND_HEIGHT };
      const bRect = { x: bird.x - bird.w/2, y: bird.y - bird.h/2, w: bird.w, h: bird.h };
      if (rectOverlap(bRect, topRect) || rectOverlap(bRect, bottomRect)) {
        if (bird.alive) {
          spawnBlood(bird.x, bird.y, 28);
          killBird();
          setTimeout(()=> { showGameOver(); }, 220);
        }
      }
    }

    updateBlood(dt);
  }

  function spawnPipe() {
    const w = 68;
    const minTop = 70;
    const maxTop = CANVAS_H - GROUND_HEIGHT - pipeGap - 120;
    const topH = Math.floor(minTop + Math.random() * Math.max(0, maxTop - minTop));
    pipes.push({ x: CANVAS_W + 20, w, topH, bottomY: topH + pipeGap, counted: false });
  }

  function rectOverlap(a,b){ return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h); }

  /* Blood particle update/draw */
  function updateBlood(dt) {
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      const p = bloodParticles[i];
      p.age += dt * (1000/60);
      p.vy += 0.12 * dt;
      p.x += p.vx * dt * 1.2;
      p.y += p.vy * dt * 1.2;
      p.vx *= 0.99;
      p.vy *= 0.995;
      if (p.age >= p.life) bloodParticles.splice(i, 1);
    }
  }

  function drawBlood(ctx) {
    for (const p of bloodParticles) {
      const lifeRatio = Math.max(0, 1 - p.age / p.life);
      ctx.globalAlpha = lifeRatio;
      ctx.fillStyle = p.color;
      const size = Math.max(1, Math.floor(p.size * lifeRatio));
      ctx.fillRect(Math.round(p.x - size/2), Math.round(p.y - size/2), size, size);
    }
    ctx.globalAlpha = 1;
  }

  /* Draw everything */
  function drawFrame() {
    ctx.fillStyle = '#0f274d';
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

    drawPlusStars(ctx, stars);

    // pipes
    for (const p of pipes) {
      ctx.fillStyle = '#ff3ea3';
      ctx.fillRect(p.x, 0, p.w, p.topH);
      ctx.fillRect(p.x, p.bottomY, p.w, CANVAS_H - p.bottomY - GROUND_HEIGHT);
    }

    // ground
    ctx.fillStyle = '#f6c7cf';
    ctx.fillRect(0, CANVAS_H - GROUND_HEIGHT, CANVAS_W, GROUND_HEIGHT);

    // draw blood behind bird for depth
    drawBlood(ctx);

    // bird: draw sprite if loaded; otherwise:
    // - if we're PLAYING, draw fallback so user can test
    // - if READY or GAMEOVER and sprite not loaded, skip drawing fallback (prevents yellow box)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    ctx.globalAlpha = bird.alpha;

    const drawW = bird.w;
    const drawH = bird.h;
    const hasSprite = spriteLoaded();

    if (hasSprite) {
      ctx.drawImage(birdImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      if (state === 'playing') {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(-drawW/2, -drawH/2, drawW, drawH);
      }
    }

    ctx.restore();

    // draw blood on top for layered effect
    drawBlood(ctx);

    if (state === 'gameover') showGameOverCanvas(score);
  }

  /* Stars helpers */
  function createStars(n){
    const arr = [];
    for (let i=0;i<n;i++){
      arr.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * (CANVAS_H - GROUND_HEIGHT - 40),
        size: Math.floor(Math.random() * (STAR_MAX_SIZE - STAR_MIN_SIZE + 1)) + STAR_MIN_SIZE,
        alpha: 0.45 + Math.random() * 0.6,
        blinkFreq: 0.002 + Math.random() * 0.008
      });
    }
    return arr;
  }

  function drawPlusStars(ctx, starArray) {
    const t = performance.now();
    for (const s of starArray) {
      const tw = 0.6 + 0.4 * Math.sin(t * s.blinkFreq);
      const alpha = Math.max(0.15, Math.min(1, s.alpha * tw));
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      const cx = Math.round(s.x);
      const cy = Math.round(s.y);
      const half = Math.max(1, Math.floor(s.size / 2));
      ctx.fillRect(cx - Math.floor(s.size/4), cy - half, Math.max(1, Math.floor(s.size/2)), s.size);
      ctx.fillRect(cx - half, cy - Math.floor(s.size/4), s.size, Math.max(1, Math.floor(s.size/2)));
    }
  }

  /* Submit score (now uses persisted current user) */
  function submitScoreFromGame(){
    // Prefer explicit persisted current user (set by dashboard on login/signup)
    let username = localStorage.getItem('flappy_bird_current_user') || null;

    // fallback: DOM or last registered user
    if (!username) {
      try {
        const el = document.querySelector('#current-user');
        if (el) {
          const spans = el.querySelectorAll('span');
          if (spans.length > 1) {
            const candidate = spans[spans.length-1].textContent.trim();
            if (candidate) username = candidate;
          }
        }
      } catch(e){ /* ignore */ }
    }
    if (!username) {
      const usersList = JSON.parse(localStorage.getItem('flappy_bird_users') || '[]');
      if (usersList.length) username = usersList[usersList.length - 1].username;
    }

    if (!username) {
      alert('No user logged in. Please sign up or log in on the Dashboard before submitting a score.');
      return;
    }

    const key = 'flappy_bird_scores';
    let scoresArr = [];
    try { scoresArr = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ scoresArr = []; }

    const existing = scoresArr.find(s => s.username === username);
    if (existing) {
      if (score > existing.score) existing.score = score;
    } else {
      scoresArr.push({ username, score });
    }
    scoresArr.sort((a,b)=> b.score - a.score);
    localStorage.setItem(key, JSON.stringify(scoresArr.slice(0,50)));

    // notify dashboard to refresh leaderboard immediately
    window.dispatchEvent(new Event('returnedFromGame'));

    alert('Score submitted: ' + username + ' — ' + score);
  }

  /* initial draw */
  drawFrame();
}
