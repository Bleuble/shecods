import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Mic, MicOff, Volume2, VolumeX, Languages, Bot, User, Play, StopCircle, RefreshCw, Send, Sparkles, Heart, AlertTriangle, LogIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function VoiceInterviewCoach({ user, prefilledRole }) {
    const [role, setRole] = useState('')
    const [resumeContext, setResumeContext] = useState(user?.background || '')
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [chat, setChat] = useState([])
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isCoachStarted, setIsCoachStarted] = useState(false)
    const [activeLang, setActiveLang] = useState('en-US')
    const [errorType, setErrorType] = useState(null) // null, 'auth', 'network', 'api'

    const recognitionRef = useRef(null)
    const synthRef = useRef(window.speechSynthesis)
    const chatEndRef = useRef(null)

    useEffect(() => {
        if (prefilledRole) setRole(prefilledRole)
    }, [prefilledRole])

    useEffect(() => {
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
        setErrorType(null)
        const initialGreeting = "Hi! I'm your AI Coach. I'll listen and adapt to you automatically. What should we practice today?"

        addMessage('bot', initialGreeting)
        speak(initialGreeting)

        setTimeout(() => {
            handleSendMessage("Begin the adaptive interview session.")
        }, 2000)
    }

    const detectLanguage = (text) => {
        const russianPattern = /[а-яА-Я]/
        const kazakhPattern = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/
        if (kazakhPattern.test(text)) return 'kk-KZ'
        if (russianPattern.test(text)) return 'ru-RU'
        return 'en-US'
    }

    const speak = (text) => {
        if (!synthRef.current) return
        synthRef.current.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        const lang = detectLanguage(text)
        utterance.lang = lang

        const voices = synthRef.current.getVoices()
        let preferredVoice = null

        if (lang.startsWith('en')) {
            preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Victoria') || v.name.includes('Apple'))
        } else if (lang.startsWith('ru')) {
            preferredVoice = voices.find(v => v.lang.startsWith('ru') && (v.name.includes('Milena') || v.name.includes('Katya') || v.name.includes('Google')))
        }

        if (preferredVoice) utterance.voice = preferredVoice

        utterance.pitch = 1.15
        utterance.rate = 1.05
        utterance.volume = 1.0

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        synthRef.current.speak(utterance)
    }

    const startRecording = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported.")
            return
        }
        setTranscript('')
        recognitionRef.current.lang = activeLang
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

    const handleSendMessage = async (text, retryCount = 0) => {
        if (!text.trim()) return
        if (text !== "Begin the adaptive interview session." && retryCount === 0) {
            addMessage('user', text)
            const detected = detectLanguage(text)
            setActiveLang(detected)
        }
        setLoading(true)
        setErrorType(null)

        try {
            const token = localStorage.getItem('token');
            if (!token || token === "null") {
                setErrorType('auth')
                throw new Error("Authentication missing")
            }

            const contextText = chat.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n')
            const response = await axios.post(`${API_URL}/generate-interview-questions`, {
                position: role,
                experience_level: "Adaptive",
                resume_context: `Adaptive Mode. User input: ${text}. History: ${contextText}. Goal: Respond in the user's language. Be very friendly, encouraging, and pretty.`
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const botResponse = response.data.questions
            addMessage('bot', botResponse)
            speak(botResponse)
        } catch (err) {
            console.error("Coach Error:", err)

            if (err.response?.status === 401) {
                setErrorType('auth')
                addMessage('bot', "Your session has expired. To keep practicing, please log out and log in again.")
            } else if (retryCount < 1 && !errorType) {
                // One automatic silent retry for network glips
                return handleSendMessage(text, retryCount + 1)
            } else {
                setErrorType('api')
                addMessage('bot', "I'm having a little trouble connecting to my brain. Please check your internet or try again!")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">AI Voice Coach</h2>
                <p>A friendly, adaptive AI mentor to help you land your dream job.</p>
            </div>

            <div className="grid-2-1">
                <div className="glass" style={{ padding: '2.5rem', height: 'fit-content', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '1.2rem', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '1rem', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                        <Heart className="heart-pulse" style={{ color: '#ec4899' }} size={24} />
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#ec4899' }}>Adaptive Intelligence Active</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Detecting your language automatically.</div>
                        </div>
                    </div>

                    {errorType === 'auth' && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', textAlign: 'center' }}>
                            <AlertTriangle size={24} style={{ color: '#ef4444', margin: '0 auto 0.5rem' }} />
                            <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '1rem' }}>Your login session has expired.</p>
                            <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ background: '#ef4444', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                                Refresh Page to Log In
                            </button>
                        </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label>Target Position</label>
                        <input
                            placeholder="e.g. Software Engineer"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            disabled={isCoachStarted}
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label>Your Background (Optional)</label>
                        <textarea
                            placeholder="Tell me about yourself or paste your CV notes..."
                            value={resumeContext}
                            onChange={(e) => setResumeContext(e.target.value)}
                            disabled={isCoachStarted}
                            rows="5"
                            style={{ fontSize: '0.9rem' }}
                        />
                    </div>

                    {!isCoachStarted ? (
                        <button className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1, #ec4899)', height: '3.5rem', fontSize: '1.1rem' }} onClick={startCoach} disabled={!role}>
                            Start Practice Session
                        </button>
                    ) : (
                        <button className="btn btn-outline" style={{ width: '100%', height: '3rem' }} onClick={() => { setIsCoachStarted(false); setChat([]); setErrorType(null); }}>
                            Reset AI Coach
                        </button>
                    )}

                    <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className={`mic-button ${isRecording ? 'recording' : ''}`}
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={!isCoachStarted || errorType === 'auth'}
                                style={{
                                    background: isRecording ? '#ec4899' : '#6366f1',
                                    width: '90px',
                                    height: '90px'
                                }}
                            >
                                {isRecording && <div className="pulse-ring" style={{ background: '#ec4899' }}></div>}
                                {isRecording ? <MicOff size={36} /> : <Mic size={36} />}
                            </motion.button>
                        </div>
                        <p style={{ marginTop: '1.5rem', fontWeight: '600', color: isRecording ? '#ec4899' : 'var(--text-muted)' }}>
                            {isRecording ? 'Listening...' : errorType === 'auth' ? 'Please log in again' : 'Tap to speak'}
                        </p>
                    </div>
                </div>

                <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '650px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                        {chat.length === 0 && (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                                <Sparkles size={100} style={{ marginBottom: '1rem' }} />
                                <p>Your friendly AI mentor is ready.</p>
                            </div>
                        )}
                        {chat.map((msg, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: msg.sender === 'bot' ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={i}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.sender === 'bot' ? 'flex-start' : 'flex-end',
                                    marginBottom: '1.5rem'
                                }}
                            >
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '1.2rem',
                                    borderRadius: msg.sender === 'bot' ? '0 1.5rem 1.5rem 1.5rem' : '1.5rem 0 1.5rem 1.5rem',
                                    background: msg.sender === 'bot' ? 'var(--glass)' : 'linear-gradient(135deg, #6366f1, #ec4899)',
                                    color: msg.sender === 'bot' ? 'var(--text)' : 'white',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                                        <span>{msg.sender === 'bot' ? 'Your AI Mentor' : 'You'}</span>
                                    </div>
                                    <div style={{ lineHeight: '1.6' }}>{msg.text}</div>
                                </div>
                            </motion.div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {errorType && errorType !== 'auth' && (
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            <button className="btn btn-outline" onClick={() => handleSendMessage(transcript || "Continue interview")}>
                                <RefreshCw size={16} /> Retry Last Question
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '3rem' }}>
                        <input
                            placeholder="Type a message..."
                            disabled={errorType === 'auth'}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSendMessage(e.target.value)
                                    e.target.value = ''
                                }
                            }}
                            style={{ borderRadius: '2rem', padding: '0.8rem 1.5rem', border: 'none', background: 'transparent', color: 'white' }}
                        />
                        <button className="btn btn-primary" style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => {
                            const input = document.querySelector('input[placeholder="Type a message..."]')
                            handleSendMessage(input.value)
                            input.value = ''
                        }}>
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .heart-pulse {
          animation: heart-beat 1.8s infinite ease-in-out;
        }
        @keyframes heart-beat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .mic-button {
          border-radius: 50%;
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          z-index: 10;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .mic-button.recording {
          box-shadow: 0 0 30px rgba(236, 72, 153, 0.6);
        }
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          opacity: 0.6;
          animation: pulse-out 2s infinite ease-out;
          z-index: -1;
        }
        @keyframes pulse-out {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}} />
        </div>
    )
}
