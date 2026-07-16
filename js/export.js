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
      const columnas = [];
      const columnasCorrectas = []; // true / false / null (sin respuesta) — paralelo a `columnas`
      preguntas.forEach(preg => {
        const r = mapaRespuestas.get(`${est.id}|${preg.id}`);
        if (r){
          columnas.push(r.respuesta_elegida);
          columnasCorrectas.push(!!r.es_correcta);
          if (r.es_correcta) correctas++;
        } else {
          columnas.push('—');
          columnasCorrectas.push(null);
        }
      });
      const nota = preguntas.length > 0 ? ((correctas / preguntas.length) * 100).toFixed(1) : '0.0';
      return { numero: est.numero, nombre: est.nombre, columnas, columnasCorrectas, correctas, total: preguntas.length, nota };
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

  // ------------------------------------------------------------
  // Colores de la paleta de Skopeo, en RGB (jsPDF no acepta variables CSS)
  // ------------------------------------------------------------
  const COLOR_ACCENT = [79, 209, 165];   // verde — correcta
  const COLOR_ACCENT_DARK = [21, 110, 82]; // verde oscuro, legible sobre blanco
  const COLOR_DANGER = [224, 60, 60];    // rojo — incorrecta
  const COLOR_INK = [17, 24, 30];        // texto principal
  const COLOR_MUTED = [120, 128, 136];   // texto secundario
  const COLOR_HEADER_BG = [15, 21, 27];  // fondo de encabezado de tabla (oscuro, como la app)

  function encabezadoPDF(doc, subtitulo, meta){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLOR_ACCENT_DARK);
    doc.text('SKOPEO', 40, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_INK);
    doc.text(subtitulo, 40, 62);

    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(meta, 40, 76);

    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(1.2);
    doc.line(40, 86, doc.internal.pageSize.getWidth() - 40, 86);
  }

  function piePDF(doc){
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++){
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_MUTED);
      doc.text(
        'Skopeo · Kabert EduLab — Kabert Studio Pro',
        40,
        doc.internal.pageSize.getHeight() - 20
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
    }
  }

  // ------------------------------------------------------------
  // PDF — Reporte de resultados (tabla de estudiantes, coloreado)
  // ------------------------------------------------------------
  function exportarPDF(evaluacion, estudiantes, preguntas, respuestas){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: preguntas.length > 8 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });

    const filas = construirMatriz(estudiantes, preguntas, respuestas);
    const promedio = filas.length > 0
      ? (filas.reduce((s, f) => s + parseFloat(f.nota), 0) / filas.length).toFixed(1)
      : '0.0';
    const participaron = new Set(respuestas.map(r => r.estudiante_id)).size;
    const fecha = new Date(evaluacion.finalizada_en || evaluacion.creada_en).toLocaleString('es-BO');

    encabezadoPDF(
      doc,
      `Reporte de evaluación · ${evaluacion.titulo}`,
      `${fecha}   ·   ${preguntas.length} preguntas   ·   ${estudiantes.length} estudiantes   ·   participación ${estudiantes.length ? Math.round((participaron / estudiantes.length) * 100) : 0}%   ·   promedio del curso ${promedio}/100`
    );

    const head = [['N°', 'Estudiante', ...preguntas.map(p => `P${p.orden}`), 'Puntaje /100']];
    const body = filas.map(f => [f.numero, f.nombre, ...f.columnas, f.nota]);

    doc.autoTable({
      head,
      body,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5, textColor: COLOR_INK, lineColor: [225,228,232] },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248,250,249] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 34 },
        [head[0].length - 1]: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: function(data){
        if (data.section !== 'body') return;
        const colIndex = data.column.index;
        const esColumnaPregunta = colIndex >= 2 && colIndex < 2 + preguntas.length;
        if (esColumnaPregunta){
          const fila = filas[data.row.index];
          const esCorrecta = fila.columnasCorrectas[colIndex - 2];
          data.cell.styles.halign = 'center';
          if (esCorrecta === true){
            data.cell.styles.textColor = COLOR_ACCENT_DARK;
            data.cell.styles.fontStyle = 'bold';
          } else if (esCorrecta === false){
            data.cell.styles.textColor = COLOR_DANGER;
          } else {
            data.cell.styles.textColor = COLOR_MUTED;
          }
        }
      },
    });

    piePDF(doc);
    doc.save(`${slugify(evaluacion.titulo)}_reporte.pdf`);
  }

  // ------------------------------------------------------------
  // PDF — Clave de respuestas (qué opción es la correcta en cada pregunta)
  // ------------------------------------------------------------
  function exportarClaveRespuestasPDF(evaluacion, preguntas){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    encabezadoPDF(
      doc,
      `Clave de respuestas · ${evaluacion.titulo}`,
      `${preguntas.length} preguntas`
    );

    const body = [];
    preguntas.forEach(p => {
      const opciones = [
        ['A', p.opcion_a],
        ['B', p.opcion_b],
        ['C', p.opcion_c],
        ['D', p.opcion_d],
      ];
      opciones.forEach(([letra, texto], idx) => {
        const esCorrecta = letra === p.respuesta_correcta;
        const row = [];
        if (idx === 0){
          row.push({ content: `P${p.orden}`, rowSpan: 4, styles: { valign: 'middle', fontStyle: 'bold', halign: 'center' } });
          row.push({ content: p.texto, rowSpan: 4, styles: { valign: 'middle' } });
        }
        row.push({
          content: letra,
          styles: esCorrecta
            ? { fillColor: COLOR_ACCENT, textColor: COLOR_INK, fontStyle: 'bold', halign: 'center' }
            : { halign: 'center' },
        });
        row.push({
          content: texto,
          styles: esCorrecta ? { fillColor: COLOR_ACCENT, textColor: COLOR_INK } : {},
        });
        body.push(row);
      });
    });

    doc.autoTable({
      head: [['P', 'Pregunta', 'Op.', 'Texto de la opción']],
      body,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5, textColor: COLOR_INK, lineColor: [225,228,232] },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: [255,255,255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 26 } },
    });

    piePDF(doc);
    doc.save(`${slugify(evaluacion.titulo)}_clave_respuestas.pdf`);
  }

  function slugify(texto){
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'evaluacion';
  }

  return { exportarCSV, exportarTXT, exportarPDF, exportarClaveRespuestasPDF, construirMatriz };
})();
