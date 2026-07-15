/* ============================================================
   SKOPEO — Configuración central
   ------------------------------------------------------------
   Edita SOLO este archivo para conectar tu proyecto de Supabase
   y cambiar la contraseña de acceso. No necesitas tocar nada más.
   ============================================================ */

const SKOPEO_CONFIG = {
  // Reemplaza con los datos de tu proyecto de Supabase
  // (Settings → API en el panel de Supabase)
  SUPABASE_URL: 'https://ayghahockieeohtgucpk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Z2hhaG9ja2llZW9odGd1Y3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDk1MTUsImV4cCI6MjA5OTY4NTUxNX0.ZQ-o-R5ltvcjXq2THzBvInOYydTWCD-Lrh6a9eswTvQ',

  // Contraseña simple de acceso a la interfaz (solo disuasión visual,
  // no es seguridad real — ver conversación de diseño del proyecto).
  APP_PASSWORD: 'kabert2026',

  // Cuántos frames consecutivos iguales para "confirmar" una respuesta
  ARUCO_STABILITY_FRAMES: 6,

  // Tolerancia de coincidencia del detector ArUco (más bajo = más estricto,
  // menos falsos positivos; más alto = más tolerante a mala luz/ángulo).
  ARUCO_MAX_HAMMING_DISTANCE: 4,

  // Resolución interna usada solo para el análisis de cámara (no afecta
  // lo que se ve en pantalla). Bajar esto mejora los FPS en celulares
  // de gama media/baja.
  ARUCO_DETECTION_WIDTH: 800,
  ARUCO_DETECTION_HEIGHT: 450,
};

const SKOPEO_CREDITS = {
  empresa: 'Kabert Studio Pro',
  linea: 'EduLab by LMKE',
  autor: 'Luis Miguel Kapa Escobar',
  whatsapp: '+59165596602',
};
