import React, { useState } from 'react'
import axios from 'axios'
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

export default function ResumeAnalyzer() {
    const [resumeText, setResumeText] = useState('')
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleAnalyze = async () => {
        if (!resumeText) return
        setLoading(true)
        setError(null)
        try {
            const token = localStorage.getItem('token')
            console.log(`Analyzing resume at ${API_URL}/analyze-resume with token: ${token ? 'Present' : 'Missing'}`)
            const response = await axios.post(`${API_URL}/analyze-resume`,
                { resume_text: resumeText },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            console.log("Analysis response status:", response.status)
            // LLM might return JSON in a string, we need to parse if possible or just show
            try {
                const parsed = typeof response.data.analysis === 'string'
                    ? JSON.parse(response.data.analysis.replace(/```json|```/g, ''))
                    : response.data.analysis
                setAnalysis(parsed)
            } catch (e) {
                setAnalysis({ raw: response.data.analysis })
            }
        } catch (err) {
            console.error("Analysis complete error object:", err)
            if (err.response?.status === 401) {
                setError("Your session has expired. Please log out and log in again.")
            } else {
                setError(`Analysis failed: ${err.message}. ${err.response?.data?.detail || ''}`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Resume Analyzer</h2>
                <p>Paste your resume text below to get AI-powered feedback.</p>
            </div>

            <div className="glass" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <label>Your Resume Content</label>
                <textarea
                    rows="12"
                    placeholder="Paste your professional experience here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                />

                <button
                    className="btn btn-primary w-full"
                    onClick={handleAnalyze}
                    disabled={loading || !resumeText}
                    style={{ width: '100%' }}
                >
                    {loading ? 'Analyzing...' : 'Analyze Resume'}
                </button>

                {error && (
                    <div style={{ marginTop: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {analysis && (
                    <div style={{ marginTop: '2.5rem' }} className="fade-in">
                        {analysis.score && (
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)' }}>{analysis.score}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Resume Score</div>
                            </div>
                        )}

                        {analysis.strengths && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>Strengths</h4>
                                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                                    {Array.isArray(analysis.strengths) ? analysis.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>{analysis.strengths}</li>}
                                </ul>
                            </div>
                        )}

                        {analysis.weaknesses && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Potential Improvements</h4>
                                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                                    {Array.isArray(analysis.weaknesses) ? analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li>{analysis.weaknesses}</li>}
                                </ul>
                            </div>
                        )}

                        {analysis.raw && (
                            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                                {analysis.raw}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
