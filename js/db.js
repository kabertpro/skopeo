/* ============================================================
   SKOPEO — Capa de acceso a datos (Supabase)
   Todas las funciones devuelven { data, error } — nunca lanzan
   excepciones directamente, para que cada pantalla decida cómo
   mostrar el error al docente.
   ============================================================ */

const SkopeoDB = (function(){
  const client = () => skopeoGetClient();

  // ---------------- CURSOS ----------------

  async function getCursos(){
    return await client().from('cursos').select('*').order('nombre');
  }

  async function crearCurso(nombre){
    return await client().from('cursos').insert({ nombre }).select().single();
  }

  async function eliminarCurso(cursoId){
    return await client().from('cursos').delete().eq('id', cursoId);
  }

  // ---------------- ESTUDIANTES ----------------

  async function getEstudiantes(cursoId){
    return await client()
      .from('estudiantes')
      .select('*')
      .eq('curso_id', cursoId)
      .order('numero');
  }

  // lista: [{ numero, nombre }, ...]
  // upsert: si el número ya existe en ese curso, actualiza el nombre.
  async function importarEstudiantes(cursoId, lista){
    const filas = lista.map(e => ({ curso_id: cursoId, numero: e.numero, nombre: e.nombre }));
    return await client()
      .from('estudiantes')
      .upsert(filas, { onConflict: 'curso_id,numero' })
      .select();
  }

  async function eliminarEstudiante(estudianteId){
    return await client().from('estudiantes').delete().eq('id', estudianteId);
  }

  // ---------------- EVALUACIONES ----------------

  async function getEvaluaciones(cursoId){
    return await client()
      .from('evaluaciones')
      .select('*')
      .eq('curso_id', cursoId)
      .order('creada_en', { ascending: false });
  }

  async function getEvaluacion(evaluacionId){
    return await client().from('evaluaciones').select('*').eq('id', evaluacionId).single();
  }

  // Devuelve la única evaluación en_curso (o data:null si no hay ninguna)
  async function getEvaluacionActiva(){
    const res = await client().from('evaluaciones').select('*').eq('estado', 'en_curso').maybeSingle();
    return res;
  }

  // preguntas: [{ texto, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta }]
  async function crearEvaluacion(cursoId, titulo, preguntas){
    const evalRes = await client()
      .from('evaluaciones')
      .insert({ curso_id: cursoId, titulo, estado: 'pendiente' })
      .select()
      .single();

    if (evalRes.error) return evalRes;

    const filas = preguntas.map((p, i) => ({
      evaluacion_id: evalRes.data.id,
      orden: i + 1,
      texto: p.texto,
      opcion_a: p.opcion_a,
      opcion_b: p.opcion_b,
      opcion_c: p.opcion_c,
      opcion_d: p.opcion_d,
      respuesta_correcta: p.respuesta_correcta,
    }));

    const pregRes = await client().from('preguntas').insert(filas).select();
    if (pregRes.error) return pregRes;

    return { data: { evaluacion: evalRes.data, preguntas: pregRes.data }, error: null };
  }

  async function getPreguntas(evaluacionId){
    return await client()
      .from('preguntas')
      .select('*')
      .eq('evaluacion_id', evaluacionId)
      .order('orden');
  }

  // Marca una evaluación como en_curso. Si ya existe otra activa,
  // Supabase devuelve un error de violación de índice único (23505) —
  // lo traducimos a un mensaje claro para el docente.
  async function iniciarEvaluacion(evaluacionId){
    const res = await client()
      .from('evaluaciones')
      .update({ estado: 'en_curso', pregunta_actual_orden: 1, iniciada_en: new Date().toISOString() })
      .eq('id', evaluacionId)
      .select()
      .single();

    if (res.error && res.error.code === '23505'){
      return { data: null, error: { message: 'Ya hay otra evaluación en curso. Finalízala antes de iniciar una nueva.' } };
    }
    return res;
  }

  async function avanzarPregunta(evaluacionId, nuevoOrden){
    return await client()
      .from('evaluaciones')
      .update({ pregunta_actual_orden: nuevoOrden })
      .eq('id', evaluacionId)
      .select()
      .single();
  }

  async function finalizarEvaluacion(evaluacionId){
    return await client()
      .from('evaluaciones')
      .update({ estado: 'finalizada', finalizada_en: new Date().toISOString() })
      .eq('id', evaluacionId)
      .select()
      .single();
  }

  // ---------------- RESPUESTAS ----------------

  // Primera detección = definitiva. Si el estudiante ya respondió esta
  // pregunta, el índice único (pregunta_id, estudiante_id) rechaza el
  // insert — lo detectamos y devolvemos duplicate:true sin romper el flujo.
  async function registrarRespuesta(evaluacionId, preguntaId, estudianteId, letra, esCorrecta){
    const res = await client()
      .from('respuestas')
      .insert({
        evaluacion_id: evaluacionId,
        pregunta_id: preguntaId,
        estudiante_id: estudianteId,
        respuesta_elegida: letra,
        es_correcta: esCorrecta,
      })
      .select()
      .single();

    if (res.error && res.error.code === '23505'){
      return { data: null, error: null, duplicate: true };
    }
    return { ...res, duplicate: false };
  }

  async function getRespuestasDeEvaluacion(evaluacionId){
    return await client()
      .from('respuestas')
      .select('*, estudiantes(numero, nombre), preguntas(orden, texto)')
      .eq('evaluacion_id', evaluacionId);
  }

  async function getRespuestasDePregunta(evaluacionId, preguntaId){
    return await client()
      .from('respuestas')
      .select('*, estudiantes(numero, nombre)')
      .eq('evaluacion_id', evaluacionId)
      .eq('pregunta_id', preguntaId);
  }

  // ---------------- REALTIME ----------------

  // Se suscribe a nuevas respuestas de una evaluación específica.
  // callback(payload) recibe la fila insertada.
  function suscribirRespuestas(evaluacionId, callback){
    return client()
      .channel(`respuestas-${evaluacionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'respuestas',
        filter: `evaluacion_id=eq.${evaluacionId}`,
      }, callback)
      .subscribe();
  }

  // Se suscribe a cambios en la evaluación misma (avance de pregunta,
  // cambio de estado). Útil para que el celular reaccione cuando el
  // profesor presiona "Siguiente" en la PC.
  function suscribirEvaluacion(evaluacionId, callback){
    return client()
      .channel(`evaluacion-${evaluacionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'evaluaciones',
        filter: `id=eq.${evaluacionId}`,
      }, callback)
      .subscribe();
  }

  function desuscribir(channel){
    if (channel) client().removeChannel(channel);
  }

  return {
    getCursos, crearCurso, eliminarCurso,
    getEstudiantes, importarEstudiantes, eliminarEstudiante,
    getEvaluaciones, getEvaluacion, getEvaluacionActiva, crearEvaluacion, getPreguntas,
    iniciarEvaluacion, avanzarPregunta, finalizarEvaluacion,
    registrarRespuesta, getRespuestasDeEvaluacion, getRespuestasDePregunta,
    suscribirRespuestas, suscribirEvaluacion, desuscribir,
  };
})();
