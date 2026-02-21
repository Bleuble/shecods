import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Mic, MicOff, Volume2, VolumeX, Languages, Bot, User, Play, StopCircle, RefreshCw, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = 'http://127.0.0.1:8000'

export default function VoiceInterviewCoach({ user, prefilledRole }) {
    const [inputLanguage, setInputLanguage] = useState('en-US')
    const [outputLanguage, setOutputLanguage] = useState('en-US')
    const [role, setRole] = useState('')
    const [resumeContext, setResumeContext] = useState(user?.background || '')
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [chat, setChat] = useState([])
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isCoachStarted, setIsCoachStarted] = useState(false)

    const recognitionRef = useRef(null)
    const synthRef = useRef(window.speechSynthesis)
    const chatEndRef = useRef(null)

    useEffect(() => {
        if (prefilledRole) setRole(prefilledRole)
    }, [prefilledRole])

    useEffect(() => {
        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = false

            recognitionRef.current.onresult = (event) => {
                const text = event.results[0][0].transcript
                setTranscript(text)
                handleSendMessage(text)
            }

            recognitionRef.current.onend = () => {
                setIsRecording(false)
            }
        }
    }, [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chat])

    const startCoach = async () => {
        if (!role) return
        setIsCoachStarted(true)
        const initialGreeting = outputLanguage.startsWith('ru')
            ? `Привет! Я твой ИИ - тренер.Я буду задавать тебе вопросы по очереди для позиции ${role}.Начнем!`
            : `Hello! I am your AI Career Coach.I will ask you questions one by one for the ${role} position.Let's start!`

        addMessage('bot', initialGreeting)
        speak(initialGreeting)

        // Automatically ask the first question
        setTimeout(() => {
            handleSendMessage("Start the interview.")
        }, 3000)
    }

    const speak = (text) => {
        if (!synthRef.current) return
        synthRef.current.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = outputLanguage
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        synthRef.current.speak(utterance)
    }

    const startRecording = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser.")
            return
        }
        setTranscript('')
        recognitionRef.current.lang = inputLanguage
        recognitionRef.current.start()
        setIsRecording(true)
    }

    const stopRecording = () => {
        if (recognitionRef.current) recognitionRef.current.stop()
        setIsRecording(false)
    }

    const addMessage = (sender, text) => {
        setChat(prev => [...prev, { sender, text, timestamp: new Date().toLocaleTimeString() }])
    }

    const syncProfile = async (bio) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_URL}/update-profile`, {
                name: user.name,
                email: user.email,
                bio: bio
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to sync profile:", err);
        }
    }

    const handleSendMessage = async (text) => {
        if (!text.trim()) return
        if (text !== "Start the interview.") {
            addMessage('user', text)
        }
        setLoading(true)

        const token = localStorage.getItem('token');

        try {
            const contextText = chat.slice(-4).map(m => `${m.sender}: ${m.text}`).join('\n')
            const response = await axios.post(`${API_URL}/generate-interview-questions`, {
                position: role,
                experience_level: "Individualized",
                resume_context: `The candidate is speaking in: ${inputLanguage}. 
                The candidate's response: ${text}.
                
                Conversation history:
                ${contextText}
                
                ***CRITICAL INSTRUCTION***: 
                1. You MUST respond ONLY in the following language: ${outputLanguage}.
                2. Use the "Candidate's Background" to ask DEEP, SPECIFIC questions about their projects or experiences.
                3. Do not ask generic questions like "Tell me about a time...". Instead, ask "I see you worked on project X, what was the most difficult technical part of Y?".
                4. Adapt to the candidate's level of depth. If they give a brief answer, ask for more detail.
                5. Ask ONLY ONE question at a time.`
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const botResponse = response.data.questions
            addMessage('bot', botResponse)
            speak(botResponse)
        } catch (err) {
            console.error(err)
            const errorMsg = "I'm sorry, I'm having trouble connecting. Could you please check your internet or API key?"
            addMessage('bot', errorMsg)
            speak(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    const languages = [
        { code: 'en-US', name: 'English (US)' },
        { code: 'ru-RU', name: 'Русский (Russian)' },
        { code: 'kk-KZ', name: 'Қазақша (Kazakh)' },
        { code: 'es-ES', name: 'Español (Spanish)' },
        { code: 'fr-FR', name: 'Français (French)' }
    ]

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Voice Interview Coach</h2>
                <p>Talk to our AI assistant to sharpen your interview skills.</p>
            </div>

            <div className="grid-2-1">
                <div className="glass" style={{ padding: '2rem', height: 'fit-content' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} /> I will speak in
                        </label>
                        <select value={inputLanguage} onChange={(e) => setInputLanguage(e.target.value)}>
                            {languages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bot size={18} /> AI should respond in
                        </label>
                        <select value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)}>
                            {languages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label>Target Position</label>
                        <input
                            placeholder="e.g. Software Engineer"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            disabled={isCoachStarted}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label>Paste your CV / Achievements (for personal approach)</label>
                        <textarea
                            placeholder="I worked at company X where I did Y... I also know React and Python..."
                            value={resumeContext}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setResumeContext(newVal);
                                const updatedUser = { ...user, background: newVal };
                                localStorage.setItem('user', JSON.stringify(updatedUser));
                                syncProfile(newVal);
                            }}
                            disabled={isCoachStarted}
                            rows="4"
                            style={{ fontSize: '0.9rem' }}
                        />
                    </div>

                    {!isCoachStarted ? (
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={startCoach} disabled={!role}>
                            Start Voice Session
                        </button>
                    ) : (
                        <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => { setIsCoachStarted(false); setChat([]); }}>
                            Reset Session
                        </button>
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`mic-button ${isRecording ? 'recording' : ''}`}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={!isCoachStarted}
                        >
                            {isRecording ? <div className="pulse-ring"></div> : null}
                            {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                        </motion.button>
                        <p style={{ marginTop: '1rem', color: isRecording ? 'var(--secondary)' : 'var(--text-muted)' }}>
                            {isRecording ? 'Listening...' : 'Click to Speak'}
                        </p>
                    </div>
                </div>

                <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '600px' }}>
                    <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                        {chat.length === 0 && (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                <Bot size={80} />
                            </div>
                        )}
                        {chat.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.sender === 'bot' ? 'flex-start' : 'flex-end',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    background: msg.sender === 'bot' ? 'var(--glass)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    border: '1px solid var(--glass-border)',
                                    color: msg.sender === 'bot' ? 'var(--text)' : 'white'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', opacity: 0.7, fontSize: '0.8rem' }}>
                                        {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                                        <span>{msg.sender === 'bot' ? 'Coach AI' : 'You'}</span>
                                    </div>
                                    {msg.text}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{msg.timestamp}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ position: 'relative' }}>
                        {loading && <div className="loader" style={{ position: 'absolute', top: '-30px', left: '50%' }}></div>}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                placeholder="Type or click the microphone to speak..."
                                onKeyPress={(e) => e.key === 'Enter' && (handleSendMessage(e.target.value), e.target.value = '')}
                                style={{ marginBottom: 0 }}
                            />
                            <button className="btn btn-primary" onClick={() => {
                                const input = document.querySelector('input[placeholder="Type or click the microphone to speak..."]')
                                handleSendMessage(input.value)
                                input.value = ''
                            }}>
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .mic-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: background 0.3s;
        }
        .mic-button.recording {
          background: var(--secondary);
        }
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--secondary);
          opacity: 0.5;
          animation: pulse 1.5s infinite;
          z-index: -1;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}} />
        </div>
    )
}
