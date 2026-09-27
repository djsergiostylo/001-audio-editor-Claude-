# STYLO AUDIO PROFESSIONAL — Especificación Técnica

## 1. Visión General

Stylo Audio Professional es una estación de trabajo de audio digital (DAW) web, autocontenida en un único archivo HTML, que permite grabar, editar, procesar y exportar audio directamente desde el navegador sin necesidad de backend ni servicios externos.

## 2. Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Audio:** Web Audio API, Canvas 2D, MediaRecorder API
- **Procesamiento:** AudioWorklet (cuando sea necesario), BiquadFilterNode, DynamicsCompressorNode
- **Sin dependencias externas** en el MVP

## 3. Funcionalidades Core

### A. Grabación
- Captura desde micrófono
- Selección de dispositivo
- Monitorización de entrada con indicador de señal
- Controles: grabar, pausar, reanudar, detener
- Gestión de permisos
- Conversión a AudioBuffer

### B. Importación
- WAV, MP3 y formatos compatibles
- Drag & Drop
- Selector de archivos
- Validación y manejo de errores

### C. Waveform
- Representación real de forma de onda
- Zoom horizontal
- Desplazamiento temporal (pan)
- Selección de regiones
- Cursor de reproducción

### D. Espectrograma
- Visualización tiempo-frecuencia
- FFT en tiempo real
- Escala logarítmica
- Rango dinámico ajustable

### E. Ecualizador 10-bandas
- Filtros BiquadFilterNode reales
- Ganancia individual por banda
- Curva visual de respuesta
- Presets
- Bypass independiente

### F. Compresor Dinámico
- Threshold, Ratio, Attack, Release
- Knee, Makeup Gain
- Medidor de reducción de ganancia (GR)
- Bypass

### G. Reverb y Delay
- Reverb por convolución o red de retardos
- Delay configurable
- Feedback y Mix Dry/Wet
- Bypass independiente

### H. Edición
- Trim, corte, eliminación de selección
- Fade In / Fade Out
- Normalización
- Deshacer/Rehacer

### I. Multitrack
- Hasta 4 pistas
- Controles: volumen, pan, mute, solo
- Reproducción sincronizada
- Timeline compartido

### J. Exportación
- WAV PCM 16/24 bits
- Frecuencia de muestreo configurable
- Exportación del audio procesado

## 4. Medición de Audio

Implementar:
- **Peak:** Valor máximo instantáneo
- **RMS:** Energía media
- **VU:** Calibración estándar
- **LUFS:** Cuando sea viable
- **Clipping detector:** Indicador de saturación

## 5. Interfaz Profesional

### Diseño
- Dark mode profesional
- Fondo grafito
- Paneles diferenciados
- Tipografía técnica
- Acentos cian/azul

### Distribución
- **Barra superior:** Logo, nombre proyecto, Abrir, Guardar, Exportar, Preferencias
- **Panel central:** Timeline, waveform, pistas, cursor, regiones
- **Inspector lateral:** EQ, compresor, reverb/delay, parámetros contextuales
- **Panel inferior:** Transporte, play/pause/stop, grabación, tiempo, medidores

## 6. Atajos de Teclado

| Atajo | Función |
|-------|---------|
| `Espacio` | Play/Pause |
| `R` | Grabar |
| `S` | Detener |
| `Ctrl/Cmd + Z` | Deshacer |
| `Ctrl/Cmd + Shift + Z` | Rehacer |
| `Ctrl/Cmd + O` | Abrir archivo |
| `Ctrl/Cmd + S` | Guardar proyecto |

## 7. Arquitectura Modular Interna

Aunque sea un único HTML, separar internamente en módulos:

- **AudioEngine:** Contexto, nodos, routing
- **AudioRecorder:** Captura de micrófono
- **AudioImporter:** Carga de archivos
- **TrackManager:** Gestión de pistas
- **Timeline:** Control temporal
- **WaveformRenderer:** Renderizado waveform
- **SpectrogramRenderer:** Renderizado espectrograma
- **Equalizer:** Ecualizador 10-bandas
- **DynamicsProcessor:** Compresor
- **EffectsRack:** Reverb, Delay
- **AudioMeter:** Medidores
- **ProjectManager:** Gestión de proyectos
- **ExportManager:** Exportación WAV
- **KeyboardManager:** Atajos
- **UIController:** Control de interfaz

## 8. Gestión de Memoria y Rendimiento

- Liberación correcta de AudioContext, AudioBuffer, MediaStream
- Evitar reconstrucciones innecesarias de buffers
- No bloquear el hilo principal con operaciones pesadas
- Limpiar event listeners y Object URLs

## 9. Seguridad y Privacidad

- Procesamiento 100% local
- Sin subida automática
- Permisos de micrófono solo cuando se necesitan
- No transmisión a servicios externos

## 10. Plan de Desarrollo (8 Fases)

| Fase | Descripción |
|------|-------------|
| 1 | Arquitectura y AudioEngine |
| 2 | Importación, reproducción, grabación |
| 3 | Waveform y timeline |
| 4 | EQ, compresor, efectos |
| 5 | Edición y multitrack |
| 6 | Medidores y exportación |
| 7 | Diseño final |
| 8 | Pruebas e integración |

## 11. Criterios de Aceptación

✅ No simulaciones visuales sin audio asociado
✅ Controles modifican audio realmente
✅ Medidores muestran valores reales
✅ Waveform corresponde al archivo
✅ Espectrograma es dinámico
✅ Efectos son audibles
✅ Pistas sincronizadas
✅ Exportación válida
✅ Sin errores críticos en consola
