import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  MessageSquare,
  Briefcase,
  Mail,
  Rocket,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  Sun,
  Moon,
  Mic
} from 'lucide-react'

import ResumeAnalyzer from './components/ResumeAnalyzer'
import InterviewSimulator from './components/InterviewSimulator'
import JobMatcher from './components/JobMatcher'
import CoverLetterGenerator from './components/CoverLetterGenerator'
import CVBuilder from './components/CVBuilder'
import VoiceInterviewCoach from './components/VoiceInterviewCoach'
import Auth from './components/Auth'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null)
  const [prefilledJob, setPrefilledJob] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setActiveTab('home')
  }

  const toggleTheme = () => {
    setTheme(curr => curr === 'light' ? 'dark' : 'light')
  }

  const renderContent = () => {
    if (!user) return <Auth onLogin={setUser} />

    switch (activeTab) {
      case 'cvbuilder': return <CVBuilder />
      case 'voicecoach': return <VoiceInterviewCoach user={user} prefilledRole={prefilledJob?.title} />
      case 'resume': return <ResumeAnalyzer />
      case 'interview': return <InterviewSimulator prefilledPosition={prefilledJob?.title} />
      case 'jobs': return <JobMatcher onSelectJob={(job) => {
        setPrefilledJob(job)
        setActiveTab('voicecoach')
      }} />
      case 'coverletter': return <CoverLetterGenerator prefilledJob={prefilledJob} />
      case 'auth': return <Auth onLogin={setUser} />
      default: return <Home onStart={() => setActiveTab('cvbuilder')} onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="container">
        <div className="logo">CareerAI</div>

        {/* Mobile Toggle */}
        <button className="nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Nav Links */}
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <a href="#" className={activeTab === 'home' ? 'active' : ''} onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }}>Home</a>
          <a href="#" className={activeTab === 'cvbuilder' ? 'active' : ''} onClick={() => { setActiveTab('cvbuilder'); setIsMenuOpen(false); }}>CV Builder</a>
          <a href="#" className={activeTab === 'voicecoach' ? 'active' : ''} onClick={() => { setActiveTab('voicecoach'); setIsMenuOpen(false); }}>AI Voice Coach</a>
          <a href="#" className={activeTab === 'resume' ? 'active' : ''} onClick={() => { setActiveTab('resume'); setIsMenuOpen(false); }}>Analyze CV</a>
          <a href="#" className={activeTab === 'jobs' ? 'active' : ''} onClick={() => { setActiveTab('jobs'); setIsMenuOpen(false); }}>Job Match</a>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={toggleTheme}
            style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass)', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid var(--border)' }}>
                <img src={user.avatar} alt="Profile" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.name}</span>
              </div>
              <button className="btn btn-outline btn-desktop" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>Logout</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-desktop" onClick={() => setActiveTab('auth')}>Sign In</button>
          )}
        </div>
      </nav>

      <main className="container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer style={{ padding: '4rem 0', borderTop: '1px solid var(--border)', marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Powerpuff</p>
      </footer>
    </div>
  )
}

function Home({ onStart, onNavigate }) {
  return (
    <div>
      <section className="hero">
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Your AI-Powered <br /> Career Companion
        </motion.h1>
        <p>Land your dream internship with AI-driven resume optimization, interview practice, and personalized job matching.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onStart}>Get Started</button>
          <button className="btn btn-outline" onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}>Learn More</button>
        </div>
      </section>

      <section className="features" id="features">
        <div className="feature-card glass" onClick={() => onNavigate('cvbuilder')} style={{ cursor: 'pointer' }}>
          <div className="icon"><FileText /></div>
          <h3>Harvard CV Builder</h3>
          <p>Generate a professional, Harvard-style CV by answering a few simple questions.</p>
        </div>
        <div className="feature-card glass" onClick={() => onNavigate('resume')} style={{ cursor: 'pointer' }}>
          <div className="icon"><CheckCircle /></div>
          <h3>CV Analysis</h3>
          <p>Get instant feedback and scores for your existing CV with AI optimization.</p>
        </div>
        <div className="feature-card glass" onClick={() => onNavigate('voicecoach')} style={{ cursor: 'pointer' }}>
          <div className="icon"><Mic /></div>
          <h3>AI Voice Coach</h3>
          <p>Practice interviews aloud in your preferred language. The AI speaks back to you with real-time feedback.</p>
        </div>
        <div className="feature-card glass" onClick={() => onNavigate('jobs')} style={{ cursor: 'pointer' }}>
          <div className="icon"><Briefcase /></div>
          <h3>Job Matching</h3>
          <p>Find the best internships tailored to your skills and career interests.</p>
        </div>
      </section>
    </div>
  )
}
export default App
