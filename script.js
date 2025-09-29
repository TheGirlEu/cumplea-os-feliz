//música
const bgMusic = document.getElementById("bg-music");

    // Intento inicial de autoplay (funciona en navegadores que lo permiten)
    bgMusic.play().catch(() => {
      // Si está bloqueado, esperará un clic
      document.addEventListener("click", playOnce);
    });

    function playOnce() {
      bgMusic.play();
      document.removeEventListener("click", playOnce); // Solo se activa una vez
    }

// ===== CONFIG =====
    const USE_WHITE = true; // true = fuegos blancos; false = colores aleatorios
    const PARTICLES = 110;   // cantidad principal (aumenta para más "lleno")
    const SPARKS = 60;       // chispas pequeñas secundarias
    const GRAVITY = 0.01;    // ligera caída (0 = partículas rectas)
    const FRICTION = 0.995;  // frena levemente las partículas (1 = sin fricción)
    const TRAIL_LENGTH = 3; // longitud de cola
    // ==================

    const canvas = document.getElementById('fx');
    const ctx = canvas.getContext('2d', { alpha: true });

    let W = innerWidth, H = innerHeight;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    // Ajusta canvas para pantallas retina
    function resize() {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(1,0,0,1,0,0); // reset
      ctx.scale(dpr, dpr); // trabajar en "CSS pixels"
      W = innerWidth;
      H = innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Partículas y flashes
    let particles = [];
    let flashes = [];

    // función auxiliar: obtiene color hsla o blanco
    function particleColor(hue, alpha){
      if (USE_WHITE) return `rgba(255,255,255,${alpha})`;
      return `hsla(${hue},100%,60%,${alpha})`;
    }

    // generar explosión realista
    function spawnFirework(x, y) {
      // destello central
      flashes.push({
        x, y,
        life: 0,
        maxLife: 18 + Math.random()*8,
        maxRadius: 10 + Math.random()*40
      });

      const hue = Math.floor(Math.random() * 360);

      // partículas largas (radiantes)
      for (let i = 0; i < PARTICLES; i++) {
        // distribuir simétricamente con pequeña variación
        const angle = (i / PARTICLES) * (Math.PI * 2) + (Math.random() - 0.5) * 0.04;
        const speed = 1.5 + Math.random() * 3.2; // velocidad inicial
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 1.6,
          hue,
          life: 1,
          decay: 0.006 + Math.random() * 0.014, // duración
          trail: [],
          type: 'line'
        });
      }

      // chispas pequeñas que brillan y caen rápido
      for (let s = 0; s < SPARKS; s++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 0.8 + Math.random() * 3.2;
        particles.push({
          x, y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 0.9 + Math.random() * 1.2,
          hue,
          life: 1,
          decay: 0.02 + Math.random() * 0.03,
          trail: [],
          type: 'spark'
        });
      }
    }

    // animación principal
    function loop(){
      // efecto "photographic trail": pintamos una capa semitransparente para crear estelas
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; // controla cuánto se borran las colas (0.08 - 0.18)
      ctx.fillRect(0, 0, W, H);

      // usamos aditivo para que los colores brillen como luz real
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = "round";

      // dibujar flashes (destello central)
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life++;
        const t = f.life / f.maxLife;
        const r = f.maxRadius * easeOutCubic(t);
        const a = Math.max(0, 1 - t);

        // radial glow
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
        g.addColorStop(0.5, `rgba(255,200,120,${0.35 * a})`);
        g.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (f.life >= f.maxLife) flashes.splice(i,1);
      }

      // partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // guardar cola
        p.trail.unshift({x: p.x, y: p.y});
        if (p.trail.length > TRAIL_LENGTH) p.trail.pop();

        // mover
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.vy += GRAVITY;

        // disminuir vida
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // dibujar la cola (varias capas para suavizar y dar tapered look)
        const segments = p.trail.length;
        for (let s = 0; s < segments - 1; s++) {
          const a = (1 - s / segments) * p.life; // alpha decreciente
          const start = p.trail[s+1];
          const end = p.trail[s];

          // grosor decreciente
          const lw = p.size * (0.6 + (s / segments) * 0.9);

          ctx.lineWidth = lw;
          ctx.strokeStyle = USE_WHITE
            ? `rgba(255,255,255,${a})`
            : `hsla(${p.hue},100%,60%,${a})`;

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }

        // cabeza brillante
        ctx.beginPath();
        ctx.fillStyle = USE_WHITE ? `rgba(255,255,255,${p.life})` : `hsla(${p.hue},100%,60%,${p.life})`;
        ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // pequeño brillo extra en partículas tipo spark
        if (p.type === 'spark' && Math.random() < 0.03) {
          // tiny sparkle
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${0.6 * p.life})`;
          ctx.arc(p.x + (Math.random()-0.5)*3, p.y + (Math.random()-0.5)*3, 0.9, 0, Math.PI*2);
          ctx.fill();
        }

        // opcional: se podrian crear mini-chispas en el camino, pero ya hay p.spark
      }

      requestAnimationFrame(loop);
    }

    // suavizado
    function easeOutCubic(t){
      return 1 - Math.pow(1 - t, 3);
    }

    // click en página -> crear fuego
    // permitimos clicks en todo el documento (incluso encima del contenido).
    document.addEventListener('click', (ev) => {
      // coordenadas en CSS-pixels (canvas está escalado para dpr internamente)
      const x = ev.clientX;
      const y = ev.clientY;
      spawnFirework(x, y);
    });

    // Start loop
    requestAnimationFrame(loop);

    // empezar con un par de fuegos automáticos opcionales al inicio
    setTimeout(()=> spawnFirework(W*0.5, H*0.35), 300);
    setTimeout(()=> spawnFirework(W*0.7, H*0.25), 800);

    // fuegos artificiales automáticos cada cierto tiempo
setInterval(() => {
  const x = Math.random() * W;   // posición horizontal aleatoria
  const y = Math.random() * (H * 0.5); // parte superior de la pantalla
  spawnFirework(x, y);
}, 1500); // cada 1.5 segundos (puedes subir/bajar este número)


