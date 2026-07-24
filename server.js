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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
