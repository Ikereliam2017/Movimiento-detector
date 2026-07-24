# Detector de Movimiento con Node.js

Proyecto de ejemplo para VS Code que detecta movimiento usando la cámara web
del navegador y un servidor Node.js (Express).

## ¿Cómo funciona?

1. El navegador captura video de la cámara con `getUserMedia`.
2. Cada 300 ms se toma un fotograma y se compara con el fotograma anterior
   usando un `<canvas>` (comparación pixel por pixel del brillo).
3. Si el porcentaje de píxeles que cambiaron supera el umbral de
   **sensibilidad**, se considera que hubo movimiento.
4. Cuando se detecta movimiento, el navegador envía una captura (imagen PNG
   en base64) al servidor Node.js mediante `POST /api/captura`.
5. El servidor guarda la imagen en la carpeta `capturas/` y la muestra en la
   galería de la página.
6. Desde la galería puedes eliminar una captura individual con el botón
   **✕** en cada imagen, o borrar todas de golpe con el botón
   **"🗑 Borrar todas"** (pide confirmación antes de borrar).

## Estructura del proyecto

```
detector-movimiento/
├── package.json
├── server.js          # Servidor Express (backend)
├── public/
│   ├── index.html      # Interfaz principal
│   ├── style.css        # Estilos
│   └── app.js            # Lógica de detección de movimiento (frontend)
└── capturas/           # Se crea automáticamente, guarda las fotos con movimiento
```

## Instalación y uso en VS Code

1. Abre la carpeta `detector-movimiento` en VS Code.
2. Abre una terminal integrada (`Ctrl + ñ` o `Ver > Terminal`).
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor:
   ```bash
   npm start
   ```
5. Abre el navegador en:
   ```
   http://localhost:3000
   ```
6. Haz clic en **"Iniciar cámara"**, acepta el permiso de cámara y mueve
   algo frente a ella. Verás el estado cambiar a "¡Movimiento detectado!" y
   las capturas aparecerán en la galería.

## Rutas de la API

| Método | Ruta                     | Descripción                              |
|--------|--------------------------|-------------------------------------------|
| POST   | `/api/captura`           | Guarda una nueva captura (imagen base64)  |
| GET    | `/api/capturas`          | Lista todas las capturas guardadas        |
| DELETE | `/api/capturas/:archivo` | Elimina UNA captura por nombre de archivo |
| DELETE | `/api/capturas`          | Elimina TODAS las capturas                |

## Ajustes

- **Sensibilidad**: el control deslizante define qué tan sensible es el
  detector. Valores bajos = detecta hasta el mínimo movimiento. Valores
  altos = solo detecta movimientos grandes.
- Puedes cambiar el intervalo de análisis (300 ms) en `app.js`,
  en la línea `setInterval(analizarFrame, 300)`.
- Puedes cambiar la resolución de análisis (320x240) modificando las
  constantes `ANCHO` y `ALTO` en `app.js` (una resolución menor va más rápido).

## Notas técnicas

- Node.js/Express solo actúa como servidor web y de almacenamiento; el
  procesamiento de imagen ocurre en el navegador con Canvas API, que es la
  forma más simple y portátil de trabajar con video sin depender de
  librerías nativas complejas (como OpenCV) que requieren compilación.
- Si más adelante quieres análisis más avanzado (personas, formas, etc.)
  se puede migrar a librerías como `opencv4nodejs` o `@tensorflow/tfjs-node`,
  pero requieren instalación adicional de dependencias del sistema.
