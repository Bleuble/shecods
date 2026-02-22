import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import html2pdf from 'html2pdf.js'
import { Upload, CheckCircle, AlertCircle, Loader, Wand2, Copy, Check, Download, FileText } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function ResumeAnalyzer() {
    const [resumeText, setResumeText] = useState(localStorage.getItem('saved_resume') || '')
    const [analysis, setAnalysis] = useState(() => {
        const saved = localStorage.getItem('last_analysis')
        return saved ? JSON.parse(saved) : null
    })
    const [fixedResume, setFixedResume] = useState(localStorage.getItem('fixed_resume') || '')
    const [loading, setLoading] = useState(false)
    const [fixing, setFixing] = useState(false)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const pdfRef = useRef(null)

    useEffect(() => {
        localStorage.setItem('saved_resume', resumeText)
    }, [resumeText])

    useEffect(() => {
        if (analysis) localStorage.setItem('last_analysis', JSON.stringify(analysis))
    }, [analysis])

    useEffect(() => {
        if (fixedResume) localStorage.setItem('fixed_resume', fixedResume)
    }, [fixedResume])

    const handleAnalyze = async () => {
        if (!resumeText) return
        setLoading(true)
        setError(null)
        setFixedResume('')
        localStorage.removeItem('fixed_resume')
        try {
            const token = localStorage.getItem('token')
            const response = await axios.post(`${API_URL}/analyze-resume`,
                { resume_text: resumeText },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            try {
                const parsed = typeof response.data.analysis === 'string'
                    ? JSON.parse(response.data.analysis.replace(/```json|```/g, ''))
                    : response.data.analysis
                setAnalysis(parsed)
            } catch (e) {
                setAnalysis({ raw: response.data.analysis })
            }
        } catch (err) {
            console.error(err)
            if (err.response?.status === 401) {
                setError("Your session has expired. Please log out and log in again.")
            } else {
                setError(`Analysis failed: ${err.message}`)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleFixCV = async () => {
        if (!resumeText) return
        setFixing(true)
        setError(null)
        try {
            const token = localStorage.getItem('token')
            // Build feedback string from analysis
            let feedback = ""
            if (analysis) {
                if (analysis.weaknesses) {
                    feedback += "Weaknesses: " + (Array.isArray(analysis.weaknesses) ? analysis.weaknesses.join('; ') : analysis.weaknesses)
                }
                if (analysis.suggestions) {
                    feedback += "\nSuggestions: " + (Array.isArray(analysis.suggestions) ? analysis.suggestions.join('; ') : analysis.suggestions)
                }
                if (analysis.raw) {
                    feedback += "\nSummary: " + analysis.raw
                }
            }
            const response = await axios.post(`${API_URL}/fix-resume`,
                { resume_text: resumeText, analysis_feedback: feedback },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setFixedResume(response.data.fixed_resume)
        } catch (err) {
            console.error(err)
            if (err.response?.status === 401) {
                setError("Your session has expired. Please log out and log in again.")
            } else {
                setError(`Fix failed: ${err.message}`)
            }
        } finally {
            setFixing(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(fixedResume)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadAsPdf = async () => {
        if (!pdfRef.current) return
        setGeneratingPdf(true)
        try {
            const opt = {
                margin: [10, 15, 10, 15],
                filename: 'improved_resume.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            }
            await html2pdf().set(opt).from(pdfRef.current).save()
        } catch (err) {
            console.error('PDF generation failed:', err)
        } finally {
            setGeneratingPdf(false)
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Resume Analyzer</h2>
                <p>Paste your resume text below to get AI-powered feedback and an improved version.</p>
            </div>

            <div className="glass" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Your Resume Content</label>
                    <button
                        style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                        onClick={() => { setResumeText(''); setAnalysis(null); setFixedResume(''); localStorage.removeItem('saved_resume'); localStorage.removeItem('last_analysis'); localStorage.removeItem('fixed_resume'); }}
                    >
                        Clear All
                    </button>
                </div>
                <textarea
                    rows="12"
                    placeholder="Paste your professional experience here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleAnalyze}
                        disabled={loading || !resumeText}
                        style={{ flex: 1 }}
                    >
                        {loading ? 'Analyzing...' : '🔍 Analyze Resume'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleFixCV}
                        disabled={fixing || !resumeText}
                        style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
                    >
                        {fixing ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                <Loader size={16} className="spin" /> Rewriting...
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                <Wand2 size={16} /> Fix My CV ✨
                            </span>
                        )}
                    </button>
                </div>

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
                                <h4 style={{ color: '#22c55e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={18} /> Strengths
                                </h4>
                                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                                    {Array.isArray(analysis.strengths) ? analysis.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>{analysis.strengths}</li>}
                                </ul>
                            </div>
                        )}

                        {analysis.weaknesses && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertCircle size={18} /> Potential Improvements
                                </h4>
                                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                                    {Array.isArray(analysis.weaknesses) ? analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li>{analysis.weaknesses}</li>}
                                </ul>
                            </div>
                        )}

                        {analysis.suggestions && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ color: '#6366f1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Wand2 size={18} /> Suggestions
                                </h4>
                                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                                    {Array.isArray(analysis.suggestions) ? analysis.suggestions.map((s, i) => <li key={i}>{s}</li>) : <li>{analysis.suggestions}</li>}
                                </ul>
                            </div>
                        )}

                        {analysis.raw && (
                            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                {analysis.raw}
                            </div>
                        )}
                    </div>
                )}

                {fixedResume && (
                    <div style={{ marginTop: '2.5rem' }} className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ec4899' }}>
                                <Wand2 size={20} /> Your Improved Resume
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-outline"
                                    onClick={copyToClipboard}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={downloadAsPdf}
                                    disabled={generatingPdf}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ef4444' }}
                                >
                                    <FileText size={14} /> {generatingPdf ? 'Creating...' : 'Download PDF'}
                                </button>
                            </div>
                        </div>
                        <div style={{
                            whiteSpace: 'pre-wrap',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            lineHeight: '1.7',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05))',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(236, 72, 153, 0.2)',
                            maxHeight: '600px',
                            overflowY: 'auto'
                        }}>
                            {fixedResume}
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => { setResumeText(fixedResume); setFixedResume(''); setAnalysis(null); localStorage.removeItem('fixed_resume'); localStorage.removeItem('last_analysis'); }}
                            style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                        >
                            ✅ Use This as My New Resume
                        </button>
                        {/* Hidden PDF-ready content */}
                        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                            <div ref={pdfRef} style={{
                                width: '210mm',
                                minHeight: '297mm',
                                padding: '20mm 18mm',
                                fontFamily: 'Georgia, "Times New Roman", serif',
                                fontSize: '11pt',
                                lineHeight: '1.6',
                                color: '#1a1a1a',
                                background: '#ffffff',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {fixedResume}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    )
}
