import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Mail, Copy, Check, FileText, Trash2 } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

export default function CoverLetterGenerator({ prefilledJob }) {
    const [resume, setResume] = useState(localStorage.getItem('saved_cl_resume') || '')
    const [jobDesc, setJobDesc] = useState(localStorage.getItem('saved_cl_job') || '')
    const [letter, setLetter] = useState(localStorage.getItem('saved_cl_result') || '')
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (prefilledJob) {
            setJobDesc(`${prefilledJob.title} at ${prefilledJob.company}\n\n${prefilledJob.description}`)
        }
    }, [prefilledJob])

    useEffect(() => {
        localStorage.setItem('saved_cl_resume', resume)
        localStorage.setItem('saved_cl_job', jobDesc)
        localStorage.setItem('saved_cl_result', letter)
    }, [resume, jobDesc, letter])

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const resp = await axios.post(`${API_URL}/generate-cover-letter`, {
                resume_text: resume,
                job_description: jobDesc
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setLetter(resp.data.cover_letter)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(letter)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClear = () => {
        setResume('')
        setJobDesc('')
        setLetter('')
        localStorage.removeItem('saved_cl_resume')
        localStorage.removeItem('saved_cl_job')
        localStorage.removeItem('saved_cl_result')
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Cover Letter Generator</h2>
                <p>Generate a personalized, high-impact cover letter in seconds.</p>
            </div>

            <div className="grid-1-1">
                <div className="glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label>Your Resume / Experience</label>
                        <button onClick={handleClear} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                            <Trash2 size={14} /> Clear
                        </button>
                    </div>
                    <textarea
                        placeholder="Paste your resume or key achievements..."
                        rows="8"
                        value={resume}
                        onChange={(e) => setResume(e.target.value)}
                    />

                    <label>Job Description</label>
                    <textarea
                        placeholder="Paste the job description you're applying for..."
                        rows="8"
                        value={jobDesc}
                        onChange={(e) => setJobDesc(e.target.value)}
                    />

                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleGenerate} disabled={loading || !resume || !jobDesc}>
                        {loading ? 'Generating...' : 'Generate Cover Letter'}
                    </button>
                </div>

                <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} /> Result
                        </h3>
                        {letter && (
                            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }} onClick={handleCopy}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>

                    <div style={{
                        flexGrow: 1,
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-muted)',
                        fontFamily: 'serif',
                        fontSize: '1.1rem',
                        lineHeight: '1.7',
                        overflowY: 'auto',
                        maxHeight: '600px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        {letter || (
                            <div style={{ textAlign: 'center', paddingTop: '8rem', color: 'var(--text-muted)', opacity: 0.5 }}>
                                Your generated cover letter will appear here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
