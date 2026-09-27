# Arquitectura de Stylo Audio Professional

## Estructura Modular

Aunque el código esté en un único `index.html`, está dividido en módulos lógicos con responsabilidades claras.

```
StyloAudio
│
├── AudioEngine
│   ├── AudioContext
│   ├── Master Bus
│   ├── Route Management
│   └── Node Pool
│
├── Audio I/O
│   ├── AudioRecorder
│   ├── AudioImporter
│   └── MediaStreamHandler
│
├── Visualization
│   ├── WaveformRenderer
│   ├── SpectrogramRenderer
│   └── MetersRenderer
│
├── Processing
│   ├── Equalizer (10-bandas)
│   ├── DynamicsProcessor
│   ├── EffectsRack
│   │   ├── Reverb
│   │   └── Delay
│   └── AudioMeter
│
├── Timeline & Editing
│   ├── Timeline
│   ├── TrackManager
│   ├── EditTools
│   └── UndoRedo
│
├── Data Management
│   ├── ProjectManager
│   ├── AudioBuffer Pool
│   └── ExportManager
│
├── User Interface
│   ├── UIController
│   ├── KeyboardManager
│   ├── ParameterControls
│   └── Transport Controls
│
└── Utilities
    ├── Logger
    ├── ErrorHandler
    └── MemoryManager
```

## Módulos Detallados

### 1. AudioEngine
**Responsabilidad:** Gestión del contexto de audio y enrutamiento

```javascript
class AudioEngine {
  constructor() {
    this.audioContext // AudioContext
    this.masterGain   // GainNode
    this.analyser     // AnalyserNode
  }
  
  methods:
  - init()
  - createNode()
  - connect()
  - disconnect()
  - setMasterVolume()
  - getAnalyserData()
}
```

### 2. AudioRecorder
**Responsabilidad:** Captura de micrófono

```javascript
class AudioRecorder {
  constructor(audioEngine)
  
  methods:
  - start()
  - pause()
  - resume()
  - stop()
  - getAudioBuffer()
}
```

### 3. AudioImporter
**Responsabilidad:** Carga de archivos

```javascript
class AudioImporter {
  constructor(audioEngine)
  
  methods:
  - loadFile(file)
  - validateFormat()
  - decodeAudio()
  - getAudioBuffer()
}
```

### 4. WaveformRenderer
**Responsabilidad:** Renderizado de forma de onda

```javascript
class WaveformRenderer {
  constructor(canvasElement, audioBuffer)
  
  methods:
  - render()
  - setZoom(level)
  - pan(offset)
  - setPlayheadPosition(time)
  - getRegionSelection()
}
```

### 5. Equalizer
**Responsabilidad:** Procesamiento de EQ

```javascript
class Equalizer {
  constructor(audioEngine)
  
  properties:
  - bands[10]: { freq, gain, Q }
  
  methods:
  - setGain(bandIndex, gain)
  - setFrequency(bandIndex, freq)
  - setQ(bandIndex, q)
  - bypass(enable)
  - loadPreset(name)
}
```

### 6. DynamicsProcessor
**Responsabilidad:** Compresión dinámica

```javascript
class DynamicsProcessor {
  constructor(audioEngine)
  
  properties:
  - threshold
  - ratio
  - attack
  - release
  - knee
  - makeupGain
  - grMeter: { current, peak }
  
  methods:
  - setThreshold(value)
  - setRatio(value)
  - setAttack(value)
  - setRelease(value)
  - bypass(enable)
  - getGainReduction()
}
```

### 7. EffectsRack
**Responsabilidad:** Reverb y Delay

```javascript
class EffectsRack {
  constructor(audioEngine)
  
  components:
  - reverb: ConvolverNode
  - delay: DelayNode + Feedback
  
  methods:
  - setReverbWet(value)
  - setDelayTime(value)
  - setDelayFeedback(value)
  - bypassReverb(enable)
  - bypassDelay(enable)
}
```

### 8. TrackManager
**Responsabilidad:** Gestión de pistas múltiples

```javascript
class TrackManager {
  constructor(audioEngine, maxTracks=4)
  
  properties:
  - tracks[]: { buffer, gain, pan, mute, solo }
  
  methods:
  - addTrack()
  - removeTrack(index)
  - setTrackVolume(index, value)
  - setTrackPan(index, value)
  - muteTrack(index, bool)
  - soloTrack(index, bool)
  - playAll()
  - stopAll()
}
```

### 9. Timeline
**Responsabilidad:** Control temporal

```javascript
class Timeline {
  constructor(duration)
  
  properties:
  - currentTime
  - duration
  - isPlaying
  - markers[]
  
  methods:
  - play()
  - pause()
  - stop()
  - seek(time)
  - addMarker(time, label)
}
```

### 10. AudioMeter
**Responsabilidad:** Medición de audio

```javascript
class AudioMeter {
  constructor(analyserNode)
  
  properties:
  - peak: { current, hold }
  - rms: { current, average }
  - vu: { current, scale }
  - lufs: { current }
  - clipping: boolean
  
  methods:
  - update()
  - getPeak()
  - getRMS()
  - getVU()
  - getLUFS()
  - isClipping()
}
```

### 11. ExportManager
**Responsabilidad:** Exportación WAV

```javascript
class ExportManager {
  constructor(audioEngine)
  
  methods:
  - exportWAV(audioBuffer, bitDepth=16, sampleRate=44100)
  - exportMP3() // Futuro
  - downloadFile(blob, filename)
}
```

### 12. UIController
**Responsabilidad:** Control de interfaz

```javascript
class UIController {
  constructor()
  
  methods:
  - updatePlayheadPosition(time)
  - updateMeters(values)
  - updateWaveform()
  - showNotification(message)
  - showError(error)
}
```

### 13. KeyboardManager
**Responsabilidad:** Atajos de teclado

```javascript
class KeyboardManager {
  constructor(callbacks)
  
  bindings:
  - Space: play/pause
  - R: record
  - S: stop
  - Ctrl+Z: undo
  - Ctrl+Shift+Z: redo
  - Ctrl+O: open
  - Ctrl+S: save
  
  methods:
  - register(key, callback)
  - handleKeyDown(event)
}
```

## Flujo de Datos

```
User Input → UIController → Module Logic → AudioEngine → Web Audio API
                                                          ↓
                                        AudioContext → Speaker
```

### Ejemplo: Cambiar ganancia de EQ

1. Usuario mueve slider EQ banda 1
2. UIController captura el cambio
3. Llama a `equalizer.setGain(0, newGain)`
4. Equalizer actualiza BiquadFilterNode
5. Audio procesado sale del canal

## Ciclo de Vida

```
App Load
  ↓
Initialize AudioContext
  ↓
Load UI Components
  ↓
Register Event Listeners
  ↓
Ready for User Input
  ↓
User: Import/Record Audio
  ↓
Audio Processing Loop (Audio Thread)
  ↓
Visualization Updates (UI Thread)
  ↓
User: Export
  ↓
Generate WAV File
  ↓
Download
```

## Consideraciones de Rendimiento

1. **Separación de threads:**
   - Audio processing → Audio Context (real-time)
   - Visualization → requestAnimationFrame (60fps)
   - UI updates → Microtasks

2. **Gestión de memoria:**
   - Reutilizar AudioBuffers cuando sea posible
   - Liberar recursos no usados
   - Usar Object Pooling para nodos

3. **Optimizaciones:**
   - Waveform downsampling para zoom
   - Espectrograma FFT optimizado
   - Canvas rendering solo si cambió

## Seguridad

- No ejecutar audio no verificado
- Validar formatos de archivo
- Limitar tamaño máximo (500MB)
- Procesar solo localmente
