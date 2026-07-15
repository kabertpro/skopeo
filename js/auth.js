/* ============================================================
   SKOPEO — Puerta de acceso por contraseña
   ------------------------------------------------------------
   Disuasión visual simple, no seguridad real (ver notas del
   proyecto). Recuerda el acceso en este dispositivo/navegador
   vía localStorage, así el docente no la reescribe cada vez.
   ============================================================ */

(function(){
  const STORAGE_KEY = 'skopeo_auth_ok';

  function alreadyUnlocked(){
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  function unlock(){
    localStorage.setItem(STORAGE_KEY, '1');
  }

  function skopeoLogout(){
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
  window.skopeoLogout = skopeoLogout;

  function showGate(){
    const gate = document.createElement('div');
    gate.id = 'skopeo-auth-gate';
    gate.innerHTML = `
      <div class="box">
        <h2>Skop<span>eo</span></h2>
        <p>Ingresa la contraseña para continuar.</p>
        <input type="password" id="skopeo-pass-input" placeholder="Contraseña" autocomplete="off" inputmode="text">
        <div class="error" id="skopeo-pass-error"></div>
        <button class="btn" id="skopeo-pass-btn" style="width:100%;justify-content:center;">Entrar</button>
      </div>
    `;
    document.body.appendChild(gate);

    const input = document.getElementById('skopeo-pass-input');
    const btn = document.getElementById('skopeo-pass-btn');
    const errorEl = document.getElementById('skopeo-pass-error');

    function attempt(){
      if (input.value === SKOPEO_CONFIG.APP_PASSWORD){
        unlock();
        gate.remove();
      } else {
        errorEl.textContent = 'Contraseña incorrecta.';
        input.value = '';
        input.focus();
      }
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
    setTimeout(() => input.focus(), 50);
  }

  // Se ejecuta apenas carga el <script>, antes de pintar el resto —
  // así el contenido real nunca "parpadea" visible antes del gate.
  if (!alreadyUnlocked()){
    document.addEventListener('DOMContentLoaded', showGate);
  }
})();
