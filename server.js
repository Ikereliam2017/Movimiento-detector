// server.js
// Servidor Node.js con Express para el Detector de Movimiento.
// Sirve la interfaz web (public/) y expone una ruta para guardar
// capturas (snapshots) que el navegador envia cuando detecta movimiento.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta donde se guardaran las capturas de movimiento
const CAPTURES_DIR = path.join(__dirname, 'capturas');
if (!fs.existsSync(CAPTURES_DIR)) {
  fs.mkdirSync(CAPTURES_DIR);
}

// Middleware para aceptar imagenes en base64 (pueden ser algo pesadas)
app.use(express.json({ limit: '10mb' }));

// Servir el frontend (HTML/CSS/JS) desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para recibir y guardar una captura cuando se detecta movimiento
app.post('/api/captura', (req, res) => {
  try {
    const { imagen } = req.body;

    if (!imagen) {
      return res.status(400).json({ ok: false, error: 'No se recibio ninguna imagen' });
    }

    // La imagen llega como data URL: "data:image/png;base64,XXXXX"
    const base64Data = imagen.replace(/^data:image\/png;base64,/, '');
    const nombreArchivo = `movimiento_${Date.now()}.png`;
    const rutaArchivo = path.join(CAPTURES_DIR, nombreArchivo);

    fs.writeFile(rutaArchivo, base64Data, 'base64', (err) => {
      if (err) {
        console.error('Error al guardar la captura:', err);
        return res.status(500).json({ ok: false, error: 'Error al guardar la captura' });
      }
      console.log(`Movimiento detectado -> captura guardada: ${nombreArchivo}`);
      res.json({ ok: true, archivo: nombreArchivo });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// Ruta para listar las capturas guardadas
app.get('/api/capturas', (req, res) => {
  fs.readdir(CAPTURES_DIR, (err, archivos) => {
    if (err) return res.status(500).json({ ok: false, error: 'No se pudo leer la carpeta' });
    res.json({ ok: true, capturas: archivos.reverse() });
  });
});

// Servir las imagenes guardadas como estaticos
app.use('/capturas', express.static(CAPTURES_DIR));

// Ruta para eliminar UNA captura especifica por nombre de archivo
app.delete('/api/capturas/:archivo', (req, res) => {
  const { archivo } = req.params;

  // Evita "path traversal" (que intenten borrar fuera de la carpeta capturas)
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\')) {
    return res.status(400).json({ ok: false, error: 'Nombre de archivo invalido' });
  }

  const rutaArchivo = path.join(CAPTURES_DIR, archivo);

  fs.unlink(rutaArchivo, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ ok: false, error: 'La captura no existe' });
      }
      console.error('Error al eliminar la captura:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar la captura' });
    }
    console.log(`Captura eliminada: ${archivo}`);
    res.json({ ok: true, archivo });
  });
});

// Ruta para eliminar TODAS las capturas de una vez
app.delete('/api/capturas', (req, res) => {
  fs.readdir(CAPTURES_DIR, (err, archivos) => {
    if (err) return res.status(500).json({ ok: false, error: 'No se pudo leer la carpeta' });

    if (archivos.length === 0) {
      return res.json({ ok: true, eliminadas: 0 });
    }

    let pendientes = archivos.length;
    let errores = 0;

    archivos.forEach((archivo) => {
      fs.unlink(path.join(CAPTURES_DIR, archivo), (err) => {
        if (err) errores++;
        pendientes--;
        if (pendientes === 0) {
          console.log(`Se eliminaron ${archivos.length - errores} capturas`);
          res.json({ ok: true, eliminadas: archivos.length - errores, errores });
        }
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
