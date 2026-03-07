import { useState, useEffect, useCallback, useRef } from 'react';

export function useCoPilot(persona = 'Samantha', language = 'en-US', options = {}) {
    const [status, setStatus] = useState('disconnected'); // disconnected, connected, listening, speaking
    const [messages, setMessages] = useState([]);
    const [actions, setActions] = useState([]);
    const ws = useRef(null);
    const personaRef = useRef(persona);
    const langRef = useRef(language);
    const optionsRef = useRef(options);
    const wsUrl = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001';

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    // Update refs when props change
    useEffect(() => {
        personaRef.current = persona;
        langRef.current = language;

        // Update recognition languages dynamically if they exist
        if (recognition.current) recognition.current.lang = language;
        if (backgroundRecognition.current) backgroundRecognition.current.lang = language;
    }, [persona, language]);

    // native browser speech recognition (SpeechRecognition API)
    const recognition = useRef(null);

    useEffect(() => {
        // Initialize WebSocket Connection
        connectWebSocket();

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = false;
            recognition.current.interimResults = false;
            recognition.current.lang = langRef.current;

            recognition.current.onstart = () => {
                setStatus('listening');
            };

            recognition.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Recognized speech:', transcript);

                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: 'transcript',
                        text: transcript,
                        persona: personaRef.current,
                        language: langRef.current
                    }));
                    setStatus('connected');
                }
            };
            // ... rest of recognition logic remains same ...


            recognition.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setStatus('connected');
            };

            recognition.current.onend = () => {
                if (status === 'listening') {
                    setStatus('connected');
                }
            };
        } else {
            console.error("Speech Recognition API not supported in this browser.");
        }

        return () => {
            if (ws.current) ws.current.close();
            if (recognition.current) recognition.current.stop();
        };
    }, []);

    const connectWebSocket = useCallback(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected to Co-Pilot Brain');
            setStatus('connected');
            // Immediately announce the active persona and language to the backend
            // so proactive alerts use the right voice from the start
            ws.current.send(JSON.stringify({
                type: 'persona_sync',
                persona: personaRef.current,
                language: langRef.current
            }));
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received from Brain:', data);

                if (data.type === 'system_request') {
                    if (typeof optionsRef.current?.onSystemRequest === 'function') {
                        optionsRef.current.onSystemRequest(data, (payload) => {
                            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                                ws.current.send(JSON.stringify(payload));
                            }
                        });
                    }
                } else if (data.type === 'ai_response') {
                    setStatus('speaking');

                    if (data.actions && data.actions.length > 0) {
                        setActions(data.actions);
                    }

                    setMessages(prev => [...prev, { role: 'ai', text: data.text }]);

                    // Use Browser Text-to-Speech with persona-specific voice settings
                    if ('speechSynthesis' in window && data.text) {
                        window.speechSynthesis.cancel(); // clear any queued speech
                        const utterance = new SpeechSynthesisUtterance(data.text);

                        // Persona-specific voice tuning
                        const voiceSettings = {
                            'Samantha': { pitch: 1.1, rate: 0.95, volume: 1.0 },  // warm, slightly higher
                            'Jarvis': { pitch: 0.85, rate: 1.05, volume: 1.0 }, // lower, crisper
                            'KITT': { pitch: 0.75, rate: 0.90, volume: 1.0 }, // deep, measured
                        };
                        const settings = voiceSettings[personaRef.current] || voiceSettings['Samantha'];
                        utterance.pitch = settings.pitch;
                        utterance.rate = settings.rate;
                        utterance.volume = settings.volume;

                        // Try to pick the best voice for the persona and language
                        const voices = window.speechSynthesis.getVoices();
                        if (voices.length > 0) {
                            // Filter by language first
                            const langVoices = voices.filter(v => v.lang.startsWith(langRef.current) || v.lang.startsWith(langRef.current.split('-')[0]));
                            const availableVoices = langVoices.length > 0 ? langVoices : voices;

                            const femaleVoice = availableVoices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Siri') || v.name.includes('Google'));
                            const maleVoice = availableVoices.find(v => v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Google'));

                            if (personaRef.current === 'Samantha' && femaleVoice) utterance.voice = femaleVoice;
                            if ((personaRef.current === 'Jarvis' || personaRef.current === 'KITT') && maleVoice) utterance.voice = maleVoice;

                            // Fallback if no specific gender match but we have a language match
                            if (!utterance.voice && availableVoices.length > 0) {
                                utterance.voice = availableVoices[0];
                            }
                        }

                        utterance.onend = () => setStatus('connected');
                        window.speechSynthesis.speak(utterance);
                    } else {
                        setTimeout(() => setStatus('connected'), 2000);
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected. Retrying in 3s...');
            setStatus('disconnected');
            setTimeout(connectWebSocket, 3000);
        };
    }, [wsUrl]);

    const toggleListening = useCallback(() => {
        // If currently talking or listening, stop it.
        if (status === 'speaking' || status === 'listening') {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (recognition.current) {
                try { recognition.current.stop(); } catch (e) { }
            }
            setStatus('connected');
        } else {
            // Wake up
            const greetings = [
                "Hello, how can I help you?",
                "I'm listening.",
                "Yes, what do you need?",
                "How can I assist you today?",
                "Velo Voice is ready."
            ];
            const greeting = greetings[Math.floor(Math.random() * greetings.length)];

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(greeting);

                // Voice settings based on persona
                const voiceSettings = {
                    'Samantha': { pitch: 1.1, rate: 0.95 },
                    'Jarvis': { pitch: 0.85, rate: 1.05 },
                    'KITT': { pitch: 0.75, rate: 0.90 }
                };
                const settings = voiceSettings[personaRef.current] || voiceSettings['Samantha'];
                utterance.pitch = settings.pitch;
                utterance.rate = settings.rate;

                const voices = window.speechSynthesis.getVoices();
                const langVoices = voices.filter(v => v.lang.startsWith(langRef.current) || v.lang.startsWith(langRef.current.split('-')[0]));
                const availableVoices = langVoices.length > 0 ? langVoices : voices;

                const femaleVoice = availableVoices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Siri') || v.name.includes('Google'));
                const maleVoice = availableVoices.find(v => v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Google'));

                if (personaRef.current === 'Samantha' && femaleVoice) utterance.voice = femaleVoice;
                if ((personaRef.current === 'Jarvis' || personaRef.current === 'KITT') && maleVoice) utterance.voice = maleVoice;

                if (!utterance.voice && availableVoices.length > 0) {
                    utterance.voice = availableVoices[0];
                }

                utterance.onend = () => {
                    setStatus('listening');
                    if (recognition.current) {
                        try { recognition.current.start(); } catch (e) { }
                    }
                };

                setStatus('speaking');
                window.speechSynthesis.speak(utterance);
            } else {
                // Fallback if no TTS
                setStatus('listening');
                if (recognition.current) {
                    try { recognition.current.start(); } catch (e) { }
                }
            }
        }
    }, [status, setStatus]);

    const clearActions = useCallback(() => setActions([]), []);

    const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(true);
    const backgroundRecognition = useRef(null);
    const wakeWordTriggered = useRef(false); // Debounce guard

    // Initialize Background Wake Word Listener
    useEffect(() => {
        if (!isWakeWordEnabled) return;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            backgroundRecognition.current = new SpeechRecognition();
            backgroundRecognition.current.continuous = true;
            backgroundRecognition.current.interimResults = true;
            backgroundRecognition.current.lang = langRef.current;

            backgroundRecognition.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript.toLowerCase())
                    .join('');

                // All accepted wake phrases (including phonetic STT variants)
                const WAKE_PHRASES = [
                    'velovoice',
                    'velo voice',
                    'hey velovoice',
                    'hey velo voice',
                    'hello velovoice',
                    'ok velovoice',
                    'okay velovoice',
                    'hi velovoice',
                    'bellow voice',  // common STT mishearing
                    'yellow voice',  // common STT mishearing
                    'fellow voice',  // common STT mishearing
                    'hello voice',
                ];

                const wakeDetected = WAKE_PHRASES.some(phrase => transcript.includes(phrase));

                if (wakeDetected && !wakeWordTriggered.current) {
                    wakeWordTriggered.current = true;
                    console.log('🎯 Wake Word Detected! →', transcript);
                    toggleListening();
                    if (backgroundRecognition.current) {
                        try { backgroundRecognition.current.stop(); } catch (e) { }
                    }
                    // Reset debounce after 3s
                    setTimeout(() => { wakeWordTriggered.current = false; }, 3000);
                }
            };

            backgroundRecognition.current.onend = () => {
                if (isWakeWordEnabled && status !== 'listening') {
                    try { backgroundRecognition.current.start(); } catch (e) { }
                }
            };

            try { backgroundRecognition.current.start(); } catch (e) { }
        }

        return () => {
            if (backgroundRecognition.current) try { backgroundRecognition.current.stop(); } catch (e) { }
        };
    }, [isWakeWordEnabled, status, toggleListening]);

    const send = useCallback((data) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    }, []);

    return {
        status,
        toggleListening,
        messages,
        actions,
        clearActions,
        send
    };
}
