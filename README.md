# Stylo Audio Professional

Una estación de trabajo de audio digital (DAW) profesional desarrollada en HTML5, CSS3 y JavaScript vanilla.

## Características

- **Grabación de audio** desde micrófono
- **Importación** de archivos WAV y MP3
- **Visualización waveform** interactivo con zoom y pan
- **Espectrograma** tiempo-frecuencia en vivo
- **Ecualizador de 10 bandas** profesional
- **Compresor dinámico** con medidor de reducción de ganancia
- **Reverb y Delay** configurables
- **Edición** (trim, fade in/out, normalización)
- **Multitrack** (hasta 4 pistas sincronizadas)
- **Exportación** a WAV 16/24 bits
- **Medidores** profesionales (Peak, RMS, VU, LUFS)
- **Atajos de teclado** completos

## Stack Tecnológico

- HTML5, CSS3, JavaScript Vanilla
- Web Audio API
- Canvas 2D para rendering
- MediaRecorder API
- AudioWorklet (cuando se requiera)

## Estructura del Proyecto

```
/
├── README.md                 # Este archivo
├── SPECIFICATION.md          # Documento de especificación técnica
├── index.html               # Aplicación autocontenida
├── docs/
│   ├── FASES.md            # Progreso de desarrollo (8 fases)
│   ├── ARQUITECTURA.md      # Descripción de módulos internos
│   ├── API.md              # Documentación de módulos JS
│   └── TESTING.md          # Plan de verificación funcional
└── CHANGELOG.md             # Historial de versiones
```

## Ejecución

1. Abre `index.html` en un navegador moderno (Chrome, Firefox, Safari, Edge)
2. Permite acceso al micrófono cuando se pida
3. Comienza a grabar o importa un archivo

**Nota:** Para acceso al micrófono, se requiere HTTPS o `localhost`.

## Estado del Proyecto

**Versión:** 0.1.0 (Desarrollo)

**Fase actual:** 1 - Arquitectura y AudioEngine

Consulta `docs/FASES.md` para el progreso detallado.

## Licencia

MIT

## Autor

Desarrollado por djsergiostylo