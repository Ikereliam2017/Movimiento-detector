// app.js
// Logica del detector de movimiento en el navegador.
// Metodo: se capturan dos fotogramas seguidos de la camara, se comparan
// pixel por pixel y si el numero de pixeles que cambiaron supera un
// umbral (sensibilidad), se considera que hubo movimiento.

const video = document.getElementById('video');
const canvasCaptura = document.getElementById('canvasCaptura');
const canvasDiferencia = document.getElementById('canvasDiferencia');
const btnIniciar = document.getElementById('btnIniciar');
const btnDetener = document.getElementById('btnDetener');
const inputSensibilidad = document.getElementById('sensibilidad');
const valorSensibilidad = document.getElementById('valorSensibilidad');
const estadoDiv = document.getElementById('estado');
const galeria = document.getElementById('galeria');
const btnBorrarTodas = document.getElementById('btnBorrarTodas');

let stream = null;
let intervalo = null;
let frameAnterior = null;

const ANCHO = 320; // resolucion reducida para procesar mas rapido
const ALTO = 240;

canvasCaptura.width = ANCHO;
canvasCaptura.height = ALTO;
canvasDiferencia.width = ANCHO;
canvasDiferencia.height = ALTO;

const ctxCaptura = canvasCaptura.getContext('2d');
const ctxDiferencia = canvasDiferencia.getContext('2d');

inputSensibilidad.addEventListener('input', () => {
  valorSensibilidad.textContent = inputSensibilidad.value;
});

btnIniciar.addEventListener('click', iniciarDeteccion);
btnDetener.addEventListener('click', detenerDeteccion);
btnBorrarTodas.addEventListener('click', borrarTodasLasCapturas);

async function iniciarDeteccion() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    btnIniciar.disabled = true;
    btnDetener.disabled = false;
    cambiarEstado('vigilando', 'Vigilando... sin movimiento');

    // Cada 300ms comparamos el fotograma actual con el anterior
    intervalo = setInterval(analizarFrame, 300);
  } catch (error) {
    alert('No se pudo acceder a la camara: ' + error.message);
  }
}

function detenerDeteccion() {
  clearInterval(intervalo);
  intervalo = null;
  frameAnterior = null;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  btnIniciar.disabled = false;
  btnDetener.disabled = true;
  cambiarEstado('inactivo', 'Cámara apagada');
}

function analizarFrame() {
  ctxCaptura.drawImage(video, 0, 0, ANCHO, ALTO);
  const frameActual = ctxCaptura.getImageData(0, 0, ANCHO, ALTO);

  if (frameAnterior) {
    const { pixelesDiferentes, imagenDiferencia } = compararFrames(frameAnterior, frameActual);
    ctxDiferencia.putImageData(imagenDiferencia, 0, 0);

    const umbral = Number(inputSensibilidad.value);
    const porcentajeCambio = (pixelesDiferentes / (ANCHO * ALTO)) * 100;

    if (porcentajeCambio > umbral / 10) {
      cambiarEstado('movimiento', `¡Movimiento detectado! (${porcentajeCambio.toFixed(1)}% de cambio)`);
      guardarCaptura();
    } else {
      cambiarEstado('vigilando', 'Vigilando... sin movimiento');
    }
  }

  frameAnterior = frameActual;
}

// Compara dos ImageData pixel por pixel usando diferencia de brillo
function compararFrames(frameA, frameB) {
  const datosA = frameA.data;
  const datosB = frameB.data;
  const imagenDiferencia = ctxDiferencia.createImageData(ANCHO, ALTO);
  const datosDiferencia = imagenDiferencia.data;

  let pixelesDiferentes = 0;
  const UMBRAL_PIXEL = 40; // diferencia minima de brillo para contar el pixel

  for (let i = 0; i < datosA.length; i += 4) {
    const brilloA = (datosA[i] + datosA[i + 1] + datosA[i + 2]) / 3;
    const brilloB = (datosB[i] + datosB[i + 1] + datosB[i + 2]) / 3;
    const diferencia = Math.abs(brilloA - brilloB);

    if (diferencia > UMBRAL_PIXEL) {
      pixelesDiferentes++;
      // Pixel cambiado se pinta de rojo en el mapa de diferencia
      datosDiferencia[i] = 255;
      datosDiferencia[i + 1] = 0;
      datosDiferencia[i + 2] = 0;
      datosDiferencia[i + 3] = 255;
    } else {
      datosDiferencia[i + 3] = 0; // transparente
    }
  }

  return { pixelesDiferentes, imagenDiferencia };
}

function cambiarEstado(tipo, texto) {
  estadoDiv.textContent = texto;
  estadoDiv.className = 'estado estado-' + tipo;
}

// Envia una captura en PNG al servidor cuando hay movimiento
let ultimoEnvio = 0;
function guardarCaptura() {
  const ahora = Date.now();
  // Evita enviar demasiadas capturas seguidas (maximo 1 cada 2 segundos)
  if (ahora - ultimoEnvio < 2000) return;
  ultimoEnvio = ahora;

  const imagenBase64 = canvasCaptura.toDataURL('image/png');

  fetch('/api/captura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagen: imagenBase64 }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) cargarGaleria();
    })
    .catch((err) => console.error('Error al enviar captura:', err));
}

// Carga la lista de capturas guardadas y las muestra en la galeria
function cargarGaleria() {
  fetch('/api/capturas')
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok) return;
      galeria.innerHTML = '';

      if (data.capturas.length === 0) {
        galeria.innerHTML = '<p class="galeria-vacia">Todavía no hay capturas.</p>';
        return;
      }

      data.capturas.slice(0, 12).forEach((archivo) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-captura';

        const img = document.createElement('img');
        img.src = '/capturas/' + archivo;
        tarjeta.appendChild(img);

        const btnBorrar = document.createElement('button');
        btnBorrar.className = 'btn-borrar-captura';
        btnBorrar.textContent = '✕';
        btnBorrar.title = 'Eliminar esta captura';
        btnBorrar.addEventListener('click', () => borrarCaptura(archivo));
        tarjeta.appendChild(btnBorrar);

        galeria.appendChild(tarjeta);
      });
    });
}

// Elimina una captura individual por su nombre de archivo
function borrarCaptura(archivo) {
  fetch('/api/capturas/' + encodeURIComponent(archivo), {
    method: 'DELETE',
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) {
        cargarGaleria();
      } else {
        alert('No se pudo eliminar la captura: ' + (data.error || 'error desconocido'));
      }
    })
    .catch((err) => console.error('Error al eliminar captura:', err));
}

// Elimina todas las capturas guardadas (pide confirmacion antes)
function borrarTodasLasCapturas() {
  const confirmar = confirm('¿Seguro que quieres eliminar TODAS las capturas? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  fetch('/api/capturas', {
    method: 'DELETE',
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) {
        cargarGaleria();
      } else {
        alert('No se pudieron eliminar las capturas: ' + (data.error || 'error desconocido'));
      }
    })
    .catch((err) => console.error('Error al eliminar todas las capturas:', err));
}

// Cargar galeria al abrir la pagina
cargarGaleria();
