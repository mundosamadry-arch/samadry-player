/* ==========================================================================
   SAMADRY PLAYER - MAIN JS APPLICATION
   ========================================================================== */

// --- DATA: SONG PLAYLISTS ---
const PLAYLISTS = {
    samadry: [
        {
            title: "El Baile del Congelado",
            artist: "Mundo Samadry",
            duration: "02:45",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            tag: "Marchosa / Coreografía"
        },
        {
            title: "Las Partes del Cuerpo",
            artist: "Mundo Samadry",
            duration: "03:12",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            tag: "Calentamiento / Ritmo"
        },
        {
            title: "El Auto de Papá (Versión Divertida)",
            artist: "Pop Infantil",
            duration: "02:18",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            tag: "Marchosa / Viaje"
        },
        {
            title: "Chuchuwa Remix",
            artist: "Clásicos Animación",
            duration: "03:05",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            tag: "Bailes Marchosos"
        },
        {
            title: "Cumpleaños Feliz Rockero",
            artist: "Mundo Samadry",
            duration: "01:54",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
            tag: "Momento Especial"
        }
    ],
    juegos: [
        {
            title: "Ritmo de Palmas y Clapping",
            artist: "Instrumental Rápido",
            duration: "02:30",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
            tag: "Juego de Sillas"
        },
        {
            title: "Banda de Circo Marchosa",
            artist: "Percusión y Viento",
            duration: "03:10",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
            tag: "Carreras / Relevos"
        },
        {
            title: "Bate Rebotón (Ritmo Electrónico)",
            artist: "Bases Marchosas",
            duration: "04:15",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
            tag: "Gymkana"
        },
        {
            title: "Tensión Musical (Juegos de Pistas)",
            artist: "Intriga Instrumental",
            duration: "03:32",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
            tag: "Búsqueda Tesoro"
        }
    ],
    tematico: [
        {
            title: "Aventura Pirata en Alta Mar",
            artist: "Temático Aventuras",
            duration: "02:50",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
            tag: "Temática Piratas"
        },
        {
            title: "El Vals de las Princesas",
            artist: "Orquestal Dulce",
            duration: "03:02",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
            tag: "Temática Princesas"
        },
        {
            title: "Héroes en Acción (Ritmo Épico)",
            artist: "Banda Sonora Sintetizador",
            duration: "02:40",
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
            tag: "Temática Héroes"
        }
    ],
    locales: [] // Se llena con archivos subidos por el usuario
};

// --- WEB AUDIO API: SYNTHESIZER FOR SOUNDBOARD EFFECTS ---
let audioCtx = null;
let analyserNode = null;
let customSfxBlobs = {}; // Guarda sonidos MP3 cargados por usuario en la soundboard (IndexedDB / en memoria)

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

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 128;
        
        // Conectar el reproductor de audio nativo al visualizador
        const audioEl = document.getElementById("native-audio-player");
        try {
            const source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);
            document.getElementById("audio-source-status").textContent = "Modo: Reproductor & Efectos conectados";
        } catch (e) {
            console.warn("No se pudo conectar el reproductor de audio al AudioContext (probablemente ya inicializado o restricción CORS). El reproductor funcionará por canal nativo.");
        }
        
        // Iniciar bucle de dibujo de visualización
        startVisualizer();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
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

// --- CONTROLLER FOR SOUNDBOARD BUTTON TRIGGERS ---
function triggerSFX(soundId) {
    // Si el usuario cargó un archivo personalizado para este sonido, reproducirlo
    if (customSfxBlobs[soundId]) {
        playCustomSFXFile(customSfxBlobs[soundId]);
        return;
    }
    
    // De lo contrario, disparar el sintetizador offline
    switch (soundId) {
        case "applause":
            playApplauseSynth();
            break;
        case "drumroll":
            playDrumrollSynth();
            break;
        case "magic":
            playMagicSynth();
            break;
        case "horn":
            playHornSynth();
            break;
        case "laughs":
            playLaughsSynth();
            break;
        case "suspense":
            playSuspenseSynth();
            break;
        case "ding":
            playDingSynth();
            break;
        case "error":
            playErrorSynth();
            break;
        case "whistle":
            playWhistleSynth();
            break;
    }
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


// --- SPEECH RECOGNITION (VOICE ASSISTANT "OYE SAMADRY") ---

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
        showToast("Asistente de Voz Activo: Di 'Oye Samadry' 🎙️");
    };
    
    recognition.onend = () => {
        const voiceBtn = document.getElementById("voice-assistant-btn");
        if (voiceActive) {
            // Reiniciar automáticamente si se detiene por inactividad
            try {
                recognition.start();
            } catch(e) {}
        } else {
            voiceBtn.className = "icon-btn voice-btn-inactive";
            voiceBtn.title = "Activar Asistente de Voz";
        }
    };
    
    recognition.onresult = (event) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();
        console.log("Voz reconocida:", transcript);
        processVoiceCommand(transcript);
    };
    
    recognition.onerror = (e) => {
        console.error("Speech Recognition error:", e.error);
        if (e.error === 'not-allowed') {
            alert("Acceso al micrófono denegado. Activa los permisos en el navegador.");
            toggleVoiceAssistant(false);
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
    }
}

function processVoiceCommand(transcript) {
    // Comando directo sin activador: "preparados listos ya"
    if (transcript.includes("preparados listos ya") || transcript.includes("preparados listos y ya")) {
        triggerGameCountdown();
        return;
    }
    
    // Comandos que requieren activador "Samadry"
    if (transcript.includes("samadry")) {
        // Extraer el texto tras el activador
        let cleanText = transcript.replace(/.*samadry/, "").trim();
        
        // --- 1. Disparo de Sonidos (Soundboard) ---
        if (cleanText.includes("aplausos") || cleanText.includes("aplauso") || cleanText.includes("ovación")) {
            triggerSFX("applause");
            showToast("Voz: Aplausos 👏");
            return;
        }
        if (cleanText.includes("redoble") || cleanText.includes("tambor") || cleanText.includes("tambores")) {
            triggerSFX("drumroll");
            showToast("Voz: Redoble 🥁");
            return;
        }
        if (cleanText.includes("magia") || cleanText.includes("mágico") || cleanText.includes("varita")) {
            triggerSFX("magic");
            showToast("Voz: Mágico 🪄");
            return;
        }
        if (cleanText.includes("bocina") || cleanText.includes("trompeta")) {
            triggerSFX("horn");
            showToast("Voz: Bocina 🎺");
            return;
        }
        if (cleanText.includes("risas") || cleanText.includes("risa") || cleanText.includes("risitas")) {
            triggerSFX("laughs");
            showToast("Voz: Risas 😆");
            return;
        }
        if (cleanText.includes("suspenso") || cleanText.includes("misterio") || cleanText.includes("tensión")) {
            triggerSFX("suspense");
            showToast("Voz: Suspenso 🕵️");
            return;
        }
        if (cleanText.includes("ding") || cleanText.includes("campana") || cleanText.includes("correcto")) {
            triggerSFX("ding");
            showToast("Voz: Ding! 🔔");
            return;
        }
        if (cleanText.includes("fallo") || cleanText.includes("error") || cleanText.includes("incorrecto")) {
            triggerSFX("error");
            showToast("Voz: Fallo 💥");
            return;
        }
        if (cleanText.includes("silbato") || cleanText.includes("pito") || cleanText.includes("árbitro")) {
            triggerSFX("whistle");
            showToast("Voz: Silbato 🗣️");
            return;
        }
        
        // --- 2. Controles de Reproducción ---
        if (cleanText.includes("pausa") || cleanText.includes("para") || cleanText.includes("parar") || cleanText.includes("pausar")) {
            pauseCurrentTrack();
            showToast("Voz: Música pausada ⏸️");
            return;
        }
        if (cleanText.includes("reproduce") || cleanText.includes("continúa") || cleanText.includes("play") || cleanText.includes("sonar")) {
            playCurrentTrack();
            showToast("Voz: Música iniciada ▶️");
            return;
        }
        if (cleanText.includes("siguiente") || cleanText.includes("salta") || cleanText.includes("pasar")) {
            playNext();
            showToast("Voz: Siguiente canción ⏭️");
            return;
        }
        if (cleanText.includes("anterior") || cleanText.includes("atrás") || cleanText.includes("volver")) {
            playPrev();
            showToast("Voz: Canción anterior ⏮️");
            return;
        }
        
        // --- 3. Búsqueda y Reproducción de Música (Spotify / Local) ---
        if (cleanText.includes("pon la canción de") || cleanText.includes("busca la canción de") || cleanText.includes("pon la música de") || cleanText.startsWith("pon ") || cleanText.startsWith("reproduce ")) {
            let songQuery = cleanText
                .replace(/pon la canción de/, "")
                .replace(/busca la canción de/, "")
                .replace(/pon la música de/, "")
                .replace(/^pon\s+/, "")
                .replace(/^reproduce\s+/, "")
                .trim();
            
            if (songQuery) {
                showToast(`Buscando: "${songQuery}"`);
                if (spotifyConnected) {
                    searchAndPlaySpotify(songQuery);
                } else {
                    searchAndPlayLocal(songQuery);
                }
            }
            return;
        }
    }
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
let currentPlaylistKey = "samadry";
let currentTrackIndex = -1;
let isLooping = false;
let activePlaybackSource = "native";
let currentNativeObjectUrl = null;

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
        nativePlayer.crossOrigin = "anonymous";
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
    const track = list[index];
    
    setNativePlayerSource(track);
    nativePlayer.load();
    
    // UI Updates
    document.getElementById("track-title").textContent = track.title;
    document.getElementById("track-subtitle").textContent = `${track.artist} • ${track.tag}`;
    document.getElementById("audio-total-time").textContent = track.duration || "0:00";
    document.getElementById("audio-source-status").textContent = track.fileObject
        ? "Modo: Archivos locales activo"
        : "Modo: Reproductor web activo";
    
    // Resaltar canción activa en la lista
    updateActiveSongHighlight();
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
        try {
            await nativePlayer.play();
            initAudioContext();
            playBtn.textContent = "⏸️";
            document.getElementById("track-disc").style.animationPlayState = "running";
            updateActiveSongHighlight();
        } catch (err) {
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
    
    nativePlayer.pause();
    playBtn.textContent = "▶️";
    document.getElementById("track-disc").style.animationPlayState = "paused";
}

function togglePlay() {
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.togglePlay();
        return;
    }
    if (nativePlayer.paused) {
        playCurrentTrack();
    } else {
        pauseCurrentTrack();
    }
}

function stopTrack() {
    if (isSpotifyPlaybackActive()) {
        spotifyPlayer.pause();
        return;
    }
    nativePlayer.pause();
    nativePlayer.currentTime = 0;
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
        
        currentTimeText.textContent = formatTime(nativePlayer.currentTime);
        document.getElementById("audio-total-time").textContent = formatTime(nativePlayer.duration);
    }
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
    nativePlayer.volume = vol;
    document.getElementById("master-volume-text").textContent = `${Math.round(vol * 100)}%`;
    if (spotifyConnected && spotifyPlayer) {
        spotifyPlayer.setVolume(vol);
    }
});

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
    document.getElementById("chrono-total-time").textContent = `Total: ${totalShowDurationMinutes}:00`;
    
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
    document.getElementById("chrono-time").textContent = timeStr;
    
    const totalSecs = totalShowDurationMinutes * 60;
    const progressPct = (showElapsedTime / totalSecs) * 100;
    document.getElementById("chrono-progress").style.width = `${Math.min(100, progressPct)}%`;
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
    
    document.getElementById("chrono-start-btn").disabled = true;
    document.getElementById("chrono-pause-btn").disabled = false;
    document.getElementById("chrono-status").textContent = "En Vivo";
    document.getElementById("chrono-status").style.color = "var(--neon-green-real)";
    
    renderSegmentsList();
}

function pauseShowTimer() {
    if (showTimerInterval) {
        clearInterval(showTimerInterval);
        showTimerInterval = null;
    }
    document.getElementById("chrono-start-btn").disabled = false;
    document.getElementById("chrono-pause-btn").disabled = true;
    document.getElementById("chrono-status").textContent = "Pausado";
    document.getElementById("chrono-status").style.color = "var(--neon-yellow)";
    
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
    activeTab.classList.add("active");
    activeTab.setAttribute("aria-selected", "true");
    
    const key = tabId.replace("tab-", "");
    currentPlaylistKey = key;
    
    // Ocultar / Mostrar zona de subida local
    const uploader = document.getElementById("local-uploader-area");
    if (key === "locales") {
        uploader.classList.remove("hidden");
    } else {
        uploader.classList.add("hidden");
    }
    
    renderSongsList();
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
            listEl.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay pistas.</p>`;
        }
        return;
    }
    
    songs.forEach((song, idx) => {
        const item = document.createElement("div");
        item.className = `song-item ${currentTrackIndex === idx && currentPlaylistKey === song.playlistSource ? 'active' : ''}`;
        
        // Asignar campo de origen a la estructura de la canción si no existe
        song.playlistSource = currentPlaylistKey;
        
        item.innerHTML = `
            <span class="song-play-icon">${currentTrackIndex === idx && currentPlaylistKey === song.playlistSource && !nativePlayer.paused ? '🔊' : '▶️'}</span>
            <div class="song-details">
                <div class="song-title">${song.title}</div>
                <span class="song-tag">${song.tag || song.artist}</span>
            </div>
            <span class="song-duration">${song.duration}</span>
        `;
        
        item.addEventListener("click", () => {
            if (currentTrackIndex === idx && currentPlaylistKey === song.playlistSource) {
                togglePlay();
            } else {
                loadTrack(currentPlaylistKey, idx);
                playCurrentTrack();
            }
        });
        
        listEl.appendChild(item);
    });
}

function updateActiveSongHighlight() {
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


// --- LOCAL AUDIO FILE UPLOADER ---
const dropZone = document.getElementById("drop-zone");
const localFileInput = document.getElementById("local-file-input");

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
document.getElementById("chrono-start-btn").addEventListener("click", startShowTimer);
document.getElementById("chrono-pause-btn").addEventListener("click", pauseShowTimer);
document.getElementById("chrono-reset-btn").addEventListener("click", resetShowTimer);

// Botones del Reproductor Principal
document.getElementById("player-play-btn").addEventListener("click", togglePlay);
document.getElementById("player-prev-btn").addEventListener("click", playPrev);
document.getElementById("player-next-btn").addEventListener("click", playNext);
document.getElementById("player-stop-btn").addEventListener("click", stopTrack);

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
document.getElementById("tab-samadry").addEventListener("click", () => switchPlaylistTab("tab-samadry"));
document.getElementById("tab-juegos").addEventListener("click", () => switchPlaylistTab("tab-juegos"));
document.getElementById("tab-tematico").addEventListener("click", () => switchPlaylistTab("tab-tematico"));
document.getElementById("tab-locales").addEventListener("click", () => switchPlaylistTab("tab-locales"));

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

// Toggles para el asistente de voz
voiceBtn.addEventListener("click", () => {
    toggleVoiceAssistant();
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

    // Cargar sonidos personalizados de IndexedDB
    loadCustomSFXFromDB();
    
    // Configurar listas por defecto
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
