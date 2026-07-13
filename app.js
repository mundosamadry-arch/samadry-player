/* ==========================================================================
   SAMADRY PLAYER - MAIN JS APPLICATION
   ========================================================================== */

// --- DATA: SONG PLAYLISTS ---
const AUDIO_LIBRARY_BASE_URL = "https://animacionesinfantilesmusicales.com/player/samadry-audio/";
const HOSTED_PLAYLIST_MANIFEST_URL = `${AUDIO_LIBRARY_BASE_URL}playlists.json`;

const PLAYLISTS = {
    juegos: [
        {
            title: "I'm Still Standing",
            artist: "Mundo Samadry",
            duration: "--:--",
            url: "https://animacionesinfantilesmusicales.com/player/samadry-audio/juegos-generica/01-I_m_Still_Standing.mp3",
            tag: "Juegos Generica"
        },
        {
            title: "Algo Asi Quiero Yo",
            artist: "Mundo Samadry",
            duration: "--:--",
            url: "https://animacionesinfantilesmusicales.com/player/samadry-audio/juegos-generica/02-Algo_Asi_Quiero_Yo.mp3",
            tag: "Juegos Generica"
        },
        {
            title: "Superheroe",
            artist: "Mundo Samadry",
            duration: "--:--",
            url: "https://animacionesinfantilesmusicales.com/player/samadry-audio/juegos-generica/03-Superheroe.mp3",
            tag: "Juegos Generica"
        },
        {
            title: "Hijo de Hombre",
            artist: "Mundo Samadry",
            duration: "--:--",
            url: "https://animacionesinfantilesmusicales.com/player/samadry-audio/juegos-generica/04-Hijo_de_Hombre.mp3",
            tag: "Juegos Generica"
        }
    ],
    piratas: [],
    exploradores: [],
    bluey: [],
    kpop: [],
    spiderman: [],
    locales: [], // Se llena con archivos subidos por el usuario
    tarta: [
        {
            title: "Canción de Tarta",
            artist: "Mundo Samadry",
            duration: "--:--",
            url: "https://animacionesinfantilesmusicales.com/player/samadry-audio/especiales/tarta.mp3",
            tag: "Especial"
        }
    ],
    mundo_samadry: [
        {
            title: "Mundo Samadry",
            artist: "Mundo Samadry",
            duration: "--:--",
            url: "https://animacionesinfantilesmusicales.com/player/samadry-audio/especiales/mundo-samadry.mp3",
            tag: "Especial"
        }
    ]
};

// --- WEB AUDIO API: SYNTHESIZER FOR SOUNDBOARD EFFECTS ---
let audioCtx = null;
let analyserNode = null;
let customSfxBlobs = {}; // Guarda sonidos MP3 cargados por usuario en la soundboard (IndexedDB / en memoria)
let hostedSfxUrls  = {}; // Sonidos subidos al hosting (sfx-manifest.json) → disponibles para todos

// --- SPOTIFY PREMIUM SDK INTEGRATION ---
let spotifyPlayer = null;
let spotifyDeviceId = null;
let spotifyConnected = false;
let spotifyToken = null;
let spotifySdkReady = false;
let spotifyPlayerConnecting = false;

// --- VOICE ASSISTANT (MICROPHONE) ---
let recognition = null;
let voiceActive = false;
let voiceDuckActive = false;
let voiceDuckTimer = null;
let recognitionRestartTimer = null;

const VOICE_COMMANDS_STORAGE_KEY = "samadry_voice_commands";
const VOICE_COMMAND_DEFINITIONS = [
    { id: "next", label: "Siguiente canción", icon: "⏭️", mode: "direct", phrases: ["siguiente canción", "siguiente", "salta"] },
    { id: "previous", label: "Canción anterior", icon: "⏮️", mode: "direct", phrases: ["anterior", "atrás", "volver"] },
    { id: "pause", label: "Pausar música", icon: "⏸️", mode: "direct", phrases: ["stop", "pausa", "para la música"] },
    { id: "resume", label: "Continuar música", icon: "▶️", mode: "direct", phrases: ["seguimos", "continúa"] },
    { id: "duck", label: "Bajar o recuperar volumen", icon: "🔉", mode: "direct", phrases: ["baja la música"] },
    { id: "playlist-juegos", label: "Empezar Juegos", icon: "🏃", mode: "direct", phrases: ["preparados listos", "empieza juegos"] },
    { id: "playlist-piratas", label: "Empezar Piratas", icon: "🏴‍☠️", mode: "direct", phrases: ["empieza piratas"] },
    { id: "playlist-exploradores", label: "Empezar Exploradores", icon: "🧭", mode: "direct", phrases: ["empieza exploradores"] },
    { id: "playlist-bluey", label: "Empezar Bluey", icon: "💙", mode: "direct", phrases: ["empieza Bluey"] },
    { id: "playlist-kpop", label: "Empezar Kpop", icon: "🎤", mode: "direct", phrases: ["empieza Kpop"] },
    { id: "playlist-spiderman", label: "Empezar Spiderman", icon: "🕷️", mode: "direct", phrases: ["empieza Spiderman"] },
    { id: "tarta", label: "Momento Tarta", icon: "🎂", mode: "direct", phrases: ["momento tarta"] },
    { id: "mundo", label: "Mundo Samadry", icon: "🌟", mode: "direct", phrases: ["momento mundo"] },
    { id: "sfx-applause", label: "Sonido de aplausos", icon: "👏", mode: "direct", phrases: ["aplausos"] },
    { id: "sfx-drumroll", label: "Sonido de redoble", icon: "🥁", mode: "direct", phrases: ["redoble"] },
    { id: "sfx-magic", label: "Sonido de magia", icon: "🪄", mode: "direct", phrases: ["magia"] },
    { id: "sfx-horn", label: "Sonido de bocina", icon: "🎺", mode: "direct", phrases: ["bocina"] },
    { id: "sfx-laughs", label: "Sonido de risas", icon: "😆", mode: "direct", phrases: ["risas"] },
    { id: "sfx-suspense", label: "Sonido de suspense", icon: "🕵️", mode: "direct", phrases: ["suspenso"] },
    { id: "sfx-ding", label: "Sonido de acierto", icon: "🔔", mode: "direct", phrases: ["correcto"] },
    { id: "sfx-error", label: "Sonido de fallo", icon: "💥", mode: "direct", phrases: ["fallo"] },
    { id: "sfx-whistle", label: "Sonido de silbato", icon: "📣", mode: "direct", phrases: ["silbato"] }
];

function normalizeVoiceText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9ñ\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getCustomVoiceCommands() {
    try {
        const saved = JSON.parse(localStorage.getItem(VOICE_COMMANDS_STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter((item) => item && item.phrase && item.actionId) : [];
    } catch (e) {
        return [];
    }
}

function saveCustomVoiceCommands(commands) {
    localStorage.setItem(VOICE_COMMANDS_STORAGE_KEY, JSON.stringify(commands));
}

const STAGE_PLAYLISTS = [
    ["juegos", "🏃", "Juegos"],
    ["piratas", "🏴‍☠️", "Piratas"],
    ["exploradores", "🧭", "Exploradores"],
    ["bluey", "💙", "Bluey"],
    ["kpop", "🎤", "Kpop"],
    ["spiderman", "🕷️", "Spiderman"]
];

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 128;
        analyserNode.connect(audioCtx.destination);
        
        // Iniciar bucle de dibujo de visualización
        startVisualizer();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function connectNativePlayerToVisualizerIfSafe() {
    // Mantener el reproductor principal por canal nativo evita bloqueos CORS
    // con pistas externas de demostracion y archivos cargados por el usuario.
    return;
}

// 1. Aplausos (👏) - Mezcla de ráfagas rápidas de ruido blanco para simular palmas
function playApplauseSynth(duration = 2.5) {
    initAudioContext();
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generar ruido blanco
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    // Crear nodo de fuente
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    // Filtro pasa banda para centrar el sonido de los aplausos (entre 800Hz y 2500Hz)
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.5, audioCtx.currentTime);
    
    // Envolvente de volumen modulada rápidamente para simular palmadas individuales
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.2); // entrada
    
    // Simular palmadas superpuestas con una envolvente oscilatoria rápida
    const now = audioCtx.currentTime;
    for (let t = 0.1; t < duration; t += 0.08 + Math.random() * 0.06) {
        gainNode.gain.setValueAtTime(0.08 + Math.random() * 0.22, now + t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + t + 0.05);
    }
    
    gainNode.gain.setValueAtTime(0.15, now + duration - 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // cola de desvanecimiento
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noise.start();
}

// 2. Redoble de Tambores (🥁) - Ruido modulado que termina en golpe de bombo
function playDrumrollSynth() {
    initAudioContext();
    const duration = 2.0;
    const now = audioCtx.currentTime;
    
    // Ruido blanco para la caja
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, now);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    
    // Modulación del volumen del redoble (golpes rápidos del tambor)
    for (let t = 0; t < duration - 0.2; t += 0.05) {
        noiseGain.gain.setValueAtTime(0.05 + (t / duration) * 0.15, now + t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + t + 0.04);
    }
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start();
    
    // GOLPE FINAL (Bombo)
    const kickOsc = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    
    kickOsc.type = "sine";
    kickOsc.frequency.setValueAtTime(150, now + duration - 0.2);
    kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + duration + 0.2); // Caída rápida de tono
    
    kickGain.gain.setValueAtTime(0, now);
    kickGain.gain.setValueAtTime(0.8, now + duration - 0.2);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.3);
    
    kickOsc.connect(kickGain);
    kickGain.connect(audioCtx.destination);
    
    kickOsc.start(now + duration - 0.2);
    kickOsc.stop(now + duration + 0.4);
}

// 3. Sonido Mágico (🪄) - Cascada de arpegios agudos ascendentes con reverb sintética
function playMagicSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51, 1395.91, 1567.98, 1760.00]; // Escala ascendente do-re-mi...
    
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.setValueAtTime(0.12, now + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.6);
    });
}

// 4. Bocina Cómica (🎺) - Sonido "wah-wah" caricaturesco de doble oscilador
function playHornSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    
    // Frecuencia desafinada para efecto grueso
    osc1.frequency.setValueAtTime(220, now);
    osc2.frequency.setValueAtTime(223, now);
    
    // Modulación wah-wah (filtro barriendo frecuencia)
    const filter = audioCtx.createBiquadFilter();
    filter.type = "peaking";
    filter.Q.setValueAtTime(10, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
    filter.frequency.linearRampToValueAtTime(150, now + 0.45);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gainNode.gain.setValueAtTime(0.4, now + 0.35);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
}

// 5. Risas Infantiles (😆) - Arpegio rápido tipo campana tintineante que sube y baja rápido
function playLaughsSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    // Simula risas caricaturescas mediante ráfagas rápidas de ondas triangulares
    const chuckles = [0.0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72];
    
    chuckles.forEach((timeOffset) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "sine";
        // Barrido rápido hacia arriba en frecuencia
        osc.frequency.setValueAtTime(600, now + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(950, now + timeOffset + 0.08);
        
        gainNode.gain.setValueAtTime(0, now + timeOffset);
        gainNode.gain.linearRampToValueAtTime(0.18, now + timeOffset + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.09);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.1);
    });
}

// 6. Suspenso (🕵️) - Acorde menor disonante con trémolo y swell de volumen
function playSuspenseSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const freqs = [146.83, 174.61, 220.00, 261.63]; // Acorde de Re menor 7 (Dm7)
    const duration = 3.0;
    
    freqs.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        
        // Tremolo LFO
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = 8; // 8Hz vibrato
        lfoGain.gain.value = 10;
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        // Filtro pasa bajos para quitar la aspereza de la sierra
        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.setValueAtTime(400, now);
        lowpass.frequency.linearRampToValueAtTime(150, now + duration);
        
        // Swell de volumen (inicia bajo, sube a la mitad del tiempo, baja rápido)
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + duration * 0.7);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        lfo.start(now);
        osc.start(now);
        
        lfo.stop(now + duration);
        osc.stop(now + duration);
    });
}

// 7. Ding! (🔔) - Tono metálico clásico de campana
function playDingSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const frequencies = [880, 1200, 1600]; // Tonos de campana
    
    frequencies.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        // Volumen decreciente lento
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(idx === 0 ? 0.25 : 0.1, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 2.0);
    });
}

// 8. Fallo/Error (💥) - Descenso rápido de tono grave sintetizado
function playErrorSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.6); // Caída estrepitosa
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(200, now + 0.6);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.7);
}

// 9. Silbato (🗣️) - Tono muy agudo y vibrado para silbato deportivo
function playWhistleSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const duration = 0.8;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(2400, now);
    
    // LFO para simular la bolita del silbato vibrando a alta velocidad (vibrato de volumen/frec)
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 45; // 45 Hz vibrato súper rápido
    lfoGain.gain.value = 80;
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.setValueAtTime(0.2, now + duration - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    lfo.start(now);
    osc.start(now);
    
    lfo.stop(now + duration);
    osc.stop(now + duration);
}

// ============================================================
// GENERIC NEW SOUNDS (positions 6-9)
// ============================================================

// 6. Fanfarria (🏆) - Trompa triunfal ascendente
function playFanfarriaSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const notes    = [392, 392, 392, 523.25, 659.25, 523.25, 783.99];
    const durations= [0.12,0.12,0.12,0.15,   0.15,   0.15,   0.45  ];
    let t = 0;
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.25, now + t + 0.02);
        gain.gain.setValueAtTime(0.25, now + t + durations[idx] - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + durations[idx]);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + t); osc.stop(now + t + durations[idx] + 0.02);
        t += durations[idx];
    });
}

// 7. Power-Up (⭐) - Arpegio ascendente de videojuego 8-bit
function playPowerUpSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const notes = [262, 330, 392, 523, 659, 784, 1047, 1319];
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + idx * 0.065);
        osc.frequency.linearRampToValueAtTime(freq * 1.05, now + idx * 0.065 + 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.12);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.065); osc.stop(now + idx * 0.065 + 0.14);
    });
}

// 8. Explosión (💥) - Boom grave + ráfaga de ruido
function playExplosionSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const duration = 1.2;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass"; noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(80, now + duration);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now); noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start(now);
    const kick = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kick.type = "sine"; kick.frequency.setValueAtTime(120, now);
    kick.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    kickGain.gain.setValueAtTime(0.9, now); kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    kick.connect(kickGain); kickGain.connect(audioCtx.destination);
    kick.start(now); kick.stop(now + 0.7);
}

// 9. Round (🔔) - Campana de combate
function playRoundSynth() {
    initAudioContext();
    const now = audioCtx.currentTime;
    [660, 1320, 1980].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5 - idx * 0.3);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 2.6);
    });
}

// ============================================================
// THEMATIC SOUNDS — PIRATAS 🏴‍☠️
// ============================================================
function playCanonSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur = 1.0;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < buf.length; i++) d[i] = Math.random()*2-1;
    const noise = audioCtx.createBufferSource(); noise.buffer = buf;
    const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=600;
    const g = audioCtx.createGain(); g.gain.setValueAtTime(0.8,now); g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
    const kick = audioCtx.createOscillator(); const kg = audioCtx.createGain();
    kick.type="sine"; kick.frequency.setValueAtTime(80,now); kick.frequency.exponentialRampToValueAtTime(10,now+0.4);
    kg.gain.setValueAtTime(1.0,now); kg.gain.exponentialRampToValueAtTime(0.001,now+0.5);
    kick.connect(kg); kg.connect(audioCtx.destination); kick.start(now); kick.stop(now+0.6);
}
function playParrotSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach((t) => {
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.type="sawtooth"; osc.frequency.setValueAtTime(1200+Math.random()*400, now+t);
        osc.frequency.exponentialRampToValueAtTime(800, now+t+0.16);
        g.gain.setValueAtTime(0.22, now+t); g.gain.exponentialRampToValueAtTime(0.001, now+t+0.19);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t); osc.stop(now+t+0.22);
    });
}
function playSwordSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.setValueAtTime(3000,now); osc.frequency.exponentialRampToValueAtTime(600,now+0.3);
    g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.35);
    osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.4);
}
function playAbordajeSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [196,220,247,294].forEach((freq,idx) => {
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.type="sawtooth"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0,now+idx*0.1); g.gain.linearRampToValueAtTime(0.3,now+idx*0.1+0.05);
        g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.1+0.16);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.1); osc.stop(now+idx*0.1+0.2);
    });
}
function playWavesSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=3.0;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate*dur, audioCtx.sampleRate);
    const d = buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise = audioCtx.createBufferSource(); noise.buffer=buf;
    const f = audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=600; f.Q.value=0.5;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.04,now); g.gain.linearRampToValueAtTime(0.12,now+0.8);
    g.gain.linearRampToValueAtTime(0.03,now+1.6); g.gain.linearRampToValueAtTime(0.12,now+2.4);
    g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playTreasureSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [1047,1319,1568,2093,1568,2093,1319].forEach((freq,idx) => {
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.type="triangle"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0.15,now+idx*0.07); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.07+0.22);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.07); osc.stop(now+idx*0.07+0.26);
    });
}
function playAlarmPirataSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    for (let i=0;i<6;i++) {
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.type="square"; osc.frequency.value = i%2===0 ? 880 : 660;
        g.gain.setValueAtTime(0.22,now+i*0.12); g.gain.exponentialRampToValueAtTime(0.001,now+i*0.12+0.1);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+i*0.12); osc.stop(now+i*0.12+0.13);
    }
}
function playVictoriaPiratasSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const notes=[523,659,784,1047]; const times=[0,0.15,0.3,0.5]; const durs=[0.12,0.12,0.12,0.7];
    notes.forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="square"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0.3,now+times[idx]); g.gain.exponentialRampToValueAtTime(0.001,now+times[idx]+durs[idx]);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+times[idx]); osc.stop(now+times[idx]+durs[idx]+0.05);
    });
}
function playSharkSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    let interval=0.5, t=0;
    for (let beat=0;beat<9;beat++) {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; osc.frequency.value = beat%2===0 ? 98 : 110;
        g.gain.setValueAtTime(0,now+t); g.gain.linearRampToValueAtTime(0.3,now+t+0.05);
        g.gain.exponentialRampToValueAtTime(0.001,now+t+interval-0.03);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t); osc.stop(now+t+interval);
        t += interval; interval = Math.max(0.09, interval*0.86);
    }
}

// ============================================================
// THEMATIC SOUNDS — EXPLORADORES 🧭
// ============================================================
function playJungleSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [0, 0.15, 0.32, 0.5, 0.65, 0.82].forEach((t) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; const base=2000+Math.random()*1500;
        osc.frequency.setValueAtTime(base,now+t); osc.frequency.exponentialRampToValueAtTime(base*1.35,now+t+0.07);
        g.gain.setValueAtTime(0.12,now+t); g.gain.exponentialRampToValueAtTime(0.001,now+t+0.09);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t); osc.stop(now+t+0.11);
    });
}
function playAdventureHornSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [261,329,392,523].forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sawtooth"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0,now+idx*0.2); g.gain.linearRampToValueAtTime(0.25,now+idx*0.2+0.06);
        g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.2+0.22);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.2); osc.stop(now+idx*0.2+0.26);
    });
}
function playDiscoverySynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [523,659,784,1047,1319].forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="triangle";
        osc.frequency.setValueAtTime(freq*0.8,now+idx*0.09); osc.frequency.exponentialRampToValueAtTime(freq*1.2,now+idx*0.09+0.05);
        g.gain.setValueAtTime(0.15,now+idx*0.09); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.09+0.3);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.09); osc.stop(now+idx*0.09+0.35);
    });
}
function playCompassSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    for (let i=0;i<8;i++) {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="square"; osc.frequency.value=i%2===0?1200:900;
        g.gain.setValueAtTime(0.14,now+i*0.1); g.gain.exponentialRampToValueAtTime(0.001,now+i*0.1+0.04);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+i*0.1); osc.stop(now+i*0.1+0.05);
    }
}
function playBeastRoarSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=1.5;
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.setValueAtTime(300,now); f.Q.value=3;
    f.frequency.linearRampToValueAtTime(80,now+dur*0.7);
    const g=audioCtx.createGain();
    g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.55,now+0.15);
    g.gain.linearRampToValueAtTime(0.4,now+dur*0.6); g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playCaveDripSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [0, 0.8, 1.6].forEach((t) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; osc.frequency.setValueAtTime(1200,now+t); osc.frequency.exponentialRampToValueAtTime(400,now+t+0.25);
        g.gain.setValueAtTime(0.2,now+t); g.gain.exponentialRampToValueAtTime(0.001,now+t+0.32);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t); osc.stop(now+t+0.36);
    });
}
function playVictoriaExplorSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const n=[392,523,659,784,784]; const t=[0,0.12,0.24,0.36,0.5]; const dur=[0.1,0.1,0.1,0.1,0.55];
    n.forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sawtooth"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0.28,now+t[idx]); g.gain.exponentialRampToValueAtTime(0.001,now+t[idx]+dur[idx]);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t[idx]); osc.stop(now+t[idx]+dur[idx]+0.05);
    });
}
function playAlertExplorSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    for (let i=0;i<4;i++) {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="square"; osc.frequency.value=1047;
        g.gain.setValueAtTime(0.22,now+i*0.18); g.gain.exponentialRampToValueAtTime(0.001,now+i*0.18+0.15);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+i*0.18); osc.stop(now+i*0.18+0.17);
    }
}
function playMarchSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [1,0,1,0,1,1,0,1].forEach((hit,idx) => {
        if (!hit) return;
        const sz=Math.floor(audioCtx.sampleRate*0.08);
        const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
        const d=buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
        const noise=audioCtx.createBufferSource(); noise.buffer=buf;
        const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=800;
        const g=audioCtx.createGain(); g.gain.setValueAtTime(0.3,now+idx*0.12); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.12+0.07);
        noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now+idx*0.12);
    });
}

// ============================================================
// THEMATIC SOUNDS — BLUEY 💙
// ============================================================
function playWoofSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const sz=Math.floor(audioCtx.sampleRate*0.3);
    const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.setValueAtTime(500,now); f.Q.value=4;
    f.frequency.exponentialRampToValueAtTime(200,now+0.25);
    const g=audioCtx.createGain(); g.gain.setValueAtTime(0.55,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.32);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playHappyBlueSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [523,659,784,659,784,1047].forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="triangle"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0.15,now+idx*0.1); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.1+0.22);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.1); osc.stop(now+idx*0.1+0.25);
    });
}
function playSurpriseBlueSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(1800,now+0.25);
    g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.35);
    osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.4);
}
function playDanceBlueSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [0,0.15,0.3,0.6,0.75,0.9].forEach((t,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; osc.frequency.value=idx%2===0?200:280;
        g.gain.setValueAtTime(0.4,now+t); g.gain.exponentialRampToValueAtTime(0.001,now+t+0.12);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t); osc.stop(now+t+0.14);
    });
}
function playCricketSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    for (let i=0;i<12;i++) {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; osc.frequency.value=4000+i%3*200;
        g.gain.setValueAtTime(0.08,now+i*0.07); g.gain.exponentialRampToValueAtTime(0.001,now+i*0.07+0.05);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+i*0.07); osc.stop(now+i*0.07+0.06);
    }
}
function playFluteBlueSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [659,784,880,784,659,784].forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0,now+idx*0.15); g.gain.linearRampToValueAtTime(0.12,now+idx*0.15+0.04);
        g.gain.setValueAtTime(0.12,now+idx*0.15+0.11); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.15+0.15);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.15); osc.stop(now+idx*0.15+0.18);
    });
}
function playGameBlueSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [523,784,523,659,523,880].forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="square"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0.12,now+idx*0.08); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.08+0.07);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.08); osc.stop(now+idx*0.08+0.09);
    });
}
function playFriendSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [523,659,784].forEach((freq) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="triangle"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.1,now+0.05);
        g.gain.setValueAtTime(0.1,now+0.6); g.gain.exponentialRampToValueAtTime(0.001,now+1.2);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+1.3);
    });
}
function playFamilySynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [392,523,659,523,392].forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="triangle"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0,now+idx*0.18); g.gain.linearRampToValueAtTime(0.13,now+idx*0.18+0.05);
        g.gain.setValueAtTime(0.13,now+idx*0.18+0.14); g.gain.exponentialRampToValueAtTime(0.001,now+idx*0.18+0.2);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+idx*0.18); osc.stop(now+idx*0.18+0.25);
    });
}

// ============================================================
// THEMATIC SOUNDS — KPOP 🎤
// ============================================================
function playBeatDropSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const kg=audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(200,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.35);
    kg.gain.setValueAtTime(1.0,now); kg.gain.exponentialRampToValueAtTime(0.001,now+0.4);
    osc.connect(kg); kg.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.45);
    const sz=Math.floor(audioCtx.sampleRate*0.1);
    const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const ng=audioCtx.createGain(); ng.gain.setValueAtTime(0.4,now+0.35); ng.gain.exponentialRampToValueAtTime(0.001,now+0.45);
    noise.connect(ng); ng.connect(audioCtx.destination); noise.start(now+0.35);
}
function playKCheerSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=1.5;
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=2000; f.Q.value=0.5;
    const g=audioCtx.createGain();
    g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.22,now+0.3);
    g.gain.setValueAtTime(0.22,now+dur-0.3); g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playKCymbalSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=1.2;
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const f=audioCtx.createBiquadFilter(); f.type="highpass"; f.frequency.value=4000;
    const g=audioCtx.createGain(); g.gain.setValueAtTime(0.5,now); g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playKSynthLeadSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const f=audioCtx.createBiquadFilter(); const g=audioCtx.createGain();
    osc.type="sawtooth";
    osc.frequency.setValueAtTime(440,now); osc.frequency.setValueAtTime(880,now+0.2); osc.frequency.setValueAtTime(660,now+0.35);
    f.type="lowpass"; f.frequency.setValueAtTime(3000,now); f.frequency.exponentialRampToValueAtTime(800,now+0.5);
    g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.6);
    osc.connect(f); f.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.65);
}
function playKDropSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const f=audioCtx.createBiquadFilter(); const g=audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.value=80;
    f.type="lowpass";
    f.frequency.setValueAtTime(2000,now); f.frequency.exponentialRampToValueAtTime(200,now+0.15);
    f.frequency.exponentialRampToValueAtTime(1500,now+0.3); f.frequency.exponentialRampToValueAtTime(200,now+0.45);
    g.gain.setValueAtTime(0.6,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.7);
    osc.connect(f); f.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.75);
}
function playAirHornKSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const o1=audioCtx.createOscillator(); const o2=audioCtx.createOscillator(); const g=audioCtx.createGain();
    o1.type="sawtooth"; o1.frequency.value=174; o2.type="sawtooth"; o2.frequency.value=178;
    g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.5,now+0.05);
    g.gain.setValueAtTime(0.5,now+0.6); g.gain.exponentialRampToValueAtTime(0.001,now+0.8);
    o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    o1.start(now); o2.start(now); o1.stop(now+0.85); o2.stop(now+0.85);
}
function playWoahKSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(200,now);
    osc.frequency.exponentialRampToValueAtTime(1000,now+0.3); osc.frequency.setValueAtTime(1000,now+0.32);
    osc.frequency.exponentialRampToValueAtTime(600,now+0.6);
    g.gain.setValueAtTime(0.35,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.7);
    osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.75);
}
function playKCrowdSynth() {
    // Variante de cheer con ataque más rápido
    initAudioContext(); const now = audioCtx.currentTime; const dur=1.8;
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=1800; f.Q.value=0.4;
    const g=audioCtx.createGain();
    g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.28,now+0.1);
    g.gain.setValueAtTime(0.28,now+dur-0.3); g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playFanchantSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [0,0.15,0.3,0.6,0.75,0.9].forEach((t) => {
        const sz=Math.floor(audioCtx.sampleRate*0.05);
        const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
        const d=buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
        const noise=audioCtx.createBufferSource(); noise.buffer=buf;
        const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=1200; f.Q.value=2;
        const g=audioCtx.createGain(); g.gain.setValueAtTime(0.32,now+t); g.gain.exponentialRampToValueAtTime(0.001,now+t+0.04);
        noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now+t);
    });
}

// ============================================================
// THEMATIC SOUNDS — SPIDERMAN 🕷️
// ============================================================
function playWebShootSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(4000,now); osc.frequency.exponentialRampToValueAtTime(800,now+0.15);
    g.gain.setValueAtTime(0.4,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.2);
    osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.22);
    const sz=Math.floor(audioCtx.sampleRate*0.05);
    const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const ng=audioCtx.createGain(); ng.gain.setValueAtTime(0.3,now); ng.gain.exponentialRampToValueAtTime(0.001,now+0.04);
    noise.connect(ng); ng.connect(audioCtx.destination); noise.start(now);
}
function playSwingSpiderSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=0.5;
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const f=audioCtx.createBiquadFilter(); f.type="bandpass"; f.Q.value=2;
    f.frequency.setValueAtTime(200,now); f.frequency.exponentialRampToValueAtTime(4000,now+0.25); f.frequency.exponentialRampToValueAtTime(400,now+0.5);
    const g=audioCtx.createGain();
    g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.45,now+0.15); g.gain.exponentialRampToValueAtTime(0.001,now+0.5);
    noise.connect(f); f.connect(g); g.connect(audioCtx.destination); noise.start(now);
}
function playThwipSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    osc.type="square"; osc.frequency.setValueAtTime(5000,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.08);
    g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
    osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+0.12);
}
function playVillainSpiderSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    [110,146.83,196].forEach((freq) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sawtooth"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.15,now+0.1);
        g.gain.setValueAtTime(0.15,now+0.8); g.gain.exponentialRampToValueAtTime(0.001,now+1.2);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+1.3);
    });
}
function playSpiderAlertSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    for (let i=0;i<5;i++) {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="sine"; osc.frequency.setValueAtTime(2000+i*100,now+i*0.1);
        osc.frequency.exponentialRampToValueAtTime(2500+i*100,now+i*0.1+0.07);
        g.gain.setValueAtTime(0.25,now+i*0.1); g.gain.exponentialRampToValueAtTime(0.001,now+i*0.1+0.09);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+i*0.1); osc.stop(now+i*0.1+0.1);
    }
}
function playBoomImpactSynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const kick=audioCtx.createOscillator(); const kg=audioCtx.createGain();
    kick.type="sine"; kick.frequency.setValueAtTime(150,now); kick.frequency.exponentialRampToValueAtTime(30,now+0.2);
    kg.gain.setValueAtTime(0.85,now); kg.gain.exponentialRampToValueAtTime(0.001,now+0.25);
    kick.connect(kg); kg.connect(audioCtx.destination); kick.start(now); kick.stop(now+0.3);
    const sz=Math.floor(audioCtx.sampleRate*0.15);
    const buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const ng=audioCtx.createGain(); ng.gain.setValueAtTime(0.6,now); ng.gain.exponentialRampToValueAtTime(0.001,now+0.15);
    noise.connect(ng); ng.connect(audioCtx.destination); noise.start(now);
}
function playSpiderPowerSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=1.2;
    const osc=audioCtx.createOscillator(); const f=audioCtx.createBiquadFilter(); const g=audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.setValueAtTime(80,now); osc.frequency.exponentialRampToValueAtTime(1600,now+dur*0.8);
    osc.frequency.setValueAtTime(880,now+dur*0.8);
    f.type="lowpass"; f.frequency.setValueAtTime(200,now); f.frequency.exponentialRampToValueAtTime(3000,now+dur);
    g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.4,now+dur*0.7); g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    osc.connect(f); f.connect(g); g.connect(audioCtx.destination); osc.start(now); osc.stop(now+dur+0.05);
}
function playSpiderVictorySynth() {
    initAudioContext(); const now = audioCtx.currentTime;
    const n=[523,659,784,1047,880,784,1047]; const t=[0,0.1,0.2,0.3,0.5,0.6,0.7]; const dur=[0.08,0.08,0.08,0.18,0.08,0.08,0.5];
    n.forEach((freq,idx) => {
        const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
        osc.type="square"; osc.frequency.value=freq;
        g.gain.setValueAtTime(0.22,now+t[idx]); g.gain.exponentialRampToValueAtTime(0.001,now+t[idx]+dur[idx]);
        osc.connect(g); g.connect(audioCtx.destination); osc.start(now+t[idx]); osc.stop(now+t[idx]+dur[idx]+0.05);
    });
}
function playCityNightSynth() {
    initAudioContext(); const now = audioCtx.currentTime; const dur=3.0;
    const osc1=audioCtx.createOscillator(); const g1=audioCtx.createGain();
    osc1.type="sine";
    osc1.frequency.setValueAtTime(880,now); osc1.frequency.linearRampToValueAtTime(660,now+1.0);
    osc1.frequency.linearRampToValueAtTime(880,now+2.0); osc1.frequency.linearRampToValueAtTime(660,now+3.0);
    g1.gain.setValueAtTime(0,now); g1.gain.linearRampToValueAtTime(0.08,now+0.3);
    g1.gain.setValueAtTime(0.08,now+dur-0.5); g1.gain.exponentialRampToValueAtTime(0.001,now+dur);
    osc1.connect(g1); g1.connect(audioCtx.destination); osc1.start(now); osc1.stop(now+dur);
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<buf.length;i++) d[i]=Math.random()*2-1;
    const noise=audioCtx.createBufferSource(); noise.buffer=buf;
    const nf=audioCtx.createBiquadFilter(); nf.type="lowpass"; nf.frequency.value=400;
    const ng=audioCtx.createGain(); ng.gain.setValueAtTime(0.03,now); ng.gain.setValueAtTime(0.03,now+dur-0.4); ng.gain.exponentialRampToValueAtTime(0.001,now+dur);
    noise.connect(nf); nf.connect(ng); ng.connect(audioCtx.destination); noise.start(now);
}

// --- CONTROLLER FOR SOUNDBOARD BUTTON TRIGGERS ---

// Mapa completo: soundId → función de síntesis
const SYNTH_FUNCTIONS = {
    // Genéricos originales (también usados por comandos de voz y cronómetro)
    applause:  playApplauseSynth,
    drumroll:  playDrumrollSynth,
    magic:     playMagicSynth,
    horn:      playHornSynth,
    laughs:    playLaughsSynth,
    suspense:  playSuspenseSynth,
    ding:      playDingSynth,
    error:     playErrorSynth,
    whistle:   playWhistleSynth,
    // Genéricos nuevos (posiciones 6-9 en soundboard)
    fanfare:   playFanfarriaSynth,
    powerup:   playPowerUpSynth,
    explosion: playExplosionSynth,
    round:     playRoundSynth,
    // Piratas
    canon:     playCanonSynth,
    parrot:    playParrotSynth,
    sword:     playSwordSynth,
    abordaje:  playAbordajeSynth,
    waves:     playWavesSynth,
    treasure:  playTreasureSynth,
    alarmP:    playAlarmPirataSynth,
    victoriaP: playVictoriaPiratasSynth,
    shark:     playSharkSynth,
    // Exploradores
    jungle:    playJungleSynth,
    advHorn:   playAdventureHornSynth,
    discovery: playDiscoverySynth,
    compass:   playCompassSynth,
    beast:     playBeastRoarSynth,
    cave:      playCaveDripSynth,
    victoriaE: playVictoriaExplorSynth,
    alertE:    playAlertExplorSynth,
    march:     playMarchSynth,
    // Bluey
    woof:      playWoofSynth,
    happyB:    playHappyBlueSynth,
    surpriseB: playSurpriseBlueSynth,
    danceB:    playDanceBlueSynth,
    cricket:   playCricketSynth,
    fluteB:    playFluteBlueSynth,
    gameB:     playGameBlueSynth,
    friend:    playFriendSynth,
    family:    playFamilySynth,
    // Kpop
    beatDrop:  playBeatDropSynth,
    cheerK:    playKCheerSynth,
    cymbalK:   playKCymbalSynth,
    synthK:    playKSynthLeadSynth,
    dropK:     playKDropSynth,
    airHornK:  playAirHornKSynth,
    woahK:     playWoahKSynth,
    crowdK:    playKCrowdSynth,
    fanchant:  playFanchantSynth,
    // Spiderman
    webshoot:  playWebShootSynth,
    swingS:    playSwingSpiderSynth,
    thwip:     playThwipSynth,
    villainS:  playVillainSpiderSynth,
    alertS:    playSpiderAlertSynth,
    boomS:     playBoomImpactSynth,
    powerS:    playSpiderPowerSynth,
    victoryS:  playSpiderVictorySynth,
    cityS:     playCityNightSynth,
};

function triggerSFX(soundId) {
    // 1. Archivo local del animador (solo en este navegador)
    if (customSfxBlobs[soundId]) {
        playCustomSFXFile(customSfxBlobs[soundId]);
        return;
    }
    // 2. Sonido subido al hosting (disponible para todos los animadores)
    if (hostedSfxUrls[soundId]) {
        playHostedSFXUrl(hostedSfxUrls[soundId]);
        return;
    }
    // 3. Sintetizador offline (fallback siempre disponible)
    const fn = SYNTH_FUNCTIONS[soundId];
    if (fn) fn();
}

function playHostedSFXUrl(url) {
    initAudioContext();
    const audio = new Audio(url);
    audio.volume = parseFloat(document.getElementById("master-volume-slider").value);
    audio.play().catch(e => console.warn("Error reproduciendo SFX hosted:", e));
}

function playCustomSFXFile(fileBlob) {
    initAudioContext();
    const fileUrl = URL.createObjectURL(fileBlob);
    const audio = new Audio(fileUrl);
    const masterVol = parseFloat(document.getElementById("master-volume-slider").value);
    audio.volume = masterVol;
    audio.addEventListener("ended", () => URL.revokeObjectURL(fileUrl), { once: true });
    
    if (analyserNode) {
        try {
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);
        } catch (e) {
            console.warn("El efecto personalizado se reproducirá por el canal nativo.", e);
        }
    }
    audio.play();
}


// ============================================================
// SOUNDBOARD DATA & DYNAMIC RENDERER
// ============================================================

const GENERIC_SOUNDS = [
    { id: "applause",  emoji: "👏", name: "Aplausos",  color: "pad-pink"   },
    { id: "drumroll",  emoji: "🥁", name: "Redoble",   color: "pad-purple" },
    { id: "magic",     emoji: "🪄", name: "Mágico",    color: "pad-cyan"   },
    { id: "horn",      emoji: "🎺", name: "Bocina",    color: "pad-yellow" },
    { id: "laughs",    emoji: "😆", name: "Risas",     color: "pad-green"  },
    { id: "fanfare",   emoji: "🏆", name: "Fanfarria", color: "pad-orange" },
    { id: "powerup",   emoji: "⭐", name: "Power-up",  color: "pad-blue"   },
    { id: "explosion", emoji: "💥", name: "Explosión", color: "pad-red"    },
    { id: "round",     emoji: "🔔", name: "Round",     color: "pad-violet" },
];

const THEMATIC_SOUNDS = {
    piratas: [
        { id: "canon",     emoji: "💣",   name: "Cañonazo", color: "pad-purple" },
        { id: "parrot",    emoji: "🦜",   name: "Loro",     color: "pad-green"  },
        { id: "sword",     emoji: "⚔️",  name: "Sable",    color: "pad-cyan"   },
        { id: "abordaje",  emoji: "🏴‍☠️", name: "Abordaje", color: "pad-red"    },
        { id: "waves",     emoji: "🌊",   name: "Olas",     color: "pad-blue"   },
        { id: "treasure",  emoji: "💰",   name: "Tesoro",   color: "pad-yellow" },
        { id: "alarmP",    emoji: "🚨",   name: "Alarma",   color: "pad-orange" },
        { id: "victoriaP", emoji: "🏆",   name: "Victoria", color: "pad-pink"   },
        { id: "shark",     emoji: "🦈",   name: "Tiburón",  color: "pad-violet" },
    ],
    exploradores: [
        { id: "jungle",    emoji: "🌿",   name: "Selva",      color: "pad-green"  },
        { id: "advHorn",   emoji: "📯",   name: "Aventura",   color: "pad-yellow" },
        { id: "discovery", emoji: "✨",   name: "Descubrím.", color: "pad-cyan"   },
        { id: "compass",   emoji: "🧭",   name: "Brújula",    color: "pad-blue"   },
        { id: "beast",     emoji: "🦁",   name: "Bestia",     color: "pad-orange" },
        { id: "cave",      emoji: "🕳️",  name: "Cueva",     color: "pad-purple" },
        { id: "victoriaE", emoji: "🏆",   name: "Victoria",   color: "pad-pink"   },
        { id: "alertE",    emoji: "⚠️",  name: "Alerta",    color: "pad-red"    },
        { id: "march",     emoji: "🥁",   name: "Marcha",     color: "pad-violet" },
    ],
    bluey: [
        { id: "woof",      emoji: "🐕",   name: "¡Guau!",   color: "pad-blue"   },
        { id: "happyB",    emoji: "😊",   name: "Feliz",     color: "pad-yellow" },
        { id: "surpriseB", emoji: "😲",   name: "Sorpresa",  color: "pad-cyan"   },
        { id: "danceB",    emoji: "💃",   name: "Bailar",    color: "pad-pink"   },
        { id: "cricket",   emoji: "🦗",   name: "Grillo",    color: "pad-green"  },
        { id: "fluteB",    emoji: "🎵",   name: "Flauta",    color: "pad-violet" },
        { id: "gameB",     emoji: "🎮",   name: "Juego",     color: "pad-orange" },
        { id: "friend",    emoji: "🤝",   name: "Amistad",   color: "pad-red"    },
        { id: "family",    emoji: "❤️",  name: "Familia",  color: "pad-purple" },
    ],
    kpop: [
        { id: "beatDrop",  emoji: "🎵",   name: "Beat Drop", color: "pad-purple" },
        { id: "cheerK",    emoji: "📣",   name: "Cheer",     color: "pad-pink"   },
        { id: "cymbalK",   emoji: "🥁",   name: "Cymbal",    color: "pad-violet" },
        { id: "synthK",    emoji: "🎹",   name: "Synth",     color: "pad-cyan"   },
        { id: "dropK",     emoji: "⬇️",  name: "Drop",     color: "pad-blue"   },
        { id: "airHornK",  emoji: "📯",   name: "Air Horn",  color: "pad-yellow" },
        { id: "woahK",     emoji: "😮",   name: "¡Woah!",   color: "pad-orange" },
        { id: "crowdK",    emoji: "👥",   name: "Crowd",     color: "pad-red"    },
        { id: "fanchant",  emoji: "💜",   name: "Fanchant",  color: "pad-green"  },
    ],
    spiderman: [
        { id: "webshoot",  emoji: "🕸️",  name: "Web Shoot", color: "pad-red"    },
        { id: "swingS",    emoji: "🏙️",  name: "Swing",    color: "pad-blue"   },
        { id: "thwip",     emoji: "💨",   name: "Thwip",     color: "pad-cyan"   },
        { id: "villainS",  emoji: "😈",   name: "Villano",   color: "pad-purple" },
        { id: "alertS",    emoji: "🚨",   name: "Alerta",    color: "pad-orange" },
        { id: "boomS",     emoji: "💥",   name: "Boom",      color: "pad-pink"   },
        { id: "powerS",    emoji: "⚡",   name: "Poder",     color: "pad-yellow" },
        { id: "victoryS",  emoji: "🏆",   name: "Victoria",  color: "pad-green"  },
        { id: "cityS",     emoji: "🌃",   name: "Ciudad",    color: "pad-violet" },
    ],
};

const SOUNDBOARD_THEME_LABELS = {
    juegos:       "🎉 Genérico",
    piratas:      "🏴‍☠️ Piratas",
    exploradores: "🧭 Exploradores",
    bluey:        "💙 Bluey",
    kpop:         "🎤 K-Pop",
    spiderman:    "🕷️ Spiderman",
};

let currentSoundboardSounds = GENERIC_SOUNDS; // sonidos visibles ahora (para el modo escenario)

function renderSoundboard(sounds, label) {
    currentSoundboardSounds = sounds;
    const grid = document.getElementById("soundboard-grid");
    if (!grid) return;
    grid.innerHTML = "";

    sounds.forEach((sound, idx) => {
        const pad = document.createElement("button");
        pad.className = `sound-pad ${sound.color || "pad-pink"}`;
        pad.setAttribute("data-sound", sound.id);
        pad.setAttribute("data-key", String(idx + 1));
        pad.innerHTML = `
            <span class="pad-key">${idx + 1}</span>
            <span class="pad-emoji">${sound.emoji}</span>
            <span class="pad-name">${sound.name}</span>
        `;

        // Restaurar estado personalizado si existe
        if (customSfxBlobs[sound.id]) {
            pad.classList.add("customized");
            pad.style.borderStyle = "dashed";
            const nameEl = pad.querySelector(".pad-name");
            if (!nameEl.textContent.startsWith("*")) nameEl.textContent = `* ${nameEl.textContent}`;
        }

        pad.addEventListener("click", () => {
            triggerSFX(sound.id);
            pad.classList.add("triggered");
            setTimeout(() => pad.classList.remove("triggered"), 150);
        });

        grid.appendChild(pad);
    });

    // Actualizar label del tema en el header del panel
    const themeLabel = document.getElementById("soundboard-theme-label");
    if (themeLabel) themeLabel.textContent = label || "🎉 Genérico";

    // Actualizar select del custom SFX binder con los sonidos actuales
    const sfxSelect = document.getElementById("sfx-select-to-bind");
    if (sfxSelect) {
        sfxSelect.innerHTML = "";
        sounds.forEach((sound, idx) => {
            const opt = document.createElement("option");
            opt.value = sound.id;
            opt.textContent = `Reemplazar ${idx + 1}. ${sound.name} ${sound.emoji}`;
            sfxSelect.appendChild(opt);
        });
    }

    // Si el modo escenario está abierto, refrescar también sus pads
    const stage = document.getElementById("stage-mode");
    if (stage && !stage.classList.contains("hidden")) renderStageSoundboard();
}

// ============================================================
// MODO ESCENARIO (botones gigantes para usar en directo)
// ============================================================
function renderStageSoundboard() {
    const grid = document.getElementById("stage-sounds");
    if (!grid) return;
    grid.innerHTML = "";
    (currentSoundboardSounds || GENERIC_SOUNDS).forEach((sound) => {
        const pad = document.createElement("button");
        pad.className = "stage-pad";
        pad.innerHTML = `<span class="e">${sound.emoji}</span><span class="n">${sound.name}</span>`;
        pad.addEventListener("click", () => {
            triggerSFX(sound.id);
            pad.classList.add("triggered");
            setTimeout(() => pad.classList.remove("triggered"), 150);
        });
        grid.appendChild(pad);
    });
}

function renderStagePlaylists() {
    const grid = document.getElementById("stage-playlists");
    if (!grid) return;
    grid.innerHTML = "";
    STAGE_PLAYLISTS.forEach(([key, emoji, label]) => {
        const button = document.createElement("button");
        const count = PLAYLISTS[key]?.length || 0;
        button.className = `stage-playlist ${currentPlaylistKey === key ? "active" : ""}`;
        button.disabled = count === 0;
        button.innerHTML = `<span>${emoji}</span><strong>${label}</strong><small>${count} ${count === 1 ? "canción" : "canciones"}</small>`;
        button.addEventListener("click", async () => {
            switchPlaylistTab(`tab-${key}`);
            renderStagePlaylists();
            if (PLAYLISTS[key]?.length) {
                loadTrack(key, 0);
                await playCurrentTrack();
            }
        });
        grid.appendChild(button);
    });
}

function updateVoiceStatus(message) {
    const status = document.getElementById("stage-voice-status");
    if (status) {
        status.textContent = message || (voiceActive ? "Escuchando: di una orden" : "Micrófono apagado");
        status.classList.toggle("listening", voiceActive);
    }
    const stageButton = document.getElementById("stage-voice");
    if (stageButton) {
        stageButton.classList.toggle("active-voice", voiceActive);
        stageButton.textContent = voiceActive ? "🎙️ Escuchando" : "🎙️ Escuchar";
    }
}

function syncStageInfo() {
    const t = document.getElementById("stage-track-title");
    const s = document.getElementById("stage-track-sub");
    if (t) t.textContent = document.getElementById("track-title").textContent;
    if (s) s.textContent = document.getElementById("track-subtitle").textContent;
}

function openStageMode() {
    const el = document.getElementById("stage-mode");
    if (!el) return;
    renderStageSoundboard();
    renderStagePlaylists();
    syncStageInfo();
    updateVoiceStatus();
    const pb = document.getElementById("stage-play");
    if (pb) pb.textContent = nativePlayer.paused ? "▶️" : "⏸️";
    const db = document.getElementById("stage-duck");
    if (db) db.classList.toggle("active-duck", isDucked);
    el.classList.remove("hidden");
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) {}
}

function closeStageMode() {
    const el = document.getElementById("stage-mode");
    if (el) el.classList.add("hidden");
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
}

// --- SPEECH RECOGNITION (DIRECT VOICE COMMANDS) ---

function playPlaylistFromVoice(playlistKey) {
    if (!PLAYLISTS[playlistKey]?.length) {
        showToast("Esta lista todavía no tiene canciones");
        return;
    }
    switchPlaylistTab(`tab-${playlistKey}`);
    loadTrack(playlistKey, 0);
    playCurrentTrack();
    const playlist = STAGE_PLAYLISTS.find(([key]) => key === playlistKey);
    showToast(`Voz: ${playlist?.[2] || "Lista"} ▶️`);
}

function executeVoiceAction(actionId) {
    const sfxByAction = {
        "sfx-applause": "applause",
        "sfx-drumroll": "drumroll",
        "sfx-magic": "magic",
        "sfx-horn": "horn",
        "sfx-laughs": "laughs",
        "sfx-suspense": "suspense",
        "sfx-ding": "ding",
        "sfx-error": "error",
        "sfx-whistle": "whistle"
    };

    if (sfxByAction[actionId]) {
        triggerSFX(sfxByAction[actionId]);
        const definition = VOICE_COMMAND_DEFINITIONS.find((item) => item.id === actionId);
        showToast(`Voz: ${definition?.label || "Sonido"}`);
        return true;
    }

    if (actionId.startsWith("playlist-")) {
        playPlaylistFromVoice(actionId.replace("playlist-", ""));
        return true;
    }

    switch (actionId) {
        case "next": playNext(); showToast("Voz: ⏭️ Siguiente canción"); return true;
        case "previous": playPrev(); showToast("Voz: ⏮️ Canción anterior"); return true;
        case "pause": pauseCurrentTrack(); showToast("Voz: ⏸️ Música pausada"); return true;
        case "resume": playCurrentTrack(); showToast("Voz: ▶️ Música iniciada"); return true;
        case "duck": toggleDuck(); showToast("Voz: 🔉 Volumen ajustado"); return true;
        case "tarta": loadTrack("tarta", 0); playCurrentTrack(); showToast("Voz: 🎂 ¡Momento Tarta!"); return true;
        case "mundo": loadTrack("mundo_samadry", 0); playCurrentTrack(); showToast("Voz: 🌟 ¡Mundo Samadry!"); return true;
        default: return false;
    }
}

function runCustomVoiceCommand(transcript) {
    const normalizedTranscript = normalizeVoiceText(transcript);

    for (const command of getCustomVoiceCommands()) {
        const definition = VOICE_COMMAND_DEFINITIONS.find((item) => item.id === command.actionId);
        if (!definition) continue;
        const phrase = normalizeVoiceText(command.phrase);
        if (phrase && normalizedTranscript.includes(phrase)) {
            return executeVoiceAction(command.actionId);
        }
    }

    for (const definition of VOICE_COMMAND_DEFINITIONS) {
        const matchesDefault = definition.phrases.some((phrase) =>
            normalizedTranscript.includes(normalizeVoiceText(phrase))
        );
        if (matchesDefault) {
            return executeVoiceAction(definition.id);
        }
    }
    return false;
}

function renderVoiceCommands() {
    const list = document.getElementById("voice-command-list");
    const select = document.getElementById("new-voice-action");
    if (!list || !select) return;

    const customCommands = getCustomVoiceCommands();
    list.innerHTML = "";
    select.innerHTML = "";

    VOICE_COMMAND_DEFINITIONS.forEach((definition) => {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = `${definition.icon} ${definition.label}`;
        select.appendChild(option);

        const card = document.createElement("section");
        card.className = "voice-command-item";

        const heading = document.createElement("div");
        heading.className = "voice-command-heading";
        const title = document.createElement("strong");
        title.textContent = `${definition.icon} ${definition.label}`;
        const mode = document.createElement("span");
        mode.className = "voice-command-mode direct";
        mode.textContent = "Comando directo";
        heading.append(title, mode);
        card.appendChild(heading);

        const phrases = document.createElement("div");
        phrases.className = "voice-command-phrases";
        definition.phrases.forEach((phrase) => {
            const chip = document.createElement("span");
            chip.className = "voice-phrase default";
            chip.textContent = `“${phrase}”`;
            phrases.appendChild(chip);
        });

        customCommands.forEach((command, index) => {
            if (command.actionId !== definition.id) return;
            const chip = document.createElement("span");
            chip.className = "voice-phrase custom";
            const phraseText = document.createElement("span");
            phraseText.textContent = `“${command.phrase}”`;
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "voice-phrase-remove";
            remove.textContent = "×";
            remove.title = "Eliminar esta frase";
            remove.setAttribute("aria-label", `Eliminar ${command.phrase}`);
            remove.addEventListener("click", () => {
                const nextCommands = getCustomVoiceCommands();
                nextCommands.splice(index, 1);
                saveCustomVoiceCommands(nextCommands);
                renderVoiceCommands();
                showToast("Comando personalizado eliminado");
            });
            chip.append(phraseText, remove);
            phrases.appendChild(chip);
        });

        card.appendChild(phrases);
        list.appendChild(card);
    });
}

function openVoiceCommands() {
    renderVoiceCommands();
    document.getElementById("voice-commands-modal")?.classList.remove("hidden");
}

function closeVoiceCommands() {
    document.getElementById("voice-commands-modal")?.classList.add("hidden");
}

function initVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Te recomendamos Google Chrome.");
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'es-ES';
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceActive = true;
        const voiceBtn = document.getElementById("voice-assistant-btn");
        voiceBtn.className = "icon-btn voice-btn-active";
        voiceBtn.title = "Asistente de Voz Activo (Escuchando...)";
        updateVoiceStatus();
        showToast("Asistente de Voz Activo: di un comando 🎙️");
    };
    
    recognition.onend = () => {
        const voiceBtn = document.getElementById("voice-assistant-btn");
        if (voiceActive) {
            clearTimeout(recognitionRestartTimer);
            recognitionRestartTimer = setTimeout(() => {
                if (!voiceActive) return;
                try { recognition.start(); } catch(e) {}
            }, 350);
        } else {
            voiceBtn.className = "icon-btn voice-btn-inactive";
            voiceBtn.title = "Activar Asistente de Voz";
        }
        updateVoiceStatus();
    };
    
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (!event.results[i].isFinal) continue;
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            console.log("Voz:", transcript, "(final)");
            updateVoiceStatus(`He oído: “${transcript}”`);
            processVoiceCommand(transcript);
        }
    };
    
    recognition.onerror = (e) => {
        console.error("Speech Recognition error:", e.error);
        if (e.error === 'not-allowed') {
            alert("Acceso al micrófono denegado. Activa los permisos en el navegador.");
            toggleVoiceAssistant(false);
        } else if (e.error === "no-speech") {
            updateVoiceStatus("No te he oído. Sigue activo.");
        } else if (e.error === "audio-capture") {
            updateVoiceStatus("No se encuentra el micrófono");
        }
    };
}

function toggleVoiceAssistant(forceState) {
    const state = typeof forceState === 'boolean' ? forceState : !voiceActive;
    
    if (state) {
        if (!recognition) {
            initVoiceAssistant();
        }
        if (recognition) {
            voiceActive = true;
            try {
                recognition.start();
            } catch (e) {
                console.warn("SpeechRecognition already started");
            }
        }
    } else {
        voiceActive = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error("Error stopping SpeechRecognition:", e);
            }
        }
        const voiceBtn = document.getElementById("voice-assistant-btn");
        voiceBtn.className = "icon-btn voice-btn-inactive";
        voiceBtn.title = "Activar Asistente de Voz";
        showToast("Asistente de Voz Desactivado 🤐");
        updateVoiceStatus();
    }
}

let _lastCommandAt = 0;

function processVoiceCommand(transcript) {
    const now = Date.now();
    if (now - _lastCommandAt < 2000) return; // Cooldown 2s entre comandos

    transcript = normalizeVoiceText(transcript);
    if (runCustomVoiceCommand(transcript)) {
        _lastCommandAt = now;
        return;
    }

    // --- Comandos directos (sin activador) ---

    // "siguiente canción" → pasa a la siguiente pista
    if (transcript.includes("siguiente canción") || transcript.includes("siguiente cancion")) {
        _lastCommandAt = now;
        playNext();
        showToast("Voz: ⏭️ Siguiente canción");
        return;
    }

    // "stop" → pausa la canción
    if (transcript.includes("stop")) {
        _lastCommandAt = now;
        pauseCurrentTrack();
        showToast("Voz: ⏸️ Stop");
        return;
    }

    // "seguimos" / "sigue" → reanuda la canción
    if (transcript.includes("seguimos")) {
        _lastCommandAt = now;
        playCurrentTrack();
        showToast("Voz: ▶️ Seguimos");
        return;
    }

    // "preparados listos" → carga y reproduce juegos directamente
    if (transcript.includes("preparados listos")) {
        _lastCommandAt = now;
        startGamesMusicNow();
        return;
    }

    const themedPlaylist = ["piratas", "exploradores", "bluey", "kpop", "spiderman"]
        .find((key) => transcript.includes(`empieza ${key}`) || transcript.includes(`lista ${key}`));
    if (themedPlaylist) {
        _lastCommandAt = now;
        playPlaylistFromVoice(themedPlaylist);
        return;
    }

    // "comienza la lista de juegos generica" → carga y reproduce juegos
    if (transcript.includes("comienza la lista de juegos") || transcript.includes("lista de juegos generica") || transcript.includes("empieza juegos")) {
        _lastCommandAt = now;
        switchPlaylistTab("tab-juegos");
        loadTrack("juegos", 0);
        playCurrentTrack();
        showToast("Voz: Juegos Generica ▶️ 🏃");
        return;
    }

    // "momento tarta" → canción de cumpleaños
    if (transcript.includes("momento tarta") || transcript.includes("canción tarta") || transcript.includes("cancion tarta")) {
        _lastCommandAt = now;
        loadTrack("tarta", 0);
        playCurrentTrack();
        showToast("Voz: 🎂 ¡Momento Tarta!");
        return;
    }

    // "momento mundo" → canción especial Mundo Samadry
    if (transcript.includes("momento mundo")) {
        _lastCommandAt = now;
        loadTrack("mundo_samadry", 0);
        playCurrentTrack();
        showToast("Voz: 🌟 ¡Mundo Samadry!");
        return;
    }

    // Sinónimos y peticiones directas. "Samadry" sigue siendo opcional.
    if (transcript) {
        let cleanText = transcript.replace(/.*samadry/, "").trim();
        
        // --- 1. Disparo de Sonidos (Soundboard) ---
        if (cleanText.includes("aplausos") || cleanText.includes("aplauso") || cleanText.includes("ovacion")) {
            _lastCommandAt = now;
            triggerSFX("applause");
            showToast("Voz: Aplausos 👏");
            return;
        }
        if (cleanText.includes("redoble") || cleanText.includes("tambor") || cleanText.includes("tambores")) {
            _lastCommandAt = now;
            triggerSFX("drumroll");
            showToast("Voz: Redoble 🥁");
            return;
        }
        if (cleanText.includes("magia") || cleanText.includes("magico") || cleanText.includes("varita")) {
            _lastCommandAt = now;
            triggerSFX("magic");
            showToast("Voz: Mágico 🪄");
            return;
        }
        if (cleanText.includes("bocina") || cleanText.includes("trompeta")) {
            _lastCommandAt = now;
            triggerSFX("horn");
            showToast("Voz: Bocina 🎺");
            return;
        }
        if (cleanText.includes("risas") || cleanText.includes("risa") || cleanText.includes("risitas")) {
            _lastCommandAt = now;
            triggerSFX("laughs");
            showToast("Voz: Risas 😆");
            return;
        }
        if (cleanText.includes("suspenso") || cleanText.includes("misterio") || cleanText.includes("tension")) {
            _lastCommandAt = now;
            triggerSFX("suspense");
            showToast("Voz: Suspenso 🕵️");
            return;
        }
        if (cleanText.includes("ding") || cleanText.includes("campana") || cleanText.includes("correcto")) {
            _lastCommandAt = now;
            triggerSFX("ding");
            showToast("Voz: Ding! 🔔");
            return;
        }
        if (cleanText.includes("fallo") || cleanText.includes("error") || cleanText.includes("incorrecto")) {
            _lastCommandAt = now;
            triggerSFX("error");
            showToast("Voz: Fallo 💥");
            return;
        }
        if (cleanText.includes("silbato") || cleanText.includes("pito") || cleanText.includes("arbitro")) {
            _lastCommandAt = now;
            triggerSFX("whistle");
            showToast("Voz: Silbato 🗣️");
            return;
        }
        
        // --- 2. Búsqueda y Reproducción de Música (Spotify / Local) ---
        if (cleanText.includes("pon la cancion de") || cleanText.includes("busca la cancion de") || cleanText.includes("pon la musica de") || cleanText.startsWith("pon ") || cleanText.startsWith("reproduce ")) {
            let songQuery = cleanText
                .replace(/pon la cancion de/, "")
                .replace(/busca la cancion de/, "")
                .replace(/pon la musica de/, "")
                .replace(/^pon\s+/, "")
                .replace(/^reproduce\s+/, "")
                .trim();

            if (songQuery) {
                _lastCommandAt = now;
                showToast(`Buscando: "${songQuery}"`);
                if (spotifyConnected) {
                    searchAndPlaySpotify(songQuery);
                } else {
                    searchAndPlayLocal(songQuery);
                }
            }
            return;
        }

        // --- 3. Controles de Reproducción ---
        if (cleanText === "pausa" || cleanText === "para" || cleanText.includes("para la musica") || cleanText.includes("parar musica") || cleanText.includes("pausar musica")) {
            _lastCommandAt = now;
            pauseCurrentTrack();
            showToast("Voz: Música pausada ⏸️");
            return;
        }
        if (cleanText.includes("reproduce") || cleanText.includes("continua") || cleanText.includes("play") || cleanText.includes("sonar")) {
            _lastCommandAt = now;
            playCurrentTrack();
            showToast("Voz: Música iniciada ▶️");
            return;
        }
        if (cleanText.includes("siguiente") || cleanText.includes("salta") || cleanText.includes("pasar")) {
            _lastCommandAt = now;
            playNext();
            showToast("Voz: Siguiente canción ⏭️");
            return;
        }
        if (cleanText.includes("anterior") || cleanText.includes("atras") || cleanText.includes("volver")) {
            _lastCommandAt = now;
            playPrev();
            showToast("Voz: Canción anterior ⏮️");
            return;
        }
    }
}

function temporarilyDuckForVoice() {
    if (isDucked) return;
    voiceDuckActive = true;
    clearTimeout(voiceDuckTimer);
    applyTargetVolume(180);
    voiceDuckTimer = setTimeout(() => {
        voiceDuckActive = false;
        applyTargetVolume(500);
    }, 2200);
}

function applyTargetVolume(duration = 300) {
    const target = getTargetVolume();
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.setVolume(target).catch(() => {});
    } else if (!nativePlayer.paused) {
        fadeVolume(nativePlayer, nativePlayer.volume, target, duration);
    }
}

function startGamesMusicNow() {
    switchPlaylistTab("tab-juegos");
    loadTrack("juegos", 0);
    playCurrentTrack();
    showToast("Voz: Juegos iniciados ▶️");
}

// Cuenta atrás para juegos
function triggerGameCountdown() {
    const overlay = document.getElementById("countdown-overlay");
    const numberEl = document.getElementById("countdown-number");
    
    overlay.classList.remove("hidden");
    pauseCurrentTrack();
    
    let count = 3;
    numberEl.textContent = count;
    playDingSynth(); // Alarma sonora tick 3
    
    // Animación de los ticks
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numberEl.textContent = count;
            playDingSynth(); // Alarma sonora ticks 2 y 1
        } else if (count === 0) {
            numberEl.textContent = "¡YA!";
            playHornSynth(); // Bocina de inicio
        } else {
            clearInterval(interval);
            overlay.classList.add("hidden");
            
            // Cargar e iniciar la primera canción de la pestaña de Juegos
            switchPlaylistTab("tab-juegos");
            loadTrack("juegos", 0);
            playCurrentTrack();
        }
    }, 1000);
}

function showToast(msg) {
    const existing = document.querySelector(".custom-toast");
    if (existing) existing.remove();
    
    const toast = document.createElement("div");
    toast.className = "custom-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "80px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "rgba(18, 18, 28, 0.9)";
    toast.style.border = "1px solid var(--neon-purple)";
    toast.style.boxShadow = "0 0 15px var(--neon-purple-glow)";
    toast.style.color = "#f1f1f6";
    toast.style.padding = "10px 22px";
    toast.style.borderRadius = "30px";
    toast.style.fontSize = "0.85rem";
    toast.style.fontWeight = "700";
    toast.style.zIndex = "999999";
    toast.style.backdropFilter = "blur(10px)";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    
    document.body.appendChild(toast);
    if (msg.startsWith("Voz:")) updateVoiceStatus(msg);
    setTimeout(() => toast.style.opacity = "1", 10);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}


// --- SPOTIFY WEB PLAYBACK SDK & WEB API HELPER ---

function getSpotifyRedirectUri() {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        const port = window.location.port ? `:${window.location.port}` : "";
        return `${window.location.protocol}//127.0.0.1${port}/`;
    }
    
    return `${window.location.origin}${window.location.pathname}`;
}

function generateRandomString(length) {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = window.crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

async function exchangeSpotifyCodeForToken(code) {
    const savedClientId = localStorage.getItem("spotify_client_id");
    const codeVerifier = localStorage.getItem("spotify_code_verifier");
    
    if (!savedClientId || !codeVerifier) {
        throw new Error("Falta el Client ID o el código de verificación de Spotify.");
    }
    
    const body = new URLSearchParams({
        client_id: savedClientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: getSpotifyRedirectUri(),
        code_verifier: codeVerifier
    });
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });
    
    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Spotify rechazó el inicio de sesión (${response.status}). Revisa que el Redirect URI en Spotify sea exactamente: ${getSpotifyRedirectUri()}. Detalle: ${details}`);
    }
    
    const data = await response.json();
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem("spotify_token_expires_at", String(Date.now() + (data.expires_in * 1000)));
    if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    localStorage.removeItem("spotify_code_verifier");
    return data.access_token;
}

async function refreshSpotifyTokenIfNeeded() {
    const savedClientId = localStorage.getItem("spotify_client_id");
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    const token = localStorage.getItem("spotify_access_token");
    const expiresAt = parseInt(localStorage.getItem("spotify_token_expires_at") || "0", 10);
    
    if (token && Date.now() < expiresAt - 60000) return token;
    if (!savedClientId || !refreshToken) return token;
    
    const body = new URLSearchParams({
        client_id: savedClientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken
    });
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });
    
    if (!response.ok) return token;
    
    const data = await response.json();
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem("spotify_token_expires_at", String(Date.now() + (data.expires_in * 1000)));
    if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    return data.access_token;
}

async function initSpotifyPlayerIfReady() {
    if (!spotifySdkReady || spotifyPlayerConnecting || spotifyPlayer) return;
    
    const savedClientId = localStorage.getItem("spotify_client_id");
    const token = await refreshSpotifyTokenIfNeeded();
    
    if (!savedClientId || !token) {
        updateSpotifyStatusUI(false);
        return;
    }
    
    spotifyPlayerConnecting = true;
    spotifyToken = token;
    
    spotifyPlayer = new Spotify.Player({
        name: 'SamadryPlayer Web Console',
        getOAuthToken: cb => { cb(token); },
        volume: parseFloat(document.getElementById("master-volume-slider").value)
    });
    
    // Dispositivo Listo
    spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player listo con Device ID:', device_id);
        spotifyDeviceId = device_id;
        spotifyConnected = true;
        updateSpotifyStatusUI(true);
        
        // Transferir la sesión activa a este navegador
        transferSpotifyPlayback(device_id, token);
    });
    
    // Dispositivo Fuera de Línea
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify Player desconectado:', device_id);
        spotifyConnected = false;
        updateSpotifyStatusUI(false);
    });
    
    // Escuchar cambios de estado (canción activa, pausa, volumen)
    spotifyPlayer.addListener('player_state_changed', state => {
        if (!state) return;
        
        const track = state.track_window.current_track;
        if (track) {
            document.getElementById("track-title").textContent = track.name;
            document.getElementById("track-subtitle").textContent = `${track.artists.map(a => a.name).join(', ')} • Spotify Premium`;
            
            const durationSecs = Math.round(state.duration / 1000);
            const currentSecs = Math.round(state.position / 1000);
            
            document.getElementById("audio-total-time").textContent = formatTime(durationSecs);
            document.getElementById("audio-current-time").textContent = formatTime(currentSecs);
            
            const percent = (state.position / state.duration) * 100;
            document.getElementById("audio-progress-slider").value = percent || 0;
            document.getElementById("visual-progress-fill").style.width = `${percent || 0}%`;
            
            const disc = document.getElementById("track-disc");
            const playBtn = document.getElementById("player-play-btn");
            if (state.paused) {
                disc.style.animationPlayState = "paused";
                playBtn.textContent = "▶️";
            } else {
                disc.style.animationPlayState = "running";
                playBtn.textContent = "⏸️";
            }
        }
    });
    
    // Errores comunes
    spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error(message);
        updateSpotifyStatusUI(false, `Spotify no pudo iniciar: ${message}`);
    });
    spotifyPlayer.addListener('authentication_error', ({ message }) => { 
        console.error("Token de autenticación expirado:", message);
        updateSpotifyStatusUI(false, "La sesión de Spotify caducó. Conecta de nuevo.");
    });
    spotifyPlayer.addListener('account_error', ({ message }) => { 
        console.error("Tu cuenta requiere Spotify Premium:", message);
        alert("El SDK de Spotify requiere una cuenta Spotify Premium activa.");
    });
    
    spotifyPlayer.connect().finally(() => {
        spotifyPlayerConnecting = false;
    });
}

// Callback global llamado por el script de Spotify SDK
window.onSpotifyWebPlaybackSDKReady = () => {
    spotifySdkReady = true;
    initSpotifyPlayerIfReady();
};

function buildHostedAudioUrl(fileOrUrl) {
    if (/^https?:\/\//i.test(fileOrUrl)) return fileOrUrl;
    return new URL(fileOrUrl.replace(/^\/+/, ""), AUDIO_LIBRARY_BASE_URL).href;
}

function normalizeHostedTrack(rawTrack, playlistKey) {
    const source = rawTrack.url || rawTrack.file;
    if (!source) return null;
    
    return {
        title: rawTrack.title || source.split("/").pop().replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
        artist: rawTrack.artist || "Mundo Samadry",
        duration: rawTrack.duration || "--:--",
        url: buildHostedAudioUrl(source),
        tag: rawTrack.tag || getPlaylistLabel(playlistKey)
    };
}

// Carga sfx-manifest.json del hosting → sonidos profesionales para todos los animadores
// Formato del JSON: { "soundId": "https://.../sfx/nombre.mp3", ... }
async function loadSFXManifest() {
    const manifestUrl = `${AUDIO_LIBRARY_BASE_URL}sfx/sfx-manifest.json`;
    try {
        const res = await fetch(`${manifestUrl}?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return; // Sin manifest → silencioso, usa sintetizador
        const data = await res.json();
        hostedSfxUrls = data;
        const count = Object.keys(data).length;
        if (count > 0) {
            console.log(`SFX manifest cargado: ${count} sonido(s) profesionale(s) disponible(s).`);
            // Marcar visualmente los pads que tienen sonido real del hosting
            Object.keys(data).forEach(soundId => {
                const pad = document.querySelector(`.sound-pad[data-sound="${soundId}"]`);
                if (pad) {
                    pad.title = "✅ Sonido profesional del hosting";
                    pad.classList.add("has-hosted-sfx");
                }
            });
        }
    } catch (e) {
        // Normal si el archivo no existe aún
    }
}

async function loadHostedPlaylists() {
    try {
        const response = await fetch(`${HOSTED_PLAYLIST_MANIFEST_URL}?v=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`No se pudo cargar playlists.json (${response.status})`);
        }
        
        const manifest = await response.json();
        Object.keys(PLAYLISTS).forEach((key) => {
            if (key === "locales" || !Array.isArray(manifest[key])) return;
            
            const tracks = manifest[key]
                .map((track) => normalizeHostedTrack(track, key))
                .filter(Boolean);
            
            PLAYLISTS[key] = tracks;
        });
        
        document.getElementById("audio-source-status").textContent = "Modo: Listas del hosting cargadas";
    } catch (err) {
        console.warn("No se pudieron cargar las listas del hosting. Se usaran las listas integradas.", err);
        document.getElementById("audio-source-status").textContent = "Modo: Listas integradas";
    }
}

function transferSpotifyPlayback(deviceId, token) {
    fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            device_ids: [deviceId],
            play: false // Transferir control pero no disparar música sola
        })
    })
    .then(() => console.log("Canal de reproducción transferido correctamente."))
    .catch(err => console.error("Error al transferir canal:", err));
}

function updateSpotifyStatusUI(connected, message = "") {
    const connState = document.getElementById("spotify-conn-state");
    const statusText = document.getElementById("audio-source-status");
    
    if (connected) {
        connState.textContent = "Conectado";
        connState.className = "state-connected";
        statusText.textContent = "Modo: Spotify Premium Activo 🟢";
    } else {
        connState.textContent = "No Conectado";
        connState.className = "state-disconnected";
        statusText.textContent = message || "Modo: Sintetizador Web Audio API Activo (Offline listo)";
    }
}

async function searchAndPlaySpotify(query) {
    const token = await refreshSpotifyTokenIfNeeded();
    if (!token || !spotifyConnected) {
        searchAndPlayLocal(query);
        return;
    }
    
    // Buscar canción en Spotify API
    fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const track = data.tracks.items[0];
        if (track) {
            playSpotifyTrackUri(track.uri, token);
            showToast(`Reproduciendo Spotify: ${track.name}`);
        } else {
            showToast(`No se encontró "${query}" en Spotify.`);
        }
    })
    .catch(err => {
        console.error("Error al buscar en Spotify:", err);
        searchAndPlayLocal(query);
    });
}

function playSpotifyTrackUri(uri, token) {
    activePlaybackSource = "spotify";
    nativePlayer.pause();
    document.getElementById("audio-source-status").textContent = "Modo: Spotify Premium Activo 🟢";
    
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [uri] })
    })
    .catch(err => console.error("Error al mandar orden de reproducción:", err));
}

function searchAndPlayLocal(query) {
    let matchedSong = null;
    let matchedPlaylist = "";
    let matchedIndex = -1;
    
    for (const key in PLAYLISTS) {
        const list = PLAYLISTS[key];
        const idx = list.findIndex(s => s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query));
        if (idx !== -1) {
            matchedSong = list[idx];
            matchedPlaylist = key;
            matchedIndex = idx;
            break;
        }
    }
    
    if (matchedSong) {
        switchPlaylistTab(`tab-${matchedPlaylist}`);
        loadTrack(matchedPlaylist, matchedIndex);
        playCurrentTrack();
        showToast(`Reproduciendo local: ${matchedSong.title}`);
    } else {
        showToast(`No se encontró "${query}" localmente.`);
    }
}


// --- MUSIC PLAYER MODULE ---
const nativePlayer = document.getElementById("native-audio-player");
nativePlayer.preload = "auto";
nativePlayer.playsInline = true;
let currentPlaylistKey = "juegos";
let currentTrackIndex = -1;
let isLooping = false;
let activePlaybackSource = "native";
let currentNativeObjectUrl = null;

// --- TRANSICIONES SUAVES (crossfade, fundidos, ducking) ---
let isDucked = false; // música bajada para hablar al público
let crossfadeDuration = parseFloat(localStorage.getItem("samadry_crossfade") ?? "3");
let crossfadePlayer = null; // elemento secundario para la cola de la pista saliente
let crossfadeArmed = false; // evita disparar el crossfade dos veces para la misma pista
let userWantsPlayback = false; // intención real de reproducir (sobrevive a los fundidos)

// Fundido de volumen suave sobre un elemento <audio>
function fadeVolume(el, from, to, ms, done) {
    if (!el) return;
    if (el._fadeTimer) { clearInterval(el._fadeTimer); el._fadeTimer = null; }
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const steps = Math.max(1, Math.round(ms / 40));
    let i = 0;
    el.volume = clamp(from);
    el._fadeTimer = setInterval(() => {
        i++;
        el.volume = clamp(from + (to - from) * (i / steps));
        if (i >= steps) {
            clearInterval(el._fadeTimer);
            el._fadeTimer = null;
            if (done) done();
        }
    }, 40);
}

// Volumen objetivo según el slider maestro y si está "bajado para hablar"
function getTargetVolume() {
    const base = parseFloat(document.getElementById("master-volume-slider").value);
    return (isDucked || voiceDuckActive) ? base * 0.15 : base;
}

// Crossfade: la pista actual se desvanece en un elemento secundario mientras
// la siguiente entra en el reproductor principal.
function startCrossfade(remaining) {
    const list = PLAYLISTS[currentPlaylistKey];
    if (!list || list.length < 2) return;

    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= list.length) nextIndex = 0;

    const fadeMs = Math.min(crossfadeDuration, remaining) * 1000;
    const startVol = nativePlayer.volume;
    const curSrc = nativePlayer.currentSrc || nativePlayer.src;
    const curTime = nativePlayer.currentTime;

    userWantsPlayback = true;

    // 1. Mover la cola de la pista actual a un elemento secundario que se desvanece
    //    (no aplicable a archivos locales: loadTrack revoca su URL blob:)
    if (curSrc && !curSrc.startsWith("blob:")) {
        const outgoing = crossfadePlayer || (crossfadePlayer = new Audio());
        outgoing.src = curSrc;
        const seekAndPlay = () => {
            try { outgoing.currentTime = curTime; } catch (e) {}
            outgoing.play()
                .then(() => fadeVolume(outgoing, startVol, 0, fadeMs, () => { try { outgoing.pause(); } catch (e) {} }))
                .catch(() => {});
        };
        if (outgoing.readyState >= 1) seekAndPlay();
        else outgoing.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    }

    // 2. La pista siguiente entra en el reproductor principal (loadTrack pone crossfadeArmed=false)
    loadTrack(currentPlaylistKey, nextIndex);
    nativePlayer.volume = 0;
    nativePlayer.play()
        .then(() => {
            requestWakeLock();
            document.getElementById("player-play-btn").textContent = "⏸️";
            document.getElementById("track-disc").style.animationPlayState = "running";
            fadeVolume(nativePlayer, 0, getTargetVolume(), fadeMs);
            updateActiveSongHighlight();
        })
        .catch(() => {});
}

// Bajar/subir la música suavemente para hablar al público
function toggleDuck() {
    isDucked = !isDucked;
    const btn = document.getElementById("player-duck-btn");
    if (btn) btn.classList.toggle("active-loop", isDucked);
    const stageBtn = document.getElementById("stage-duck");
    if (stageBtn) stageBtn.classList.toggle("active-duck", isDucked);

    applyTargetVolume(500);
    showToast(isDucked ? "🔉 Música bajada para hablar" : "🔊 Música restaurada");
}

function isSpotifyPlaybackActive() {
    return activePlaybackSource === "spotify" && spotifyConnected && spotifyPlayer;
}

function setNativePlayerSource(track) {
    if (currentNativeObjectUrl) {
        URL.revokeObjectURL(currentNativeObjectUrl);
        currentNativeObjectUrl = null;
    }
    
    nativePlayer.pause();
    nativePlayer.removeAttribute("src");
    nativePlayer.load();
    
    if (track.fileObject) {
        currentNativeObjectUrl = URL.createObjectURL(track.fileObject);
        nativePlayer.removeAttribute("crossorigin");
        nativePlayer.src = currentNativeObjectUrl;
    } else {
        nativePlayer.removeAttribute("crossorigin");
        nativePlayer.src = track.url;
    }
}

function waitForNativePlayerReady() {
    if (nativePlayer.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("La pista tarda demasiado en prepararse."));
        }, 8000);
        
        function cleanup() {
            clearTimeout(timeout);
            nativePlayer.removeEventListener("canplay", onReady);
            nativePlayer.removeEventListener("loadeddata", onReady);
            nativePlayer.removeEventListener("error", onError);
        }
        
        function onReady() {
            cleanup();
            resolve();
        }
        
        function onError() {
            cleanup();
            reject(new Error(getNativePlayerErrorMessage()));
        }
        
        nativePlayer.addEventListener("canplay", onReady, { once: true });
        nativePlayer.addEventListener("loadeddata", onReady, { once: true });
        nativePlayer.addEventListener("error", onError, { once: true });
    });
}

function getNativePlayerErrorMessage(err) {
    const track = PLAYLISTS[currentPlaylistKey]?.[currentTrackIndex];
    const fileName = track?.fileObject?.name || track?.title || "esta pista";
    const browserError = nativePlayer.error;
    
    if (browserError) {
        switch (browserError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                return `Se canceló la carga de "${fileName}". Prueba a seleccionarla de nuevo.`;
            case MediaError.MEDIA_ERR_NETWORK:
                return `No se pudo leer "${fileName}". Si está en un disco externo o nube, cópiala primero al ordenador.`;
            case MediaError.MEDIA_ERR_DECODE:
                return `El navegador no puede decodificar "${fileName}". Prueba con MP3, WAV, OGG o M4A/AAC.`;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                return `El formato de "${fileName}" no es compatible aquí. Prueba con MP3, WAV, OGG o M4A/AAC.`;
        }
    }
    
    if (err?.name === "NotAllowedError") {
        return "El navegador bloqueó la reproducción automática. Pulsa de nuevo el botón de reproducir.";
    }
    
    return err?.message || `No se pudo reproducir "${fileName}". Prueba con otro archivo de audio.`;
}

function loadTrack(playlistKey, index) {
    const list = PLAYLISTS[playlistKey];
    if (!list || !list[index]) return;
    
    currentPlaylistKey = playlistKey;
    currentTrackIndex = index;
    activePlaybackSource = "native";
    crossfadeArmed = false; // nueva pista: rearmar el crossfade
    const track = list[index];
    
    setNativePlayerSource(track);
    nativePlayer.load();
    prefetchNextTrack();

    // UI Updates
    document.getElementById("track-title").textContent = track.title;
    document.getElementById("track-subtitle").textContent = `${track.artist} • ${track.tag}`;
    document.getElementById("audio-total-time").textContent = track.duration || "0:00";
    document.getElementById("audio-source-status").textContent = track.fileObject
        ? "Modo: Archivos locales activo"
        : "Modo: Reproductor web activo";
    
    // Resaltar canción activa en la lista
    updateActiveSongHighlight();

    // Sincronizar info en el modo escenario
    syncStageInfo();
}

async function playCurrentTrack() {
    const playBtn = document.getElementById("player-play-btn");
    
    // Si el usuario está escuchando Spotify, mandar orden al SDK.
    // Si ha seleccionado una pista local, siempre usamos el reproductor nativo.
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.resume();
        return;
    }
    
    if (currentTrackIndex === -1 && PLAYLISTS[currentPlaylistKey].length > 0) {
        loadTrack(currentPlaylistKey, 0);
    }

    if (currentTrackIndex !== -1) {
        userWantsPlayback = true;
        try {
            // Cancelar cualquier fundido pendiente y arrancar desde 0 para entrar suave
            if (nativePlayer._fadeTimer) { clearInterval(nativePlayer._fadeTimer); nativePlayer._fadeTimer = null; }
            const target = getTargetVolume();
            nativePlayer.volume = 0;
            await nativePlayer.play();
            initAudioContext();
            connectNativePlayerToVisualizerIfSafe();
            requestWakeLock();
            fadeVolume(nativePlayer, 0, target, 600);
            playBtn.textContent = "⏸️";
            document.getElementById("track-disc").style.animationPlayState = "running";
            updateActiveSongHighlight();
        } catch (err) {
            // AbortError ocurre cuando play() es interrumpido por pause() — no es un error real
            if (err.name === "AbortError") return;
            const message = getNativePlayerErrorMessage(err);
            console.error("Fallo al reproducir:", err, nativePlayer.error);
            document.getElementById("audio-source-status").textContent = `Error: ${message}`;
            alert(message);
        }
    }
}

function pauseCurrentTrack() {
    const playBtn = document.getElementById("player-play-btn");
    
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.pause();
        return;
    }

    userWantsPlayback = false;
    // Fundido de salida suave antes de pausar
    fadeVolume(nativePlayer, nativePlayer.volume, 0, 350, () => nativePlayer.pause());
    releaseWakeLock();
    playBtn.textContent = "▶️";
    document.getElementById("track-disc").style.animationPlayState = "paused";
}

function togglePlay() {
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.togglePlay();
        return;
    }
    // Usar la intención real, no nativePlayer.paused (que sigue false durante el fundido)
    if (userWantsPlayback) {
        pauseCurrentTrack();
    } else {
        playCurrentTrack();
    }
}

function stopTrack() {
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.pause();
        return;
    }
    userWantsPlayback = false;
    // Fundido de salida suave antes de detener y reiniciar
    fadeVolume(nativePlayer, nativePlayer.volume, 0, 300, () => {
        nativePlayer.pause();
        nativePlayer.currentTime = 0;
    });
    releaseWakeLock();
    document.getElementById("player-play-btn").textContent = "▶️";
    document.getElementById("track-disc").style.animationPlayState = "paused";
    document.getElementById("audio-progress-slider").value = 0;
    document.getElementById("visual-progress-fill").style.width = "0%";
    document.getElementById("audio-current-time").textContent = "0:00";
}

function playNext() {
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.nextTrack();
        return;
    }
    
    const playlist = PLAYLISTS[currentPlaylistKey];
    if (playlist.length === 0) return;
    
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= playlist.length) {
        nextIndex = 0; // Bucle a la primera
    }
    loadTrack(currentPlaylistKey, nextIndex);
    playCurrentTrack();
}

function playPrev() {
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.previousTrack();
        return;
    }
    
    const playlist = PLAYLISTS[currentPlaylistKey];
    if (playlist.length === 0) return;
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
        prevIndex = playlist.length - 1; // Bucle al final
    }
    loadTrack(currentPlaylistKey, prevIndex);
    playCurrentTrack();
}

// Actualizar barra de progreso del reproductor
nativePlayer.addEventListener("timeupdate", () => {
    const progressSlider = document.getElementById("audio-progress-slider");
    const progressFill = document.getElementById("visual-progress-fill");
    const currentTimeText = document.getElementById("audio-current-time");
    
    if (nativePlayer.duration) {
        const percent = (nativePlayer.currentTime / nativePlayer.duration) * 100;
        progressSlider.value = percent;
        progressFill.style.width = `${percent}%`;
        const stageFill = document.getElementById("stage-progress-fill");
        if (stageFill) stageFill.style.width = `${percent}%`;

        currentTimeText.textContent = formatTime(nativePlayer.currentTime);
        document.getElementById("audio-total-time").textContent = formatTime(nativePlayer.duration);

        // Disparar crossfade cuando falta poco para el final
        if (crossfadeDuration > 0 && !isLooping && !crossfadeArmed && activePlaybackSource === "native") {
            const remaining = nativePlayer.duration - nativePlayer.currentTime;
            const list = PLAYLISTS[currentPlaylistKey];
            if (list && list.length > 1 && remaining > 0.1 && remaining <= crossfadeDuration) {
                crossfadeArmed = true;
                startCrossfade(remaining);
            }
        }
    }
});

// Sincronizar el botón gigante de play/pausa del modo escenario con el audio real
nativePlayer.addEventListener("play", () => {
    const b = document.getElementById("stage-play");
    if (b) b.textContent = "⏸️";
});
nativePlayer.addEventListener("pause", () => {
    const b = document.getElementById("stage-play");
    if (b) b.textContent = "▶️";
});

// Al terminar la pista, reproducir la siguiente o repetir
nativePlayer.addEventListener("ended", () => {
    if (isLooping) {
        nativePlayer.currentTime = 0;
        playCurrentTrack();
    } else {
        playNext();
    }
});

// Manejador del volumen nativo y Spotify
document.getElementById("master-volume-slider").addEventListener("input", (e) => {
    const vol = parseFloat(e.target.value);
    const effective = isDucked ? vol * 0.15 : vol;
    // Cancelar fundido en curso para que el slider mande
    if (nativePlayer._fadeTimer) { clearInterval(nativePlayer._fadeTimer); nativePlayer._fadeTimer = null; }
    nativePlayer.volume = effective;
    document.getElementById("master-volume-text").textContent = `${Math.round(vol * 100)}%`;
    localStorage.setItem("samadry_volume", String(vol));
    if (spotifyConnected && spotifyPlayer) {
        spotifyPlayer.setVolume(effective);
    }
});

// Restaurar el volumen guardado de sesiones anteriores
(function restoreSavedVolume() {
    const saved = localStorage.getItem("samadry_volume");
    if (saved === null) return;
    const vol = parseFloat(saved);
    if (isNaN(vol)) return;
    const slider = document.getElementById("master-volume-slider");
    slider.value = vol;
    nativePlayer.volume = vol;
    document.getElementById("master-volume-text").textContent = `${Math.round(vol * 100)}%`;
})();

// Buscar en el reproductor al mover el control deslizante
document.getElementById("audio-progress-slider").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.getCurrentState().then(state => {
            if (state) {
                const targetMs = (val / 100) * state.duration;
                spotifyPlayer.seek(targetMs);
            }
        });
        return;
    }
    if (nativePlayer.duration) {
        const targetTime = (val / 100) * nativePlayer.duration;
        nativePlayer.currentTime = targetTime;
        document.getElementById("visual-progress-fill").style.width = `${val}%`;
    }
});


// --- SHOW SEGMENTS TIMER MODULE ---
let totalShowDurationMinutes = 90;
let showStartTime = null;
let showElapsedTime = 0; // segundos acumulados
let showTimerInterval = null;
let currentSegmentIdx = 0;
let segmentsData = [];

// Definición de estructura de shows por duración
const SHOW_STRUCTURES = {
    "60": [
        { name: "Presentación y Bienvenida 👋", pct: 15, durationSec: 9 * 60 },
        { name: "Juegos Musicales Marchosos 🏃‍♂️", pct: 60, durationSec: 36 * 60 },
        { name: "Soplar Velas y Tarta 🎂", pct: 15, durationSec: 9 * 60 },
        { name: "Despedida y Fotos 📸", pct: 10, durationSec: 6 * 60 }
    ],
    "90": [
        { name: "Presentación y Pintacaras 🎨", pct: 15, durationSec: 13.5 * 60 },
        { name: "Juegos Infantiles y Bailes 💃", pct: 55, durationSec: 49.5 * 60 },
        { name: "Momento Tarta y Regalos 🎁", pct: 18, durationSec: 16.2 * 60 },
        { name: "Despedida y Globoflexia 🎈", pct: 12, durationSec: 10.8 * 60 }
    ],
    "120": [
        { name: "Bienvenida y Pintacaras 🎨", pct: 15, durationSec: 18 * 60 },
        { name: "Juegos Musicales - Bloque 1 🎵", pct: 35, durationSec: 42 * 60 },
        { name: "Espectáculo / Magia / Títeres 🧙‍♂️", pct: 25, durationSec: 30 * 60 },
        { name: "Tarta, Regalos y Fotos 📸", pct: 15, durationSec: 18 * 60 },
        { name: "Mini Disco de Cierre 🕺", pct: 10, durationSec: 12 * 60 }
    ]
};

function setupShowTimers() {
    const durationSelect = document.getElementById("show-duration-select");
    totalShowDurationMinutes = parseInt(durationSelect.value);
    
    // Establecer etiqueta de tiempo total
    const chronoTotalEl = document.getElementById("chrono-total-time");
    if (chronoTotalEl) chronoTotalEl.textContent = `Total: ${totalShowDurationMinutes}:00`;
    
    // Cargar tramos
    const rawSegments = SHOW_STRUCTURES[totalShowDurationMinutes.toString()];
    segmentsData = rawSegments.map(s => ({
        ...s,
        elapsedSec: 0,
        completed: false
    }));
    
    currentSegmentIdx = 0;
    renderSegmentsList();
}

function renderSegmentsList() {
    const listEl = document.getElementById("segments-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    
    segmentsData.forEach((seg, idx) => {
        const item = document.createElement("div");
        item.className = `segment-item ${idx === currentSegmentIdx && showTimerInterval ? 'active' : ''}`;
        if (seg.completed) item.classList.add("completed");
        
        const remSec = Math.max(0, seg.durationSec - seg.elapsedSec);
        const percent = (seg.elapsedSec / seg.durationSec) * 100;
        
        // Alerta si falta menos de 2 minutos y está activo
        if (idx === currentSegmentIdx && showTimerInterval && remSec > 0 && remSec <= 120) {
            item.classList.add("warning-active");
        }
        
        item.innerHTML = `
            <div class="segment-main-info">
                <span class="segment-name">${seg.name}</span>
                <span class="segment-timer">${formatTime(remSec)}</span>
            </div>
            <div class="segment-progress">
                <div class="segment-progress-fill" style="width: ${percent}%;"></div>
            </div>
        `;
        
        // Permitir clic para saltar directamente a un segmento
        item.addEventListener("click", () => {
            if (confirm(`¿Deseas saltar al tramo "${seg.name}"?`)) {
                activateSegment(idx);
            }
        });
        
        listEl.appendChild(item);
    });
}

function activateSegment(idx) {
    if (idx < 0 || idx >= segmentsData.length) return;
    
    // Marcar anteriores como completos
    for (let i = 0; i < idx; i++) {
        segmentsData[i].completed = true;
        segmentsData[i].elapsedSec = segmentsData[i].durationSec;
    }
    // Marcar siguientes como pendientes
    for (let i = idx; i < segmentsData.length; i++) {
        segmentsData[i].completed = false;
        if (i > idx) segmentsData[i].elapsedSec = 0;
    }
    
    currentSegmentIdx = idx;
    
    // Ajustar cronómetro general al inicio de este segmento
    let newElapsed = 0;
    for (let i = 0; i < idx; i++) {
        newElapsed += segmentsData[i].durationSec;
    }
    showElapsedTime = newElapsed;
    
    updateChronometerUI();
    renderSegmentsList();
}

function updateChronometerUI() {
    const hours = Math.floor(showElapsedTime / 3600);
    const mins = Math.floor((showElapsedTime % 3600) / 60);
    const secs = showElapsedTime % 60;
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const chronoTimeEl = document.getElementById("chrono-time");
    if (chronoTimeEl) chronoTimeEl.textContent = timeStr;

    const totalSecs = totalShowDurationMinutes * 60;
    const progressPct = (showElapsedTime / totalSecs) * 100;
    const chronoProgressEl = document.getElementById("chrono-progress");
    if (chronoProgressEl) chronoProgressEl.style.width = `${Math.min(100, progressPct)}%`;
}

function startShowTimer() {
    if (showTimerInterval) return;
    
    initAudioContext();
    showTimerInterval = setInterval(() => {
        showElapsedTime++;
        updateChronometerUI();
        
        // Avanzar el tiempo del segmento actual
        const curSeg = segmentsData[currentSegmentIdx];
        if (curSeg) {
            curSeg.elapsedSec++;
            
            // Si el segmento actual termina, pasar al siguiente
            if (curSeg.elapsedSec >= curSeg.durationSec) {
                curSeg.completed = true;
                curSeg.elapsedSec = curSeg.durationSec;
                
                // Efecto de aviso sonoro (Ding sutil)
                playDingSynth();
                
                if (currentSegmentIdx < segmentsData.length - 1) {
                    currentSegmentIdx++;
                } else {
                    // Fin del show
                    pauseShowTimer();
                    alert("¡Fin del show! Felicidades por una gran animación 🥳");
                }
            }
        }
        
        renderSegmentsList();
    }, 1000);
    
    document.getElementById("chrono-start-btn")?.setAttribute("disabled", true);
    document.getElementById("chrono-pause-btn")?.removeAttribute("disabled");
    if (document.getElementById("chrono-status")) {
        document.getElementById("chrono-status").textContent = "En Vivo";
        document.getElementById("chrono-status").style.color = "var(--neon-green-real)";
    }
    
    renderSegmentsList();
}

function pauseShowTimer() {
    if (showTimerInterval) {
        clearInterval(showTimerInterval);
        showTimerInterval = null;
    }
    document.getElementById("chrono-start-btn")?.removeAttribute("disabled");
    document.getElementById("chrono-pause-btn")?.setAttribute("disabled", true);
    if (document.getElementById("chrono-status")) {
        document.getElementById("chrono-status").textContent = "Pausado";
        document.getElementById("chrono-status").style.color = "var(--neon-yellow)";
    }
    
    renderSegmentsList();
}

function resetShowTimer() {
    if (confirm("¿Estás seguro de que deseas reiniciar los temporizadores del show? Esto restablecerá todos los tramos.")) {
        pauseShowTimer();
        showElapsedTime = 0;
        updateChronometerUI();
        setupShowTimers();
    }
}


// --- PLAYLIST UI & TABS ---
function switchPlaylistTab(tabId) {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
    });
    
    const activeTab = document.getElementById(tabId);
    if (!activeTab) return;
    activeTab.classList.add("active");
    activeTab.setAttribute("aria-selected", "true");
    
    const key = tabId.replace("tab-", "");
    currentPlaylistKey = key;

    // Salir de la vista de búsqueda/favoritos al elegir una pestaña
    viewMode = "tabs";
    searchQuery = "";
    const searchInput = document.getElementById("song-search");
    if (searchInput) searchInput.value = "";
    const favBtn = document.getElementById("fav-toggle-btn");
    if (favBtn) favBtn.classList.remove("active");

    // Ocultar / Mostrar zona de subida local (elemento opcional, puede no existir)
    const uploader = document.getElementById("local-uploader-area");
    if (uploader) {
        if (key === "locales") {
            uploader.classList.remove("hidden");
        } else {
            uploader.classList.add("hidden");
        }
    }
    
    renderSongsList();

    // Auto-cambiar soundboard según la temática de la playlist
    const thematicSounds = THEMATIC_SOUNDS[key];
    const themeLabel = SOUNDBOARD_THEME_LABELS[key] || "🎉 Genérico";
    renderSoundboard(thematicSounds || GENERIC_SOUNDS, themeLabel);
    renderStagePlaylists();
}

function getPlaylistLabel(key) {
    const labels = {
        juegos: "Juegos Generica",
        piratas: "Piratas",
        exploradores: "Exploradores",
        bluey: "Bluey",
        kpop: "Kpop",
        spiderman: "Spiderman",
        locales: "Mis MP3"
    };
    
    return labels[key] || key;
}

// ============================================================
// BUSCADOR Y FAVORITOS
// ============================================================
let viewMode = "tabs"; // "tabs" | "search" | "favorites"
let searchQuery = "";
let favorites = new Set(JSON.parse(localStorage.getItem("samadry_favorites") || "[]"));

function songKey(song) {
    return song.url || `${song.title}|${song.artist}`;
}
function isFavorite(song) {
    return favorites.has(songKey(song));
}
function toggleFavorite(song) {
    const k = songKey(song);
    if (favorites.has(k)) favorites.delete(k);
    else favorites.add(k);
    localStorage.setItem("samadry_favorites", JSON.stringify([...favorites]));
}

// Constructor de fila de canción reutilizado por las 3 vistas
function buildSongItem(song, key, index, showPlaylistLabel) {
    song.playlistSource = key;
    const isActive = currentTrackIndex === index && currentPlaylistKey === key;
    const playing = isActive && !nativePlayer.paused;
    const tagText = showPlaylistLabel ? getPlaylistLabel(key) : (song.tag || song.artist);

    const item = document.createElement("div");
    item.className = `song-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `
        <span class="song-number">${String(index + 1).padStart(2, '0')}</span>
        <span class="song-play-icon">${playing ? '🔊' : '▶️'}</span>
        <div class="song-details">
            <div class="song-title">${song.title}</div>
            <span class="song-tag">${tagText}</span>
        </div>
        <span class="song-duration">${song.duration || ''}</span>
        <button class="song-fav ${isFavorite(song) ? 'is-fav' : ''}" title="Marcar favorita">${isFavorite(song) ? '⭐' : '☆'}</button>
    `;

    item.querySelector(".song-fav").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(song);
        refreshCurrentView();
    });

    item.addEventListener("click", () => {
        if (currentTrackIndex === index && currentPlaylistKey === key) {
            togglePlay();
        } else {
            exitSearchView();
            loadTrack(key, index);
            const tabBtn = document.getElementById(`tab-${key}`);
            if (tabBtn) switchPlaylistTab(`tab-${key}`);
            else renderSongsList();
            playCurrentTrack();
        }
    });

    return item;
}

function searchAllSongs(q) {
    const query = q.trim().toLowerCase();
    const res = [];
    Object.keys(PLAYLISTS).forEach((key) => {
        if (key === "locales") return;
        PLAYLISTS[key].forEach((song, index) => {
            const hay = `${song.title} ${song.artist} ${song.tag || ""}`.toLowerCase();
            if (hay.includes(query)) res.push({ song, key, index });
        });
    });
    return res;
}

function getAllFavoriteSongs() {
    const res = [];
    Object.keys(PLAYLISTS).forEach((key) => {
        if (key === "locales") return;
        PLAYLISTS[key].forEach((song, index) => {
            if (isFavorite(song)) res.push({ song, key, index });
        });
    });
    return res;
}

function renderResultsList(items, emptyMsg) {
    const listEl = document.getElementById("playlist-content");
    listEl.innerHTML = "";
    if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><p style="text-align:center;color:var(--text-secondary);padding:30px 10px;font-size:.85rem;">${emptyMsg}</p></div>`;
        return;
    }
    items.forEach(({ song, key, index }) => listEl.appendChild(buildSongItem(song, key, index, true)));
}

function refreshCurrentView() {
    if (viewMode === "search") {
        renderResultsList(searchAllSongs(searchQuery), `Sin resultados para «${searchQuery}»`);
    } else if (viewMode === "favorites") {
        renderResultsList(getAllFavoriteSongs(), "Aún no tienes favoritas.<br>Pulsa la ☆ junto a una canción para guardarla.");
    } else {
        renderSongsList();
    }
}

function exitSearchView() {
    viewMode = "tabs";
    searchQuery = "";
    const si = document.getElementById("song-search");
    if (si) si.value = "";
    const fb = document.getElementById("fav-toggle-btn");
    if (fb) fb.classList.remove("active");
}

function renderSongsList() {
    const listEl = document.getElementById("playlist-content");
    listEl.innerHTML = "";

    const songs = PLAYLISTS[currentPlaylistKey];

    if (!songs || songs.length === 0) {
        if (currentPlaylistKey === "locales") {
            listEl.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: var(--text-secondary); padding: 30px 10px; font-size: 0.85rem;">
                        No has cargado archivos aún.<br>Utiliza la zona de abajo para cargar tus MP3 locales de Mundo Samadry o hits de radio.
                    </p>
                </div>
            `;
        } else {
            listEl.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: var(--text-secondary); padding: 30px 10px; font-size: 0.85rem;">
                        La lista "${getPlaylistLabel(currentPlaylistKey)}" aun no tiene canciones.<br>
                        Subelas al hosting y anadelas a playlists.json.
                    </p>
                </div>
            `;
        }
        return;
    }

    songs.forEach((song, idx) => {
        listEl.appendChild(buildSongItem(song, currentPlaylistKey, idx, false));
    });
}

function updateActiveSongHighlight() {
    // El resaltado por índice solo es fiable en la vista de pestañas
    if (viewMode !== "tabs") return;
    // Buscar todos los elementos de canción y actualizar
    const items = document.querySelectorAll(".song-item");
    items.forEach((item, idx) => {
        const songs = PLAYLISTS[currentPlaylistKey];
        const song = songs[idx];
        if (song && currentTrackIndex === idx && currentPlaylistKey === song.playlistSource) {
            item.classList.add("active");
            item.querySelector(".song-play-icon").textContent = nativePlayer.paused ? '▶️' : '🔊';
        } else {
            item.classList.remove("active");
            if (item.querySelector(".song-play-icon")) {
                item.querySelector(".song-play-icon").textContent = '▶️';
            }
        }
    });
}


// --- LOCAL AUDIO FILE UPLOADER (opcional, solo si existe el elemento en el HTML) ---
const dropZone = document.getElementById("drop-zone");
const localFileInput = document.getElementById("local-file-input");

if (dropZone && localFileInput) {
    dropZone.addEventListener("click", () => localFileInput.click());

    localFileInput.addEventListener("change", (e) => {
        handleLocalFiles(e.target.files);
    });

    // Drag & Drop
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            handleLocalFiles(e.dataTransfer.files);
        }
    });
}

function handleLocalFiles(files) {
    const skippedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isUsableAudioFile(file)) {
            // Crear elemento de pista
            const track = {
                title: file.name.replace(/\.[^/.]+$/, ""), // Quitar extensión
                artist: "Archivo Local",
                duration: "Cargando...",
                fileObject: file,
                tag: "Mis MP3"
            };
            
            // Obtener duración leyendo temporalmente con elemento Audio
            const metadataUrl = URL.createObjectURL(file);
            const tempAudio = new Audio(metadataUrl);
            tempAudio.addEventListener("loadedmetadata", () => {
                track.duration = formatTime(tempAudio.duration);
                URL.revokeObjectURL(metadataUrl);
                renderSongsList(); // Refrescar lista con la duración correcta
            });
            tempAudio.addEventListener("error", () => {
                track.duration = "N/D";
                URL.revokeObjectURL(metadataUrl);
                renderSongsList();
            });
            
            PLAYLISTS.locales.push(track);
        } else {
            skippedFiles.push(file.name);
        }
    }
    
    // Cambiar a pestaña local si no estaba en ella
    switchPlaylistTab("tab-locales");
    
    if (skippedFiles.length > 0) {
        alert(`Estos archivos no son compatibles con este navegador:\n\n${skippedFiles.join("\n")}\n\nPrueba con MP3, WAV, OGG o M4A/AAC.`);
    }
    
    saveLocalsToIndexedDB(files); // Persistencia opcional
}


// --- CUSTOM SFX BINDER ---
const sfxFileInput = document.getElementById("sfx-file-input");
const sfxSelectToBind = document.getElementById("sfx-select-to-bind");
const sfxResetBtn = document.getElementById("sfx-reset-all-btn");

sfxFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("audio/")) {
        const sfxId = sfxSelectToBind.value;
        customSfxBlobs[sfxId] = file;
        
        // Cambiar el estilo visual del pad para indicar que está personalizado
        const pad = document.querySelector(`.sound-pad[data-sound="${sfxId}"]`);
        if (pad) {
            pad.classList.add("customized");
            pad.style.borderStyle = "dashed";
            pad.querySelector(".pad-name").textContent = `* ${pad.querySelector(".pad-name").textContent.replace("*", "").trim()}`;
        }
        
        saveCustomSFXToDB(sfxId, file);
    }
});

sfxResetBtn.addEventListener("click", () => {
    if (confirm("¿Deseas restaurar todos los sonidos sintéticos de fábrica?")) {
        customSfxBlobs = {};
        const pads = document.querySelectorAll(".sound-pad");
        pads.forEach(pad => {
            pad.classList.remove("customized");
            pad.style.borderStyle = "solid";
            const nameEl = pad.querySelector(".pad-name");
            nameEl.textContent = nameEl.textContent.replace("*", "").trim();
        });
        clearCustomSFXDB();
    }
});


// --- INDEXEDDB FOR OFFLINE PERSISTENCE ---
const DB_NAME = "SamadryPlayerDB";
const DB_VERSION = 1;

function openDB(callback) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("customSfx")) {
            db.createObjectStore("customSfx");
        }
    };
    request.onsuccess = (e) => {
        callback(e.target.result);
    };
    request.onerror = (err) => {
        console.error("IndexedDB error:", err);
    };
}

function saveCustomSFXToDB(sfxId, fileBlob) {
    openDB((db) => {
        const tx = db.transaction("customSfx", "readwrite");
        const store = tx.objectStore("customSfx");
        store.put(fileBlob, sfxId);
    });
}

function loadCustomSFXFromDB() {
    openDB((db) => {
        const tx = db.transaction("customSfx", "readonly");
        const store = tx.objectStore("customSfx");
        const cursorRequest = store.openCursor();
        
        cursorRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const sfxId = cursor.key;
                const blob = cursor.value;
                customSfxBlobs[sfxId] = blob;
                
                // Actualizar UI
                const pad = document.querySelector(`.sound-pad[data-sound="${sfxId}"]`);
                if (pad) {
                    pad.classList.add("customized");
                    pad.style.borderStyle = "dashed";
                    const nameEl = pad.querySelector(".pad-name");
                    if (!nameEl.textContent.includes("*")) {
                        nameEl.textContent = `* ${nameEl.textContent}`;
                    }
                }
                cursor.continue();
            }
        };
    });
}

function clearCustomSFXDB() {
    openDB((db) => {
        const tx = db.transaction("customSfx", "readwrite");
        const store = tx.objectStore("customSfx");
        store.clear();
    });
}

// Persistir archivos locales si se desea (opcional)
function saveLocalsToIndexedDB(files) {
    // Almacenamiento local temporal en RAM por pestaña. No persistimos listas pesadas de música
    // para no llenar la cuota del navegador, pero se indica en el README.
}


// --- NOTES STORAGE ---
const liveNotes = document.getElementById("live-notes");

liveNotes.value = localStorage.getItem("samadry_notes") || "";

liveNotes.addEventListener("input", (e) => {
    localStorage.setItem("samadry_notes", e.target.value);
});


// --- SOUNDBAR CANVAS VISUALIZER ---
let visualizerAnimationId = null;

function startVisualizer() {
    const canvas = document.getElementById("audio-visualizer");
    const ctx = canvas.getContext("2d");
    
    // Redimensionar canvas al contenedor
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        visualizerAnimationId = requestAnimationFrame(draw);
        
        let isSpotifyActive = spotifyConnected && document.getElementById("track-disc").style.animationPlayState === "running";
        
        if (isSpotifyActive) {
            // Generar ecualizador visual simulado ultra-reactivo para Spotify
            ctx.fillStyle = "rgba(9, 9, 14, 0.2)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / 64) * 1.5;
            let x = 0;
            const time = Date.now() * 0.006;
            
            for (let i = 0; i < 64; i++) {
                const w1 = Math.sin(i * 0.12 + time);
                const w2 = Math.cos(i * 0.08 - time * 0.4);
                const barHeight = Math.abs(w1 * w2) * canvas.height * 0.85 * (0.35 + Math.random() * 0.65);
                
                const percent = i / 64;
                const r = Math.round(255 * percent);
                
                ctx.fillStyle = `rgba(${r + 100}, 50, 255, 0.45)`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(${r + 100}, 50, 255, 0.65)`;
                ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 3, barHeight);
                x += barWidth;
            }
            return;
        }
        
        analyserNode.getByteFrequencyData(dataArray);
        
        ctx.fillStyle = "rgba(9, 9, 14, 0.2)"; // Ligera transparencia para estela
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;
        
        // Dibujar barras simétricas estilo ecualizador de ondas
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
            
            // Generar degradado dinámico de la barra
            const percent = i / bufferLength;
            const r = Math.round(255 * percent);
            const g = Math.round(0);
            const b = Math.round(255 * (1 - percent));
            
            ctx.fillStyle = `rgba(${r + 100}, ${g + 50}, 255, 0.4)`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${r + 100}, ${g + 50}, 255, 0.6)`;
            
            // Dibujar barra centrada verticalmente
            ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 3, barHeight);
            
            x += barWidth;
        }
    }
    
    draw();
}


// --- UTILS: TIME FORMATTING ---
function formatTime(secs) {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function getAudioMimeFromFileName(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const mimeByExt = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        oga: "audio/ogg",
        m4a: "audio/mp4",
        aac: "audio/aac",
        flac: "audio/flac"
    };
    
    return mimeByExt[ext] || "";
}

function isUsableAudioFile(file) {
    const mime = file.type || getAudioMimeFromFileName(file.name);
    if (!mime.startsWith("audio/")) return false;
    
    return nativePlayer.canPlayType(mime) !== "";
}


// --- EVENT LISTENERS & HOTKEYS ---

// Cambiar la duración del show en el selector
document.getElementById("show-duration-select").addEventListener("change", () => {
    setupShowTimers();
});

// Botones del Cronómetro General
document.getElementById("chrono-start-btn")?.addEventListener("click", startShowTimer);
document.getElementById("chrono-pause-btn")?.addEventListener("click", pauseShowTimer);
document.getElementById("chrono-reset-btn")?.addEventListener("click", resetShowTimer);

// Botones del Reproductor Principal
document.getElementById("player-play-btn").addEventListener("click", togglePlay);
document.getElementById("player-prev-btn").addEventListener("click", playPrev);
document.getElementById("player-next-btn").addEventListener("click", playNext);
document.getElementById("player-stop-btn").addEventListener("click", stopTrack);

// Botón "bajar para hablar" (ducking)
document.getElementById("player-duck-btn")?.addEventListener("click", toggleDuck);

// Modo Escenario
document.getElementById("stage-mode-btn")?.addEventListener("click", openStageMode);
document.getElementById("stage-exit-btn")?.addEventListener("click", closeStageMode);
document.getElementById("stage-prev")?.addEventListener("click", playPrev);
document.getElementById("stage-next")?.addEventListener("click", playNext);
document.getElementById("stage-play")?.addEventListener("click", togglePlay);
document.getElementById("stage-duck")?.addEventListener("click", toggleDuck);
document.getElementById("stage-voice")?.addEventListener("click", () => toggleVoiceAssistant());
document.getElementById("stage-voice-commands")?.addEventListener("click", openVoiceCommands);
document.getElementById("stage-tarta")?.addEventListener("click", async () => {
    loadTrack("tarta", 0);
    await playCurrentTrack();
});
document.getElementById("stage-mundo")?.addEventListener("click", async () => {
    loadTrack("mundo_samadry", 0);
    await playCurrentTrack();
});

// Selector de crossfade
const crossfadeSelect = document.getElementById("crossfade-select");
if (crossfadeSelect) {
    crossfadeSelect.value = String(crossfadeDuration);
    crossfadeSelect.addEventListener("change", (e) => {
        crossfadeDuration = parseFloat(e.target.value);
        localStorage.setItem("samadry_crossfade", String(crossfadeDuration));
        showToast(crossfadeDuration > 0 ? `Crossfade: ${crossfadeDuration}s` : "Crossfade desactivado");
    });
}

// Botón de Loop
const loopBtn = document.getElementById("player-loop-btn");
loopBtn.addEventListener("click", () => {
    isLooping = !isLooping;
    if (isLooping) {
        loopBtn.classList.add("active-loop");
    } else {
        loopBtn.classList.remove("active-loop");
    }
});

// Pantalla Completa
document.getElementById("fullscreen-btn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error al intentar activar pantalla completa: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Pestañas de Playlist
["juegos", "piratas", "exploradores", "bluey", "kpop", "spiderman"].forEach((key) => {
    document.getElementById(`tab-${key}`).addEventListener("click", () => switchPlaylistTab(`tab-${key}`));
});

// Buscador de canciones (en todas las listas)
document.getElementById("song-search")?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    const favBtn = document.getElementById("fav-toggle-btn");
    if (favBtn) favBtn.classList.remove("active");
    if (searchQuery.trim()) {
        viewMode = "search";
        renderResultsList(searchAllSongs(searchQuery), `Sin resultados para «${searchQuery}»`);
    } else {
        viewMode = "tabs";
        renderSongsList();
    }
});

// Botón de favoritas (mostrar/ocultar la vista de favoritas)
document.getElementById("fav-toggle-btn")?.addEventListener("click", () => {
    const favBtn = document.getElementById("fav-toggle-btn");
    if (viewMode === "favorites") {
        viewMode = "tabs";
        favBtn.classList.remove("active");
        renderSongsList();
    } else {
        viewMode = "favorites";
        favBtn.classList.add("active");
        const si = document.getElementById("song-search");
        if (si) si.value = "";
        searchQuery = "";
        renderResultsList(getAllFavoriteSongs(), "Aún no tienes favoritas.<br>Pulsa la ☆ junto a una canción para guardarla.");
    }
});

// Botones de acceso rápido
document.getElementById("btn-tarta")?.addEventListener("click", async () => {
    loadTrack("tarta", 0);
    await playCurrentTrack();
});
document.getElementById("btn-mundo-samadry")?.addEventListener("click", async () => {
    loadTrack("mundo_samadry", 0);
    await playCurrentTrack();
});

// Asignar triggers a los botones de la Soundboard
const soundPads = document.querySelectorAll(".sound-pad");
soundPads.forEach(pad => {
    pad.addEventListener("click", () => {
        const soundId = pad.getAttribute("data-sound");
        triggerSFX(soundId);
        
        // Animación visual de disparo
        pad.classList.add("triggered");
        setTimeout(() => pad.classList.remove("triggered"), 150);
    });
});

// --- BINDINGS: SPEECH ASSISTANT AND SPOTIFY SETTINGS ---
const voiceBtn = document.getElementById("voice-assistant-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const spotifyConnectBtn = document.getElementById("spotify-connect-btn");
const spotifyClientIdInput = document.getElementById("spotify-client-id");
const voiceCommandsModal = document.getElementById("voice-commands-modal");

// Toggles para el asistente de voz
voiceBtn.addEventListener("click", () => {
    toggleVoiceAssistant();
});

document.getElementById("voice-commands-btn")?.addEventListener("click", openVoiceCommands);
document.getElementById("close-voice-commands-btn")?.addEventListener("click", closeVoiceCommands);
document.getElementById("add-voice-command-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const phraseInput = document.getElementById("new-voice-phrase");
    const actionSelect = document.getElementById("new-voice-action");
    const phrase = phraseInput.value.trim();
    const normalizedPhrase = normalizeVoiceText(phrase);
    if (normalizedPhrase.length < 3) {
        showToast("Escribe una frase un poco más larga");
        return;
    }

    const commands = getCustomVoiceCommands();
    const definition = VOICE_COMMAND_DEFINITIONS.find((item) => item.id === actionSelect.value);
    const duplicate = commands.some((command) =>
        command.actionId === actionSelect.value && normalizeVoiceText(command.phrase) === normalizedPhrase
    ) || definition?.phrases.some((defaultPhrase) => normalizeVoiceText(defaultPhrase) === normalizedPhrase);
    if (duplicate) {
        showToast("Esa frase ya está añadida a esta función");
        return;
    }

    commands.push({ phrase, actionId: actionSelect.value });
    saveCustomVoiceCommands(commands);
    phraseInput.value = "";
    renderVoiceCommands();
    showToast("Nuevo comando de voz guardado");
});

// Controladores del Modal de Ajustes
settingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
});

// Cerrar modal al hacer clic fuera del card
window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add("hidden");
    }
    if (e.target === voiceCommandsModal) {
        closeVoiceCommands();
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !voiceCommandsModal?.classList.contains("hidden")) {
        closeVoiceCommands();
    }
});

// Guardar Client ID de Spotify
saveSettingsBtn.addEventListener("click", () => {
    const clientId = spotifyClientIdInput.value.trim();
    if (clientId) {
        localStorage.setItem("spotify_client_id", clientId);
        alert("Client ID guardado correctamente en este dispositivo.");
    } else {
        localStorage.removeItem("spotify_client_id");
        alert("Client ID eliminado.");
    }
});

// Iniciar sesión en Spotify OAuth con PKCE
spotifyConnectBtn.addEventListener("click", async () => {
    const clientId = spotifyClientIdInput.value.trim();
    if (!clientId) {
        alert("Por favor introduce un Spotify Client ID válido antes de conectar.");
        return;
    }
    localStorage.setItem("spotify_client_id", clientId);
    
    const codeVerifier = generateRandomString(64);
    const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
    const state = generateRandomString(16);
    localStorage.setItem("spotify_code_verifier", codeVerifier);
    localStorage.setItem("spotify_auth_state", state);
    
    const redirectUri = getSpotifyRedirectUri();
    const scopes = "streaming user-read-playback-state user-modify-playback-state";
    const authParams = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state,
        show_dialog: "true"
    });
    
    window.location.href = `https://accounts.spotify.com/authorize?${authParams.toString()}`;
});

// --- ATADOS DE TECLADO (HOTKEYS) ---
window.addEventListener("keydown", (e) => {
    // Escape: salir del Modo Escenario (funciona aunque haya un campo enfocado)
    if (e.key === "Escape") {
        const sm = document.getElementById("stage-mode");
        if (sm && !sm.classList.contains("hidden")) {
            closeStageMode();
            return;
        }
    }

    // Si el usuario está escribiendo en el cuadro de notas, no capturar atajos
    if (document.activeElement === liveNotes || document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") {
        return;
    }

    // Barra espaciadora: Play/Pause reproductor
    if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
    }
    
    // Teclas 1-9: Banco de Sonidos
    const key = e.key;
    if (key >= "1" && key <= "9") {
        const pad = document.querySelector(`.sound-pad[data-key="${key}"]`);
        if (pad) {
            pad.click(); // Simula el click y dispara la animación y audio
        }
    }
});


// --- INITIALIZATION ---
// ============================================================
// PWA: SERVICE WORKER, OFFLINE, WAKE LOCK, INSTALACIÓN
// ============================================================

// --- Registro del Service Worker ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js")
            .then((reg) => console.log("Service Worker registrado:", reg.scope))
            .catch((err) => console.warn("No se pudo registrar el Service Worker:", err));
    });

    // Escuchar progreso de la pre-descarga de audio
    navigator.serviceWorker.addEventListener("message", (event) => {
        const data = event.data || {};
        const btn = document.getElementById("download-offline-btn");
        if (data.type === "PRECACHE_PROGRESS" && btn) {
            btn.textContent = `${data.done}/${data.total}`;
        }
        if (data.type === "PRECACHE_DONE") {
            if (btn) {
                btn.textContent = "✅";
                setTimeout(() => { btn.textContent = "⬇️"; }, 3000);
            }
            const failed = data.failed || 0;
            showToast(failed
                ? `Descarga terminada: ${data.total - failed} guardadas y ${failed} con error`
                : `✅ ${data.total} pista(s) disponibles sin conexión`);
            updateOfflineStatus();
        }
    });
}

// --- Wake Lock: mantener la pantalla encendida durante el show ---
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch (err) {
        // Algunos navegadores la bloquean si la pestaña no está activa; no es crítico
        console.warn("Wake Lock no disponible:", err.message);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
    }
}

// Re-adquirir el bloqueo al volver a la app si seguía reproduciéndose
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !nativePlayer.paused) {
        requestWakeLock();
    }
});

// --- Precarga de la siguiente pista (transición sin huecos) ---
function prefetchNextTrack() {
    const playlist = PLAYLISTS[currentPlaylistKey];
    if (!playlist || playlist.length < 2) return;

    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= playlist.length) nextIndex = 0;

    const track = playlist[nextIndex];
    if (track && track.url && !track.fileObject) {
        // Disparar fetch: el Service Worker lo guardará en caché de audio
        fetch(track.url).catch(() => {});
    }
}

// --- Descargar todas las canciones para uso sin conexión ---
function collectAllAudioUrls() {
    const urls = new Set();
    Object.keys(PLAYLISTS).forEach((key) => {
        PLAYLISTS[key].forEach((t) => {
            if (t.url && !t.fileObject) urls.add(t.url);
        });
    });
    Object.values(hostedSfxUrls || {}).forEach((u) => urls.add(u));
    return [...urls];
}

function collectPlaylistAudioUrls(key) {
    return (PLAYLISTS[key] || [])
        .filter((track) => track.url && !track.fileObject)
        .map((track) => track.url);
}

async function updateOfflineStatus() {
    const badge = document.getElementById("network-status");
    if (!badge) return;
    badge.textContent = navigator.onLine ? "Online" : "Sin conexión";
    badge.classList.toggle("offline", !navigator.onLine);
}

function requestOfflineDownload(urls, label) {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
        showToast("Recarga la página una vez para activar el modo offline.");
        return;
    }
    if (urls.length === 0) {
        showToast("Esta lista todavía no tiene canciones.");
        return;
    }
    showToast(`Descargando ${label}: ${urls.length} pista(s)...`);
    navigator.serviceWorker.controller.postMessage({ type: "PRECACHE_AUDIO", urls });
}

function downloadForOffline() {
    const urls = collectAllAudioUrls();
    requestOfflineDownload(urls, "toda la música");
}

function downloadCurrentPlaylistForOffline() {
    requestOfflineDownload(collectPlaylistAudioUrls(currentPlaylistKey), getPlaylistLabel(currentPlaylistKey));
}

document.getElementById("download-offline-btn")?.addEventListener("click", downloadForOffline);
document.getElementById("stage-download")?.addEventListener("click", downloadCurrentPlaylistForOffline);
window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);
updateOfflineStatus();

// --- Prompt de instalación de la PWA ---
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById("install-app-btn");
    if (installBtn) installBtn.style.display = "";
});

document.getElementById("install-app-btn")?.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
        showToast("📲 ¡App instalada!");
        document.getElementById("install-app-btn").style.display = "none";
    }
    deferredInstallPrompt = null;
});

window.addEventListener("appinstalled", () => {
    const installBtn = document.getElementById("install-app-btn");
    if (installBtn) installBtn.style.display = "none";
});


// Inyectar estilos dinámicos (evita depender de la subida de index.css al hosting)
document.head.insertAdjacentHTML('beforeend', `<style>
.song-number{font-size:.7rem;font-weight:700;color:var(--text-secondary);min-width:22px;margin-right:6px;font-variant-numeric:tabular-nums;opacity:.6}
.song-item.active .song-number{color:var(--neon-cyan);opacity:1}
.soundboard-theme-badge{display:inline-block;font-size:.62rem;font-weight:600;padding:2px 8px;border-radius:20px;background:rgba(157,78,221,.18);border:1px solid rgba(157,78,221,.4);color:#c77dff;letter-spacing:.03em;vertical-align:middle;margin-left:6px;transition:background .3s,color .3s}
/* Buscador y favoritos */
.song-search-bar{display:flex;gap:8px;margin-bottom:10px}
#song-search{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;padding:9px 12px;font-size:.9rem;outline:none}
#song-search::placeholder{color:#9aa6c0}
#song-search:focus{border-color:#9d4edd}
#fav-toggle-btn{flex:none;width:46px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#f7b500;font-size:1.15rem;cursor:pointer;transition:background .2s,border-color .2s}
#fav-toggle-btn.active{background:rgba(247,181,0,.2);border-color:rgba(247,181,0,.5)}
.song-fav{flex:none;background:none;border:none;cursor:pointer;font-size:1.1rem;color:#f7b500;padding:4px 6px;line-height:1;opacity:.9}
.song-fav.is-fav{filter:drop-shadow(0 0 4px rgba(247,181,0,.55))}
</style>`);

// Estilos del Modo Escenario (botones gigantes para usar en directo)
document.head.insertAdjacentHTML('beforeend', `<style>
#stage-mode{position:fixed;inset:0;z-index:100000;background:radial-gradient(circle at 50% 0%,#16121f,#09090e 70%);display:flex;flex-direction:column;padding:14px;gap:12px;overflow-y:auto;-webkit-overflow-scrolling:touch}
#stage-mode.hidden{display:none}
.stage-top{display:flex;align-items:center;gap:12px;padding-top:8px}
.stage-track{flex:1;min-width:0}
.stage-track-title{font-size:1.6rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1}
.stage-track-sub{font-size:.9rem;color:#9aa6c0;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.stage-exit{flex:none;width:56px;height:56px;border-radius:16px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:1.5rem;cursor:pointer}
.stage-exit:active{transform:scale(.93)}
.stage-progress{height:10px;border-radius:8px;background:rgba(255,255,255,.1);overflow:hidden}
.stage-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#7b2ff7,#23d5e8);transition:width .2s linear}
.stage-transport{display:flex;gap:12px}
.stage-btn{flex:1;min-height:88px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:2rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .08s,background .2s}
.stage-btn:active{transform:scale(.95)}
.stage-btn.play{flex:1.7;font-size:2.8rem;background:linear-gradient(135deg,#7b2ff7,#23d5e8);border:none}
.stage-btn.duck.active-duck{background:linear-gradient(135deg,#f7b500,#ff7a00);color:#1a1200}
.stage-quick{display:flex;gap:12px}
.stage-quick .stage-btn{min-height:66px;font-size:1.15rem;font-weight:700}
.stage-section-label{font-size:.72rem;color:#9aa6c0;text-transform:uppercase;letter-spacing:.09em;margin:2px 0 -2px;opacity:.75}
.stage-sounds{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding-bottom:8px}
.stage-pad{min-height:90px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;transition:transform .08s,background .15s}
.stage-pad:active,.stage-pad.triggered{transform:scale(.92);background:rgba(123,47,247,.4)}
.stage-pad .e{font-size:2rem;line-height:1}
.stage-pad .n{font-size:.78rem;font-weight:700;text-align:center;padding:0 4px}
@media(min-width:700px){.stage-track-title{font-size:2.1rem}.stage-sounds{grid-template-columns:repeat(4,1fr)}}
</style>`);

window.addEventListener("DOMContentLoaded", async () => {
    // 1. Extraer tokens de Spotify si redirige del login OAuth antiguo
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const token = hashParams.get("access_token");
    if (token) {
        localStorage.setItem("spotify_access_token", token);
        // Limpiar el hash de la URL para estética limpia
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // 2. Completar login moderno de Spotify con PKCE
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get("code");
    const returnedState = queryParams.get("state");
    const savedState = localStorage.getItem("spotify_auth_state");
    if (code) {
        try {
            if (savedState && returnedState !== savedState) {
                throw new Error("Spotify devolvió un estado de seguridad distinto. Intenta conectar de nuevo.");
            }
            updateSpotifyStatusUI(false, "Conectando con Spotify...");
            await exchangeSpotifyCodeForToken(code);
            localStorage.removeItem("spotify_auth_state");
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
            console.error("Error al conectar Spotify:", err);
            updateSpotifyStatusUI(false, err.message);
            alert(`No se pudo conectar Spotify:\n\n${err.message}`);
        }
    }
    
    // Pre-llenar campo de Client ID
    document.getElementById("spotify-client-id").value = localStorage.getItem("spotify_client_id") || "";
    
    // Si tenemos token guardado, actualizar estado preliminar de Spotify UI
    if (localStorage.getItem("spotify_access_token") && localStorage.getItem("spotify_client_id")) {
        updateSpotifyStatusUI(false, "Spotify autorizado. Preparando reproductor...");
        initSpotifyPlayerIfReady();
    }

    // Renderizar soundboard genérico primero (para que loadCustomSFXFromDB encuentre los pads)
    renderSoundboard(GENERIC_SOUNDS, "🎉 Genérico");

    // Cargar sonidos personalizados de IndexedDB
    loadCustomSFXFromDB();
    
    // Cargar sonidos profesionales del hosting (sfx-manifest.json)
    await loadSFXManifest();

    // Cargar listas del hosting si existe playlists.json
    await loadHostedPlaylists();
    
    // Configurar listas por defecto o cargadas
    renderSongsList();
    
    // Configurar temporizadores por defecto
    setupShowTimers();
    
    // Dibujar ondas ambientales en canvas antes de interactuar (simulado sin audio context)
    const canvas = document.getElementById("audio-visualizer");
    const ctx = canvas.getContext("2d");
    function drawAmbient() {
        if (audioCtx && audioCtx.state === 'running') return; // Si ya hay audio real, detener este bucle
        
        requestAnimationFrame(drawAmbient);
        
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        ctx.fillStyle = "rgba(9, 9, 14, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(157, 78, 221, 0.2)";
        
        // Ondas sinoidales ambientales para que el canvas no esté vacío
        const time = Date.now() * 0.003;
        for (let i = 0; i < canvas.width; i++) {
            const y = canvas.height / 2 + Math.sin(i * 0.01 + time) * 8 * Math.cos(i * 0.002 + time * 0.5);
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
        }
        ctx.stroke();
    }
    drawAmbient();
});
