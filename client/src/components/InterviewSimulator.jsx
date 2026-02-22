import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MessageSquare, Play, Send, User, Bot, Loader, Trash2 } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

export default function InterviewSimulator({ prefilledPosition }) {
    const [position, setPosition] = useState(localStorage.getItem('int_pos') || '')
    const [level, setLevel] = useState(localStorage.getItem('int_level') || 'Junior')
    const [questions, setQuestions] = useState(() => JSON.parse(localStorage.getItem('int_qs') || '[]'))
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => parseInt(localStorage.getItem('int_idx')) || -1)
    const [loading, setLoading] = useState(false)
    const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem('int_answers') || '{}'))
    const [feedback, setFeedback] = useState(localStorage.getItem('int_feedback') || null)

    useEffect(() => {
        if (prefilledPosition && !position) setPosition(prefilledPosition)
    }, [prefilledPosition])

    useEffect(() => {
        localStorage.setItem('int_pos', position)
        localStorage.setItem('int_level', level)
        localStorage.setItem('int_qs', JSON.stringify(questions))
        localStorage.setItem('int_idx', currentQuestionIndex)
        localStorage.setItem('int_answers', JSON.stringify(answers))
        if (feedback) localStorage.setItem('int_feedback', feedback)
        else localStorage.removeItem('int_feedback')
    }, [position, level, questions, currentQuestionIndex, answers, feedback])

    const handleStart = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await axios.post(`${API_URL}/generate-interview-questions`, {
                position,
                experience_level: level
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const qs = response.data.questions.split('\n').filter(q => q.trim() && (q.includes('?') || q.match(/^\d+\./)))
            setQuestions(qs)
            setCurrentQuestionIndex(0)
            setAnswers({})
            setFeedback(null)
        } catch (err) {
            console.error(err)
            alert("Failed to generate questions. Please make sure you're logged in.")
        } finally {
            setLoading(false)
        }
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(curr => curr + 1)
        } else {
            const fb = "Great job! Your answers show strong technical knowledge. Work on being more concise in behavioral questions."
            setFeedback(fb)
            setCurrentQuestionIndex(-1)
        }
    }

    const handleReset = () => {
        setPosition('')
        setLevel('Junior')
        setQuestions([])
        setCurrentQuestionIndex(-1)
        setAnswers({})
        setFeedback(null)
        localStorage.clear() // Or just remove specific keys
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Interview Simulator</h2>
                <p>Prepare for your next interview with personalized AI-generated questions.</p>
            </div>

            <div className="glass" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                        <Trash2 size={14} /> Reset Simulator
                    </button>
                </div>

                {currentQuestionIndex === -1 && !feedback && (
                    <div className="fade-in">
                        <label>Target Position</label>
                        <input
                            placeholder="e.g. Frontend Developer, Data Analyst"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                        />

                        <label>Experience Level</label>
                        <select value={level} onChange={(e) => setLevel(e.target.value)}>
                            <option>Intern</option>
                            <option>Junior</option>
                            <option>Middle</option>
                            <option>Senior</option>
                        </select>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleStart} disabled={loading || !position}>
                            {loading ? 'Generating Questions...' : 'Start Session'}
                        </button>
                    </div>
                )}

                {currentQuestionIndex >= 0 && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        </div>

                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '2rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <Bot style={{ color: 'var(--primary)' }} />
                                <h3 style={{ fontSize: '1.25rem' }}>{questions[currentQuestionIndex]}</h3>
                            </div>
                        </div>

                        <textarea
                            rows="6"
                            placeholder="Type your answer here..."
                            value={answers[currentQuestionIndex] || ''}
                            onChange={(e) => setAnswers({ ...answers, [currentQuestionIndex]: e.target.value })}
                        />

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleNext}>
                            {currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                        </button>
                    </div>
                )}

                {feedback && (
                    <div className="fade-in" style={{ textAlign: 'center' }}>
                        <div className="icon" style={{ margin: '0 auto 1.5rem', background: '#22c55e20', color: '#22c55e', width: '60px', height: '60px' }}>
                            <MessageSquare size={30} />
                        </div>
                        <h3>Interview Completed!</h3>
                        <p style={{ margin: '1rem 0 2rem', color: 'var(--text-muted)' }}>{feedback}</p>
                        <button className="btn btn-outline" onClick={() => { setFeedback(null); setQuestions([]); setCurrentQuestionIndex(-1); }}>
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
