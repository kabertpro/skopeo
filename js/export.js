/* ============================================================
   SKOPEO — Exportación de resultados (CSV / TXT)
   ============================================================ */

const SkopeoExport = (function(){

  function descargarArchivo(nombre, contenido, mime){
    const blob = new Blob(['\uFEFF' + contenido], { type: mime }); // BOM para acentos en Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escaparCSV(valor){
    const str = String(valor ?? '');
    if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  // estudiantes: [{id, numero, nombre}]
  // preguntas: [{id, orden, texto, respuesta_correcta}]
  // respuestas: [{estudiante_id, pregunta_id, respuesta_elegida, es_correcta}]
  function construirMatriz(estudiantes, preguntas, respuestas){
    const mapaRespuestas = new Map(); // key `${estudiante_id}|${pregunta_id}` -> respuesta
    respuestas.forEach(r => mapaRespuestas.set(`${r.estudiante_id}|${r.pregunta_id}`, r));

    return estudiantes.map(est => {
      let correctas = 0;
      const columnas = preguntas.map(preg => {
        const r = mapaRespuestas.get(`${est.id}|${preg.id}`);
        if (r && r.es_correcta) correctas++;
        return r ? r.respuesta_elegida : '—';
      });
      const nota = preguntas.length > 0 ? ((correctas / preguntas.length) * 100).toFixed(1) : '0.0';
      return { numero: est.numero, nombre: est.nombre, columnas, correctas, total: preguntas.length, nota };
    });
  }

  function exportarCSV(evaluacion, estudiantes, preguntas, respuestas){
    const filas = construirMatriz(estudiantes, preguntas, respuestas);
    const encabezado = ['N°', 'Estudiante', ...preguntas.map(p => `P${p.orden}`), 'Correctas', 'Total', 'Nota (%)'];

    const lineas = [encabezado.map(escaparCSV).join(',')];
    filas.forEach(f => {
      const fila = [f.numero, f.nombre, ...f.columnas, f.correctas, f.total, f.nota];
      lineas.push(fila.map(escaparCSV).join(','));
    });

    const nombreArchivo = `${slugify(evaluacion.titulo)}_resultados.csv`;
    descargarArchivo(nombreArchivo, lineas.join('\n'), 'text/csv;charset=utf-8');
  }

  function exportarTXT(evaluacion, estudiantes, preguntas, respuestas){
    const filas = construirMatriz(estudiantes, preguntas, respuestas);
    const anchoNombre = Math.max(20, ...filas.map(f => f.nombre.length));

    let out = `SKOPEO · Resultados\n`;
    out += `Evaluación: ${evaluacion.titulo}\n`;
    out += `Fecha: ${new Date(evaluacion.finalizada_en || evaluacion.creada_en).toLocaleString('es-BO')}\n`;
    out += `Preguntas: ${preguntas.length}\n`;
    out += '='.repeat(anchoNombre + 30) + '\n\n';

    filas.forEach(f => {
      out += `N°${String(f.numero).padStart(3, ' ')}  ${f.nombre.padEnd(anchoNombre)}  `;
      out += `${f.columnas.join(' ')}   `;
      out += `${f.correctas}/${f.total} (${f.nota}%)\n`;
    });

    out += '\n' + '-'.repeat(anchoNombre + 30) + '\n';
    out += `Promedio del curso: ${(filas.reduce((s, f) => s + parseFloat(f.nota), 0) / (filas.length || 1)).toFixed(1)}%\n`;

    const nombreArchivo = `${slugify(evaluacion.titulo)}_resultados.txt`;
    descargarArchivo(nombreArchivo, out, 'text/plain;charset=utf-8');
  }

  function slugify(texto){
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'evaluacion';
  }

  return { exportarCSV, exportarTXT, construirMatriz };
})();
