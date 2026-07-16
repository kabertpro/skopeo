/* ============================================================
   SKOPEO — Cuenta regresiva estilo "ronda comienza en..."
   Uso: await SkopeoCountdown.run({ seconds: 5, label: 'LA EVALUACIÓN COMIENZA EN', goText: '¡COMENZANDO!' });
   ============================================================ */

const SkopeoCountdown = (function(){
  const RADIUS = 120;
  const CIRC = 2 * Math.PI * RADIUS;

  function run({ seconds = 3, label = 'PREPARADOS', goText = '¡YA!' } = {}){
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'gc-overlay';
      overlay.innerHTML = `
        <div class="gc-label">${label}</div>
        <div class="gc-ring-wrap">
          <svg viewBox="0 0 260 260">
            <circle class="gc-ring-bg" cx="130" cy="130" r="${RADIUS}"></circle>
            <circle class="gc-ring-fg" id="gcRing" cx="130" cy="130" r="${RADIUS}"
              stroke-dasharray="${CIRC}" stroke-dashoffset="0"></circle>
          </svg>
          <div class="gc-number" id="gcNumber">${seconds}</div>
        </div>
      `;
      document.body.appendChild(overlay);

      const ring = overlay.querySelector('#gcRing');
      const numberEl = overlay.querySelector('#gcNumber');

      // El anillo se vacía en sincronía con el tiempo restante total
      ring.style.transition = `stroke-dashoffset ${seconds}s linear`;
      requestAnimationFrame(() => { ring.style.strokeDashoffset = String(CIRC); });

      let remaining = seconds;

      function tick(){
        remaining--;
        if (remaining > 0){
          numberEl.textContent = remaining;
          numberEl.classList.remove('pop');
          void numberEl.offsetWidth; // fuerza reflow para reiniciar la animación
          numberEl.classList.add('pop');
          setTimeout(tick, 1000);
        } else {
          numberEl.textContent = goText;
          numberEl.classList.remove('pop');
          numberEl.classList.add('go');
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 550);
        }
      }

      setTimeout(tick, 1000);
    });
  }

  return { run };
})();
