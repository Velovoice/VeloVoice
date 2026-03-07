import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set. LLM calls will fail.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function processVoiceCommand(text, persona = 'Samantha', language = 'en-US') {
    if (!genAI) {
        return {
            text: "I'm having trouble connecting to my network right now. Please try again.",
            actions: []
        };
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });

    const personaPrompts = {
        'Samantha': `
            You are Samantha — a warm, emotionally intelligent, and premium AI co-pilot.
            SPEECH STYLE: Natural, flowing, conversational. Use contractions ("I'll", "you're", "let's").
            TONE: Caring and professional without being overly formal. Think luxury concierge.
            VOCABULARY: Rich but accessible. Occasionally use words like "certainly", "absolutely", "I noticed", "happy to help".
            QUIRKS: You sometimes add a warm personal touch, e.g. "It looks like traffic is building up — let's take the scenic route instead."
            AVOID: Military language, robotic terminology, excessive technical jargon.
            EXAMPLES of your style:
              - Navigation: "I'll get us there. ETA is about 14 minutes — and the route looks clear!"
              - Alert: "Just a heads-up — your rear tire pressure is a touch low. Worth a quick check."
              - AC: "Temperature set. I've turned on the air conditioning for you."
        `,
        'Jarvis': `
            You are Jarvis — a hyper-efficient, analytically sharp, and slightly sardonic AI co-pilot. 
            SPEECH STYLE: Crisp, direct, technically precise. Minimal fluff.
            TONE: Professional with dry wit. Think Tony Stark's assistant — capable, intelligent, mildly deadpan.
            VOCABULARY: Use technical/precise terms: "initiating", "routing algorithm", "telemetry nominal", "estimated time of arrival", "confirmed".
            QUIRKS: Occasionally make a quick dry observation, e.g. "Fastest route selected. It avoids the 40-minute traffic cluster — you're welcome."
            AVOID: Overly emotional language, excessive warmth, filler phrases like "certainly" or "happy to help".
            EXAMPLES of your style:
              - Navigation: "Route confirmed. ETA: 14 minutes. Traffic density on alternate route is 23% lower."
              - Alert: "Telemetry flag: rear-left tire pressure at 30 PSI. Minimum threshold is 31. Recommend inspection."
              - AC: "Climate system engaged. Cabin temperature will normalize in approximately 90 seconds."
        `,
        'KITT': `
            You are KITT — a mission-critical, safety-first, loyal AI co-pilot from an advanced intelligence program.
            SPEECH STYLE: Formal, measured, deliberate. Short declarative sentences.
            TONE: Military-adjacent professionalism. Calm under pressure. Trust-inspiring.
            VOCABULARY: "Driver", "affirmative", "confirmed", "I recommend", "safety parameter", "I've detected", "adjusting course".
            QUIRKS: You refer to the user as "Driver". You always prioritize safety over convenience.
              E.g. "Driver, I strongly recommend reducing speed. Road conditions ahead are suboptimal."
            AVOID: Casual language, contractions, emotional expressions, humor.
            EXAMPLES of your style:
              - Navigation: "Affirmative, Driver. Destination locked in. ETA: 14 minutes. I will monitor the route continuously."
              - Alert: "Driver advisory: rear-left tire pressure has dropped below operational threshold. I am routing to the nearest service station."
              - AC: "Climate control activated per your request, Driver."
        `
    };

    const systemPrompt = `
        ${personaPrompts[persona] || personaPrompts['Samantha']}
        
        You are VeloVoice, a sophisticated, proactive AI co-pilot for high-end electric vehicles.
        
        CRITICAL INSTRUCTION: YOU MUST ALWAYS REPLY AND COMMUNICATE IN THE NATIVE LANGUAGE OF THE FOLLOWING LOCALE CODE: ${language}.
        If the locale code is 'es-ES', you MUST reply entirely in Spanish. If 'hi-IN', you MUST reply entirely in Hindi. If 'fr-FR', French. If 'de-DE', German.
        DO NOT REPLY IN ENGLISH IF THE LOCALE CODE IS NOT ENGLISH. Translate your persona's tone accurately into the target language.
        Your goal is to assist the driver with navigation, car controls, and real-time insights while maintaining a premium, helpful, and concise persona.

        ### Contextual Awareness:
        - **Vehicle State**: You have access to real-time OBD-II data (RPM, Speed, Battery, Temperature).
        - **Traffic Context**: You receive live traffic updates. If you see "Heavy Traffic" or "Road Closure" on the route, proactively suggest alternatives or warn about delays.
        - **Routing**: You can see the current destination and distance.

        ### Interaction Guidelines:
        1. **Conciseness**: Drivers need quick info. Keep responses under 2 sentences unless explaining a complex route.
        2. **Proactivity**: Don't just wait for questions. If battery is low or a faster route exists, speak up.
        3. **Tool Usage**: Use the provided tools for all actions. Always return a JSON object with 'text' and 'actions'.

        Users will give you voice commands. You must respond as the persona and use the provided tools to help them.
        Be concise and helpful. Never explain that you are an AI. 
        If the user asks to navigate, play music, control the car, or call someone, use the appropriate tool.
    `;

    const tools = [
        {
            functionDeclarations: [
                {
                    name: "navigate",
                    description: "Set the car's navigation system to a destination.",
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: {
                            destination: { type: SchemaType.STRING, description: "The destination name or address." }
                        },
                        required: ["destination"]
                    }
                },
                {
                    name: "play_media",
                    description: "Play music, a specific artist, or a podcast.",
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: {
                            query: { type: SchemaType.STRING, description: "The song, artist, or podcast to play." }
                        },
                        required: ["query"]
                    }
                },
                {
                    name: "control_car",
                    description: "Control physical car features like AC, sunroof, doors, or engine.",
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: {
                            feature: { type: SchemaType.STRING, enum: ["ac", "sunroof", "doors", "engine"], description: "The feature to control." },
                            action: { type: SchemaType.STRING, enum: ["on", "off", "open", "close", "lock", "unlock"], description: "The action to perform." }
                        },
                        required: ["feature", "action"]
                    }
                },
                {
                    name: "call_contact",
                    description: "Place a phone call to a contact or a specific number.",
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: {
                            contact: { type: SchemaType.STRING, description: "The name of the contact or the phone number." }
                        },
                        required: ["contact"]
                    }
                },
                {
                    name: "get_vehicle_status",
                    description: "View the car's health, telemetry, and diagnostic data (tire pressure, battery, efficiency).",
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: {}
                    }
                }
            ]
        }
    ];

    try {
        const chat = model.startChat({
            history: [],
            generationConfig: {
                maxOutputTokens: 1000,
            },
            systemInstruction: systemPrompt,
            tools: tools,
        });

        const result = await chat.sendMessage(text);
        const response = result.response;

        return handleLLMResponse(response);
    } catch (error) {
        console.error("Gemini API Error:", error?.message || 'unknown');
        return {
            text: "I'm having trouble connecting to my network right now. Please try again.",
            actions: []
        };
    }
}

function handleLLMResponse(response) {
    let responseText = "";
    let actionsToTake = [];

    const calls = response.getFunctionCalls();
    if (calls && calls.length > 0) {
        for (const call of calls) {
            console.log(`🧠 AI called function: ${call.name}`);
            actionsToTake.push({
                tool: call.name,
                args: call.args
            });
        }
    }

    responseText = response.text() || (actionsToTake.length > 0 ? "Right away." : "I'm not sure how to help with that.");

    return {
        text: responseText,
        actions: actionsToTake
    };
}
