# Editor de Audio

Editor de audio que funciona en el navegador, sin dependencias ni paso de compilación
(JavaScript puro + Web Audio API).

## Uso

```bash
npm start          # sirve la carpeta en http://localhost:8080
```

Abre `http://localhost:8080` y carga un archivo (botón **Abrir** o arrastrándolo),
o graba desde el micrófono con **Grabar**. Hace falta servirlo por HTTP porque usa
módulos ES; abrir `index.html` directamente desde disco no funciona.

## Funciones

- **Archivo:** abrir cualquier formato que decodifique el navegador (WAV, MP3, OGG, FLAC…),
  grabar desde el micrófono (se inserta en el cursor) y exportar a WAV de 16 bits.
- **Reproducción:** reproducir/pausa, detener, reproducción en bucle de la selección.
- **Edición:** cortar, copiar, pegar (reemplaza la selección si la hay), eliminar,
  recortar (conservar solo la selección) y silenciar.
- **Efectos:** fade in, fade out, normalizar, invertir y ganancia en dB. Se aplican a la
  selección o, si no hay, a todo el audio.
- **Historial:** deshacer / rehacer (50 pasos).
- **Vista:** forma de onda por canal, regla de tiempo, zoom (botones o Ctrl + rueda),
  ajustar a la ventana y zoom a la selección.

## Atajos de teclado

| Tecla | Acción |
| --- | --- |
| Espacio | Reproducir / pausa |
| Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z) | Deshacer / rehacer |
| Ctrl+X / Ctrl+C / Ctrl+V | Cortar / copiar / pegar |
| Supr / Retroceso | Eliminar selección |
| Ctrl+A | Seleccionar todo |
| Esc | Quitar selección |
| T | Recortar a la selección |
| R | Iniciar / detener grabación |
| + / − / 0 | Acercar / alejar / ajustar |
| Inicio / Fin | Ir al principio / final |
| Ctrl+S / Ctrl+O | Exportar WAV / abrir archivo |
| Shift + clic | Extender la selección |

## Estructura

- `index.html`, `css/styles.css` — interfaz.
- `js/app.js` — estado, dibujo de la forma de onda, reproducción, grabación y eventos.
- `js/audio-ops.js` — operaciones de audio puras (sin DOM), incluido el codificador WAV.
- `js/history.js` — pila de deshacer/rehacer.
- `tests/` — pruebas de `audio-ops` e historial.

## Pruebas

```bash
npm test
```
