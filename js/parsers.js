/* ============================================================
   SKOPEO — Parsers de archivos .txt
   ============================================================ */

const SkopeoParsers = (function(){

  // ------------------------------------------------------------
  // Estudiantes — formato:
  //   1. Pedro Mamani Condori
  //   2. José Álvarez Espejo
  // El número ANTES del punto debe coincidir con el ID físico de la
  // tarjeta ArUco del estudiante (tarjeta "N°1" = ArUco id 0 = numero 1).
  // ------------------------------------------------------------
  function parseEstudiantes(texto){
    const lineas = texto.split(/\r?\n/);
    const resultado = [];
    const errores = [];

    lineas.forEach((linea, i) => {
      const limpia = linea.trim();
      if (!limpia) return;

      const match = limpia.match(/^(\d+)\.\s*(.+)$/);
      if (!match){
        errores.push(`Línea ${i + 1}: no reconocida ("${limpia}")`);
        return;
      }

      const numero = parseInt(match[1], 10);
      const nombre = match[2].trim();
      if (!nombre){
        errores.push(`Línea ${i + 1}: número ${numero} sin nombre`);
        return;
      }

      resultado.push({ numero, nombre });
    });

    // detecta números duplicados dentro del mismo archivo
    const vistos = new Map();
    resultado.forEach(r => {
      vistos.set(r.numero, (vistos.get(r.numero) || 0) + 1);
    });
    vistos.forEach((count, numero) => {
      if (count > 1) errores.push(`El número ${numero} aparece ${count} veces en el archivo`);
    });

    return { estudiantes: resultado, errores };
  }

  // ------------------------------------------------------------
  // Preguntas — formato:
  //   1. Pregunta 1
  //   A. Respuesta 1
  //   B. Respuesta 2
  //   C. Respuesta 3 R
  //   D. Respuesta 4
  // La "R" al final de una opción marca la respuesta correcta y se
  // elimina del texto guardado.
  // ------------------------------------------------------------
  function parsePreguntas(texto){
    const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const preguntas = [];
    const errores = [];

    let actual = null;

    function cerrarActual(numLinea){
      if (!actual) return;
      const faltantes = ['A','B','C','D'].filter(letra => !actual.opciones[letra]);
      if (faltantes.length > 0){
        errores.push(`Pregunta "${actual.texto}": faltan las opciones ${faltantes.join(', ')}`);
      }
      const correctas = Object.keys(actual.opciones).filter(letra => actual.correctaMarcada === letra);
      if (!actual.correctaMarcada){
        errores.push(`Pregunta "${actual.texto}": ninguna opción está marcada con R`);
      }
      if (faltantes.length === 0 && actual.correctaMarcada){
        preguntas.push({
          texto: actual.texto,
          opcion_a: actual.opciones.A,
          opcion_b: actual.opciones.B,
          opcion_c: actual.opciones.C,
          opcion_d: actual.opciones.D,
          respuesta_correcta: actual.correctaMarcada,
        });
      }
    }

    lineas.forEach((linea, i) => {
      const numLinea = i + 1;
      const matchPregunta = linea.match(/^\d+\.\s*(.+)$/);
      const matchOpcion = linea.match(/^([A-Da-d])\.\s*(.+)$/);

      if (matchPregunta){
        cerrarActual(numLinea);
        actual = { texto: matchPregunta[1].trim(), opciones: {}, correctaMarcada: null };
        return;
      }

      if (matchOpcion && actual){
        const letra = matchOpcion[1].toUpperCase();
        let textoOpcion = matchOpcion[2].trim();

        // detecta la "R" final (marca de respuesta correcta) y la remueve
        const marcaR = textoOpcion.match(/^(.*?)\s+R$/i);
        if (marcaR){
          textoOpcion = marcaR[1].trim();
          if (actual.correctaMarcada){
            errores.push(`Pregunta "${actual.texto}": más de una opción marcada con R`);
          }
          actual.correctaMarcada = letra;
        }

        actual.opciones[letra] = textoOpcion;
        return;
      }

      if (!matchPregunta && !matchOpcion){
        errores.push(`Línea ${numLinea}: no reconocida ("${linea}")`);
      }
    });

    cerrarActual(lineas.length);

    return { preguntas, errores };
  }

  return { parseEstudiantes, parsePreguntas };
})();
