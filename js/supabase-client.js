/* ============================================================
   SKOPEO — Cliente de Supabase (compartido por toda la app)
   Requiere que config.js se haya cargado antes que este archivo,
   y que el SDK de Supabase (CDN) se haya cargado antes también.
   ============================================================ */

let sb = null;

function skopeoGetClient(){
  if (sb) return sb;

  if (typeof supabase === 'undefined'){
    console.error('[Skopeo] El SDK de Supabase no cargó. Revisa tu conexión a internet.');
    return null;
  }

  if (!SKOPEO_CONFIG.SUPABASE_URL || SKOPEO_CONFIG.SUPABASE_URL.includes('TU-PROYECTO')){
    console.warn('[Skopeo] Falta configurar SUPABASE_URL / SUPABASE_ANON_KEY en js/config.js');
  }

  sb = supabase.createClient(SKOPEO_CONFIG.SUPABASE_URL, SKOPEO_CONFIG.SUPABASE_ANON_KEY);
  return sb;
}
