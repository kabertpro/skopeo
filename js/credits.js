/* ============================================================
   SKOPEO — Créditos discretos (esquina inferior derecha)
   ============================================================ */

(function(){
  function inject(){
    const el = document.createElement('div');
    el.id = 'skopeo-credits';
    const waNumber = SKOPEO_CREDITS.whatsapp.replace(/[^\d+]/g, '');
    el.innerHTML = `
      <div class="panel">
        <b>${SKOPEO_CREDITS.empresa}</b>
        ${SKOPEO_CREDITS.linea}<br>
        Autor: ${SKOPEO_CREDITS.autor}<br>
        <a href="https://wa.me/${waNumber.replace('+','')}" target="_blank" rel="noopener">WhatsApp ${SKOPEO_CREDITS.whatsapp}</a>
      </div>
      <div class="trigger">© Kabert</div>
    `;
    document.body.appendChild(el);
    el.querySelector('.trigger').addEventListener('click', () => el.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!el.contains(e.target)) el.classList.remove('open');
    });
  }

  document.addEventListener('DOMContentLoaded', inject);
})();
