import os
import random
import json
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/career_ai")
SECRET_KEY = os.getenv("SECRET_KEY", "yoursecretkeyhere")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Auth Setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    bio = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfile(BaseModel):
    name: str
    email: str
    bio: str

# Helpers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"Validating token: {token[:10]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("Token validation failed: No 'sub' (email) in payload")
            raise credentials_exception
    except JWTError as e:
        print(f"Token validation failed: JWT Error - {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"Token validation failed: User {email} not found in database")
        raise credentials_exception
    
    print(f"Token validated for: {email}")
    return user

app = FastAPI(title="AI Career Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

class ResumeAnalysisRequest(BaseModel):
    resume_text: str

class InterviewRequest(BaseModel):
    position: str
    experience_level: str
    resume_context: Optional[str] = None

class JobMatchRequest(BaseModel):
    profile: str
    interests: List[str]

class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str
    type: str 
    description: str
    skills: List[str]
    link: str

class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str
@app.get("/")
async def root():
    return {"message": "AI Career Assistant API is running"}

@app.post("/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    print(f"Registering user: {user.email}")
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        print(f"Email already registered: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"User created: {new_user.email}")
    
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Login attempt for: {form_data.username}")
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        print(f"User not found: {form_data.username}")
    elif not verify_password(form_data.password, user.hashed_password):
        print(f"Invalid password for: {form_data.username}")
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    print(f"Login successful for: {user.email}")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "name": current_user.name,
        "email": current_user.email,
        "bio": current_user.bio or ""
    }

@app.post("/update-profile")
async def update_profile(profile: UserProfile, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.name = profile.name
    current_user.bio = profile.bio
    db.commit()
    return {"message": "Profile updated successfully"}

@app.post("/analyze-resume")
async def analyze_resume(request: ResumeAnalysisRequest, current_user: Optional[User] = Depends(get_current_user)):
    if not model or not GEMINI_API_KEY:
        return {
            "analysis": {
                "score": 85,
                "strengths": ["Clear structure", "Relevant experience", "Good technical skills"],
                "weaknesses": ["Missing quantitative achievements", "Skill section could be more specific"],
                "suggestions": "Add more numbers to your achievements (e.g. 'Improved speed by 20%')."
            }
        }
    
    user_bio_context = f"User Bio: {current_user.bio}\n\n" if current_user and current_user.bio else ""

    prompt = f"""
    Analyze the following resume and provide:
    1. A score from 1-100.
    2. Strengths.
    3. Weaknesses/Areas for improvement.
    4. Suggestions for better wording or missing keywords.
    
    {user_bio_context}
    Resume:
    {request.resume_text}
    
    Format the response as JSON with keys: 'score', 'strengths', 'weaknesses', 'suggestions'.
    """
    
    response = model.generate_content(prompt)
    return {"analysis": response.text}

@app.post("/generate-interview-questions")
async def generate_questions(request: InterviewRequest, current_user: Optional[User] = Depends(get_current_user)):
    if not model or not GEMINI_API_KEY:
        # Specialized dummy responses based on common roles
        pos = request.position.lower()
        if "soft" in pos or "dev" in pos or "eng" in pos:
            responses = [
                "I see you're interested in the Software role. Let's delve deep: How would you design a system to handle 1 million concurrent requests while maintaining low latency?",
                "Interesting. Regarding your technical stack, how do you manage state in large-scale applications, and what trade-offs do you consider?",
                "Let's talk architecture. Can you explain the difference between microservices and monolithic design in the context of a high-growth startup?",
                "How do you approach unit testing and quality assurance for mission-critical code?",
                "Tell me about a time you had to optimize an algorithm that was performing poorly. What was the Big O before and after?"
            ]
        elif "design" in pos or "ui" in pos or "ux" in pos:
            responses = [
                "Walk me through your design process. How do you balance aesthetic 'wow' factor with strict accessibility requirements?",
                "When a stakeholder disagrees with a data-driven UX decision, how do you defend your design while maintaining a collaborative relationship?",
                "How do you stay current with evolving design systems and component-based UI architectures?",
                "Describe a project where you had to simplify a complex user flow. What was the measurable impact on conversion?",
                "What is your philosophy on 'Mobile First' vs 'Responsive' design in 2026?"
            ]
        else:
            responses = [
                f"As we consider you for the {request.position} role, tell me: what is the single most misunderstood aspect of this industry, and how do you navigate it?",
                "I want to hear about your strategic approach. If you were given a $1M budget to improve our operations, where would you start and why?",
                "Describe a high-stakes situation where you had to make a decision with incomplete data. What was the outcome?",
                "How do you define 'excellence' in this field, and how does your past experience demonstrate it?",
                "What is the most innovative solution you've implemented recently that challenged the status quo?"
            ]
        return {"questions": random.choice(responses)}
    
    final_resume_context = request.resume_context or ""
    if current_user and current_user.bio:
        final_resume_context = f"User Bio: {current_user.bio}\n\n{final_resume_context}"

    prompt = f"""
    You are a Senior Hiring Manager from a Tier-1 Tech Company (like Google, Amazon, or Meta). 
    You are conducting a rigorous interview for a {request.position} position.
    
    Candidate Context (CV/Background):
    {final_resume_context if final_resume_context else 'Not provided'}
    
    Your Objective:
    1. AVOID 'DUMB' OR GENERIC QUESTIONS (e.g., 'What are your strengths?', 'Tell me about yourself').
    2. Ask SHARP, TECHNICAL, or STRATEGIC questions that reveal the candidate's TRUE depth.
    3. Dig into SPECIFIC details of their mentioned projects or the role's core challenges.
    4. Respond BRIEFLY to their last answer (e.g., 'That's a sound architectural choice' or 'I see your point about X') and then MOVE DIRECTLY to the next challenging question.
    5. ASK ONLY ONE QUESTION AT A TIME.
    
    The language for the response must be: {final_resume_context.split('Language: ')[-1].split('\n')[0] if 'Language: ' in (final_resume_context or '') else 'Match the candidate'}
    
    Provide ONLY the spoken text of the interviewer. Be elite, professional, and intellectually demanding.
    """
    
    response = model.generate_content(prompt)
    return {"questions": response.text}

@app.post("/generate-voice-interview")
async def voice_interview(request: InterviewRequest, current_user: Optional[User] = Depends(get_current_user)):
    if not model or not GEMINI_API_KEY:
        # Specialized dummy responses based on common roles
        pos = request.position.lower()
        if "soft" in pos or "dev" in pos or "eng" in pos:
            responses = [
                "I see you're interested in the Software role. Let's delve deep: How would you design a system to handle 1 million concurrent requests while maintaining low latency?",
                "Interesting. Regarding your technical stack, how do you manage state in large-scale applications, and what trade-offs do you consider?",
                "Let's talk architecture. Can you explain the difference between microservices and monolithic design in the context of a high-growth startup?",
                "How do you approach unit testing and quality assurance for mission-critical code?",
                "Tell me about a time you had to optimize an algorithm that was performing poorly. What was the Big O before and after?"
            ]
        elif "design" in pos or "ui" in pos or "ux" in pos:
            responses = [
                "Walk me through your design process. How do you balance aesthetic 'wow' factor with strict accessibility requirements?",
                "When a stakeholder disagrees with a data-driven UX decision, how do you defend your design while maintaining a collaborative relationship?",
                "How do you stay current with evolving design systems and component-based UI architectures?",
                "Describe a project where you had to simplify a complex user flow. What was the measurable impact on conversion?",
                "What is your philosophy on 'Mobile First' vs 'Responsive' design in 2026?"
            ]
        else:
            responses = [
                f"As we consider you for the {request.position} role, tell me: what is the single most misunderstood aspect of this industry, and how do you navigate it?",
                "I want to hear about your strategic approach. If you were given a $1M budget to improve our operations, where would you start and why?",
                "Describe a high-stakes situation where you had to make a decision with incomplete data. What was the outcome?",
                "How do you define 'excellence' in this field, and how does your past experience demonstrate it?",
                "What is the most innovative solution you've implemented recently that challenged the status quo?"
            ]
        return {"questions": random.choice(responses)}
    
    final_resume_context = request.resume_context or ""
    if current_user and current_user.bio:
        final_resume_context = f"User Bio: {current_user.bio}\n\n{final_resume_context}"
    
    prompt = f"""
    You are a Senior Hiring Manager from a Tier-1 Tech Company (like Google, Amazon, or Meta). 
    You are conducting a rigorous interview for a {request.position} position.
    
    Candidate Context (CV/Background):
    {final_resume_context if final_resume_context else 'Not provided'}
    
    Your Objective:
    1. AVOID 'DUMB' OR GENERIC QUESTIONS (e.g., 'What are your strengths?', 'Tell me about yourself').
    2. Ask SHARP, TECHNICAL, or STRATEGIC questions that reveal the candidate's TRUE depth.
    3. Dig into SPECIFIC details of their mentioned projects or the role's core challenges.
    4. Respond BRIEFLY to their last answer (e.g., 'That's a sound architectural choice' or 'I see your point about X') and then MOVE DIRECTLY to the next challenging question.
    5. ASK ONLY ONE QUESTION AT A TIME.
    
    The language for the response must be: {final_resume_context.split('Language: ')[-1].split('\n')[0] if 'Language: ' in (final_resume_context or '') else 'Match the candidate'}
    
    Provide ONLY the spoken text of the interviewer. Be elite, professional, and intellectually demanding.
    """
    
    response = model.generate_content(prompt)
    return {"questions": response.text}

@app.post("/match-jobs")
async def match_jobs(request: JobMatchRequest, current_user: Optional[User] = Depends(get_current_user)):
    if not model or not GEMINI_API_KEY:
        # High-quality realistic mock data
        return {
            "matches": [
                {
                    "id": "1",
                    "title": "Junior Frontend Developer",
                    "company": "TechFlow Systems",
                    "location": "Remote / Almaty",
                    "type": "Full-time",
                    "description": "Building modern React applications with Vite and Tailwind. Focus on performance and accessibility.",
                    "skills": ["React", "JavaScript", "CSS"],
                    "link": "https://techflow.example.com/jobs/1"
                },
                {
                    "id": "2",
                    "title": "Software Engineering Intern",
                    "company": "DataScale AI",
                    "location": "Astana / Hybrid",
                    "type": "Internship",
                    "description": "Work on backend scaling issues using Python and FastAPI. Assist in training small language models.",
                    "skills": ["Python", "SQL", "API Design"],
                    "link": "https://datascale.example.com/careers/intern"
                },
                {
                    "id": "3",
                    "title": "UI/UX Design Intern",
                    "company": "CreativePulse",
                    "location": "Remote",
                    "type": "Internship",
                    "description": "Design interactive prototypes and user flows for a new fintech mobile app.",
                    "skills": ["Figma", "UI Design", "User Research"],
                    "link": "https://creativepulse.example.com/apply"
                }
            ]
        }
    
    prompt = f"""
    Based on this profile: {request.profile}
    And these interests: {', '.join(request.interests)}
    
    Acts as a real-world Job Search Engine. Generate 5 REALISTIC-LOOKING job vacancies that match this user.
    Provide the response strictly as a JSON list of objects with keys: 
    'id', 'title', 'company', 'location', 'type', 'description', 'skills' (list), 'link'.
    """
    
    response = model.generate_content(prompt)
    try:
        # Extract JSON from markdown if Gemini wraps it
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        jobs = json.loads(cleaned_text)
        return {"matches": jobs}
    except:
        return {"matches": [], "error": "Failed to parse job data"}

@app.post("/generate-cover-letter")
async def generate_cover_letter(request: CoverLetterRequest, current_user: Optional[User] = Depends(get_current_user)):
    if not model or not GEMINI_API_KEY:
        return {
            "cover_letter": "Dear Hiring Manager,\n\nI am excited to apply for the position. With my background in technology and passion for innovation, I am confident I would be a great fit for your team.\n\nThank you for your consideration.\n\nBest regards,\n[Your Name]"
        }
    
    user_bio_context = f"User Bio: {current_user.bio}\n\n" if current_user and current_user.bio else ""
    
    prompt = f"""
    Generate a personalized cover letter using this resume and job description.
    
    {user_bio_context}
    Resume:
    {request.resume_text}
    
    Job Description:
    {request.job_description}
    
    Make it professional, engaging, and highlight specific achievements from the resume that match the job.
    """
    
    response = model.generate_content(prompt)
    return {"cover_letter": response.text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
