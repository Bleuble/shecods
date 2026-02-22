import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Briefcase, Search, MapPin, Tag, ExternalLink, Sparkles, Building2, Clock } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

export default function JobMatcher({ onSelectJob }) {
    const [profile, setProfile] = useState(localStorage.getItem('saved_profile') || '')
    const [interests, setInterests] = useState(localStorage.getItem('saved_interests') || '')
    const [matches, setMatches] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return
            const resp = await axios.get(`${API_URL}/search-history`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setHistory(resp.data.history || [])
        } catch (err) { console.error(err) }
    }

    const handleMatch = async () => {
        setLoading(true)
        localStorage.setItem('saved_profile', profile)
        localStorage.setItem('saved_interests', interests)
        try {
            const token = localStorage.getItem('token')
            const resp = await axios.post(`${API_URL}/match-jobs`, {
                profile,
                interests: interests.split(',').map(i => i.trim())
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setMatches(resp.data.matches)
            fetchHistory()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Job & Internship Matcher</h2>
                <p>Find the perfect opportunities based on your skills and interests.</p>
            </div>

            <div className="grid-2-1">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass" style={{ padding: '2rem' }}>
                        <label>Your Profile / Skills</label>
                        <textarea
                            placeholder="e.g. Python, React, SQL, project management..."
                            rows="5"
                            value={profile}
                            onChange={(e) => {
                                setProfile(e.target.value)
                                localStorage.setItem('saved_profile', e.target.value)
                            }}
                        />

                        <label>Interests (comma separated)</label>
                        <input
                            placeholder="Fintech, AI, Healthcare, Remote..."
                            value={interests}
                            onChange={(e) => {
                                setInterests(e.target.value)
                                localStorage.setItem('saved_interests', e.target.value)
                            }}
                        />

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleMatch} disabled={loading || !profile}>
                            {loading ? 'Finding Matches...' : 'Find Matches'}
                        </button>
                    </div>

                    {history.length > 0 && (
                        <div className="glass" style={{ padding: '1.5rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>
                                <Clock size={16} /> Recent Searches
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {history.map((h, i) => (
                                    <div
                                        key={i}
                                        className="hover-glow"
                                        style={{
                                            padding: '0.8rem',
                                            borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.03)',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            border: '1px solid var(--glass-border)'
                                        }}
                                        onClick={() => {
                                            setProfile(h.profile)
                                            setInterests(h.interests)
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', color: 'var(--primary)', marginBottom: '0.2rem' }}>{h.interests}</div>
                                        <div style={{ opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.profile}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass" style={{ padding: '2rem' }}>
                    {!matches && !loading && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '4rem' }}>
                            <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Enter your profile to see recommended opportunities.</p>
                        </div>
                    )}

                    {loading && (
                        <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
                            <div className="loader"></div>
                            <p style={{ marginTop: '1rem' }}>AI is scanning the market...</p>
                        </div>
                    )}

                    {matches && (
                        <div className="fade-in">
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={20} color="var(--primary)" /> Top Matches for You
                            </h3>
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {Array.isArray(matches) ? matches.map((job) => (
                                    <div key={job.id} className="glass card hover-glow" style={{ padding: '1.5rem', border: '1px solid var(--glass-border-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>{job.title}</h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={14} /> {job.company}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14} /> {job.location}</span>
                                                </div>
                                            </div>
                                            <span style={{ background: 'var(--primary-bright)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                {job.type}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: '1.5' }}>
                                            {job.description}
                                        </p>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                            {job.skills?.map((skill, j) => (
                                                <span key={j} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <a
                                                href={job.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary"
                                                style={{ flex: 1, height: '2.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                            >
                                                Apply Now <ExternalLink size={16} />
                                            </a>
                                            <button
                                                className="btn btn-outline"
                                                style={{ flex: 1, height: '2.8rem', fontSize: '0.9rem' }}
                                                onClick={() => onSelectJob(job)}
                                            >
                                                Prep for Job
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>{matches}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
