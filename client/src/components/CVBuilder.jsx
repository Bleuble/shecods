import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, GraduationCap, Briefcase, Code, Terminal, Printer, Download, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react'

export default function CVBuilder() {
    const [step, setStep] = useState(parseInt(localStorage.getItem('cv_step')) || 1)
    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem('cv_data')
        return saved ? JSON.parse(saved) : {
            personal: { name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
            education: [{ school: '', degree: '', major: '', gpa: '', date: '', location: '', coursework: '' }],
            experience: [{ company: '', position: '', date: '', location: '', description: [''] }],
            projects: [{ title: '', technologies: '', date: '', description: [''] }],
            skills: { technical: '', tools: '', languages: '' }
        }
    })
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        localStorage.setItem('cv_data', JSON.stringify(formData))
    }, [formData])

    useEffect(() => {
        localStorage.setItem('cv_step', step)
    }, [step])

    const handlePersonalChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, personal: { ...prev.personal, [name]: value } }))
    }

    const addEducation = () => {
        setFormData(prev => ({
            ...prev,
            education: [...prev.education, { school: '', degree: '', major: '', gpa: '', date: '', location: '', coursework: '' }]
        }))
    }

    const updateEducation = (index, field, value) => {
        const newEdu = [...formData.education]
        newEdu[index][field] = value
        setFormData(prev => ({ ...prev, education: newEdu }))
    }

    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            experience: [...prev.experience, { company: '', position: '', date: '', location: '', description: [''] }]
        }))
    }

    const updateExperience = (index, field, value) => {
        const newExp = [...formData.experience]
        if (field === 'description') {
            newExp[index].description = value.split('\n')
        } else {
            newExp[index][field] = value
        }
        setFormData(prev => ({ ...prev, experience: newExp }))
    }

    const nextStep = () => setStep(s => s + 1)
    const prevStep = () => setStep(s => s - 1)

    if (showPreview) {
        return <HarvardCVPreview data={formData} onBack={() => setShowPreview(false)} />
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2 className="section-title">Harvard CV Builder</h2>
                <p>Step {step} of 4: {['Personal Details', 'Education', 'Experience & Projects', 'Skills'][step - 1]}</p>
            </div>

            <div className="glass" style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto' }}>
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                            <div className="grid-1-1">
                                <div>
                                    <label>Full Name</label>
                                    <input name="name" value={formData.personal.name} onChange={handlePersonalChange} placeholder="John Doe" />
                                </div>
                                <div>
                                    <label>Email Address</label>
                                    <input name="email" value={formData.personal.email} onChange={handlePersonalChange} placeholder="john@example.com" />
                                </div>
                            </div>
                            <div className="grid-1-1">
                                <div>
                                    <label>Phone Number</label>
                                    <input name="phone" value={formData.personal.phone} onChange={handlePersonalChange} placeholder="+1 234 567 890" />
                                </div>
                                <div>
                                    <label>Location</label>
                                    <input name="location" value={formData.personal.location} onChange={handlePersonalChange} placeholder="City, State" />
                                </div>
                            </div>
                            <div className="grid-1-1">
                                <div>
                                    <label>LinkedIn URL</label>
                                    <input name="linkedin" value={formData.personal.linkedin} onChange={handlePersonalChange} placeholder="linkedin.com/in/johndoe" />
                                </div>
                                <div>
                                    <label>Website / Portfolio</label>
                                    <input name="website" value={formData.personal.website} onChange={handlePersonalChange} placeholder="johndoe.com" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                            {formData.education.map((edu, idx) => (
                                <div key={idx} style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: idx !== formData.education.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div className="grid-1-1">
                                        <div>
                                            <label>University / School</label>
                                            <input value={edu.school} onChange={(e) => updateEducation(idx, 'school', e.target.value)} placeholder="Harvard University" />
                                        </div>
                                        <div>
                                            <label>Degree</label>
                                            <input value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} placeholder="Bachelor of Science" />
                                        </div>
                                    </div>
                                    <div className="grid-1-1">
                                        <div>
                                            <label>Major</label>
                                            <input value={edu.major} onChange={(e) => updateEducation(idx, 'major', e.target.value)} placeholder="Computer Science" />
                                        </div>
                                        <div>
                                            <label>GPA</label>
                                            <input value={edu.gpa} onChange={(e) => updateEducation(idx, 'gpa', e.target.value)} placeholder="3.9/4.0" />
                                        </div>
                                    </div>
                                    <div className="grid-1-1">
                                        <div>
                                            <label>Dates</label>
                                            <input value={edu.date} onChange={(e) => updateEducation(idx, 'date', e.target.value)} placeholder="May 2024 (Expected)" />
                                        </div>
                                        <div>
                                            <label>Location</label>
                                            <input value={edu.location} onChange={(e) => updateEducation(idx, 'location', e.target.value)} placeholder="Cambridge, MA" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="btn btn-outline" onClick={addEducation} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Plus size={18} /> Add More Education
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                            <h4 style={{ marginBottom: '1rem' }}>Professional Experience</h4>
                            {formData.experience.map((exp, idx) => (
                                <div key={idx} style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                    <div className="grid-1-1">
                                        <input value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} placeholder="Company Name" />
                                        <input value={exp.position} onChange={(e) => updateExperience(idx, 'position', e.target.value)} placeholder="Your Position" />
                                    </div>
                                    <div className="grid-1-1">
                                        <input value={exp.date} onChange={(e) => updateExperience(idx, 'date', e.target.value)} placeholder="Dates (e.g. Jun 2023 - Aug 2023)" />
                                        <input value={exp.location} onChange={(e) => updateExperience(idx, 'location', e.target.value)} placeholder="Location" />
                                    </div>
                                    <label>Bullet Points (One per line)</label>
                                    <textarea rows="4" value={exp.description.join('\n')} onChange={(e) => updateExperience(idx, 'description', e.target.value)} placeholder="• Developed feature X using Y..." />
                                </div>
                            ))}
                            <button className="btn btn-outline" onClick={addExperience} style={{ width: '100%', marginBottom: '2rem' }}>
                                <Plus size={18} /> Add Experience
                            </button>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                            <label>Technical Skills (e.g. Languages, Frameworks)</label>
                            <textarea placeholder="Python, JavaScript, React, Node.js..." value={formData.skills.technical} onChange={(e) => setFormData({ ...formData, skills: { ...formData.skills, technical: e.target.value } })} />

                            <label>Professional Tools</label>
                            <textarea placeholder="Git, Docker, AWS, Figma..." value={formData.skills.tools} onChange={(e) => setFormData({ ...formData, skills: { ...formData.skills, tools: e.target.value } })} />

                            <label>Languages</label>
                            <input placeholder="English (Native), Spanish (Fluent)..." value={formData.skills.languages} onChange={(e) => setFormData({ ...formData, skills: { ...formData.skills, languages: e.target.value } })} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                    {step > 1 ? (
                        <button className="btn btn-outline" onClick={prevStep} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={18} /> Previous
                        </button>
                    ) : (
                        <button className="btn btn-outline" onClick={() => { localStorage.removeItem('cv_data'); window.location.reload(); }} style={{ color: '#ef4444' }}>
                            Reset CV
                        </button>
                    )}

                    {step < 4 ? (
                        <button className="btn btn-primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Continue <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setShowPreview(true)} style={{ background: '#22c55e', border: 'none' }}>
                            Generate Harvard CV
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function HarvardCVPreview({ data, onBack }) {
    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="no-print">
                <button className="btn btn-outline" onClick={onBack}>Back to Edit</button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Printer size={18} /> Print to PDF
                    </button>
                </div>
            </div>

            <div id="harvard-cv" style={{
                background: 'white',
                color: '#000',
                padding: '1in',
                width: '8.5in',
                minHeight: '11in',
                margin: '0 auto',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '11pt',
                lineHeight: '1.4',
                boxShadow: '0 0 20px rgba(0,0,0,0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', letterSpacing: '1px' }}>{data.personal.name || 'YOUR NAME'}</h1>
                    <div style={{ fontSize: '10pt', marginTop: '5px' }}>
                        {data.personal.location} | {data.personal.phone} | {data.personal.email}
                    </div>
                </div>

                <Section title="EDUCATION" />
                {data.education.map((edu, i) => (
                    <div key={i} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{edu.school}</span>
                            <span>{edu.location}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontStyle: 'italic' }}>
                            <span>{edu.degree} in {edu.major} {edu.gpa && `(GPA: ${edu.gpa})`}</span>
                            <span>{edu.date}</span>
                        </div>
                    </div>
                ))}

                <Section title="EXPERIENCE" />
                {data.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{exp.company}</span>
                            <span>{exp.location}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontStyle: 'italic', marginBottom: '0.2rem' }}>
                            <span>{exp.position}</span>
                            <span>{exp.date}</span>
                        </div>
                        <ul style={{ margin: '0', paddingLeft: '1.2rem', fontSize: '10.5pt' }}>
                            {exp.description.map((bullet, bi) => bullet.trim() && (
                                <li key={bi} style={{ marginBottom: '2px' }}>{bullet.replace(/^•|^-/, '').trim()}</li>
                            ))}
                        </ul>
                    </div>
                ))}

                <Section title="SKILLS & INTERESTS" />
                <div style={{ fontSize: '10.5pt' }}>
                    {data.skills.technical && <div><strong>Technical Skills:</strong> {data.skills.technical}</div>}
                    {data.skills.tools && <div><strong>Tools:</strong> {data.skills.tools}</div>}
                    {data.skills.languages && <div><strong>Languages:</strong> {data.skills.languages}</div>}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          #harvard-cv { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
          nav, footer { display: none !important; }
        }
      `}} />
        </div>
    )
}

function Section({ title }) {
    return (
        <div style={{ borderBottom: '1px solid black', marginBottom: '0.6rem', marginTop: '1.2rem' }}>
            <h2 style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0 0 2px 0' }}>{title}</h2>
        </div>
    )
}
