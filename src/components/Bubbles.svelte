<script>
  import { onMount, onDestroy } from 'svelte';
  
  export let bubbleCount = 40;
  export let colors = ['rgba(255,255,255,0.35)', 'rgba(200,230,255,0.25)', 'rgba(180,210,255,0.18)'];
  export let minRadius = 14; // px
  export let maxRadius = 38; // px
  export let speed = 0.6;
  export let parallax = false;

  let canvas;
  let ctx;
  let rafId;
  let particles = [];
  let width = 0;
  let height = 0;
  let dpr = 1;

  let pointerX = 0.5;
  let pointerY = 0.5;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < bubbleCount; i++) {
      const r = rand(minRadius, maxRadius);
      const x = Math.random() * width;
      const y = Math.random() * height;
      const vy = -rand(0.2, 1.2) * speed * (0.4 + (r / maxRadius));
      const vx = rand(-0.3, 0.3) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const alpha = rand(0.06, 0.28);
      particles.push({ x, y, vx, vy, r, color, alpha });
    }
  }

  function resize() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth;
    height = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (particles.length === 0) initParticles();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let p of particles) {
      let px = p.x;
      let py = p.y;

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.globalAlpha = p.alpha;
      const g = ctx.createRadialGradient(px - p.r * 0.3, py - p.r * 0.4, p.r * 0.1, px, py, p.r);
      g.addColorStop(0, p.color.replace(/rgba\((.*)\)/, 'rgba($1)'));
      g.addColorStop(1, p.color.replace(/rgba\((.*)\)/, 'rgba($1)'));
      ctx.fillStyle = g;
      ctx.fill();
    }

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y + p.r < -20) {
        p.y = height + p.r + rand(0, 40);
        p.x = Math.random() * width;
      }
      if (p.x - p.r > width + 20) p.x = -p.r - rand(0, 40);
      if (p.x + p.r < -20) p.x = width + p.r + rand(0, 40);
    }
  }

  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    pointerX = (clientX - rect.left) / rect.width;
    pointerY = (clientY - rect.top) / rect.height;
  }

  onMount(() => {
    resize();
    initParticles();
    window.addEventListener('resize', resize, { passive: true });
    if (parallax) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('touchmove', onPointerMove, { passive: true });
    }
    loop();
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('touchmove', onPointerMove);
  });
</script>

<style>
  :global(.bubbles-wrapper) {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>

<div class="bubbles-wrapper" aria-hidden="true">
  <canvas bind:this={canvas} class="bubbles-canvas"></canvas>
</div>

