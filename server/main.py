import os
import random
import json
import time
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
import httpx

load_dotenv()

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./career_ai.db")
SECRET_KEY = os.getenv("SECRET_KEY", "yoursecretkeyhere")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    bio = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    profile = Column(Text)
    interests = Column(String)
    results_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserProfile(BaseModel):
    name: str
    email: str
    bio: str

class Token(BaseModel):
    access_token: str
    token_type: str

class JobMatchRequest(BaseModel):
    profile: str
    interests: List[str]

class ResumeAnalysisRequest(BaseModel):
    resume_text: str

class InterviewRequest(BaseModel):
    position: str
    experience_level: str
    resume_context: Optional[str] = ""

class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str

# Auth Utilities
def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl="login")), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError: raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None: raise credentials_exception
    return user

app = FastAPI(title="AI Career Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# GEMINI AI SETUP - Multiple models for maximum reliability
# ============================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAMES = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"]

ai_models = []
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    for name in MODEL_NAMES:
        try:
            ai_models.append(genai.GenerativeModel(name))
            print(f"[AI] Loaded model: {name}")
        except Exception as e:
            print(f"[AI] Could not load {name}: {e}")

print(f"[AI] Total available models: {len(ai_models)}")

def safe_generate(prompt):
    """Try each model in order until one works. Never crash."""
    if not ai_models:
        print("[AI] No models available!")
        return None
    
    for i, model in enumerate(ai_models):
        try:
            resp = model.generate_content(prompt)
            if resp and resp.text:
                return resp.text
        except Exception as e:
            err_str = str(e)
            print(f"[AI] Model {i} failed: {err_str[:120]}")
            if "429" in err_str or "ResourceExhausted" in err_str:
                # Rate limited - try next model immediately
                continue
            elif "404" in err_str:
                # Model doesn't exist - try next
                continue
            else:
                # Unknown error - try next
                continue
    
    print("[AI] ALL models failed.")
    return None

# ============================================================

@app.get("/")
async def root():
    return {"message": "AI Career Assistant API is running"}

@app.post("/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user: raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(name=user.name, email=user.email, hashed_password=get_password_hash(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"access_token": create_access_token(data={"sub": new_user.email}), "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

@app.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return {"name": current_user.name, "email": current_user.email, "bio": current_user.bio or ""}

@app.post("/update-profile")
async def update_profile(profile: UserProfile, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.name = profile.name
    current_user.bio = profile.bio
    db.commit()
    return {"message": "Profile updated successfully"}

@app.get("/search-history")
async def get_search_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).order_by(SearchHistory.created_at.desc()).limit(10).all()
    return {"history": history}

async def fetch_hh_vacancies(query: str, area: int = 40):
    url = "https://api.hh.ru/vacancies"
    params = {"text": query, "area": area, "per_page": 10}
    headers = {"User-Agent": "AI-Career-Assistant/1.0"}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json().get("items", [])
        except: pass
    return []

@app.post("/match-jobs")
async def match_jobs(request: JobMatchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    queries = request.interests[:3]
    all_hh_jobs = []
    for q in queries:
        jobs = await fetch_hh_vacancies(q)
        all_hh_jobs.extend(jobs)
    
    if not all_hh_jobs: all_hh_jobs = await fetch_hh_vacancies("Software Engineer Intern")

    job_candidates = []
    for j in all_hh_jobs[:15]:
        job_candidates.append({
            "id": j.get("id"),
            "title": j.get("name"),
            "company": j.get("employer", {}).get("name"),
            "location": j.get("area", {}).get("name"),
            "type": j.get("employment", {}).get("name", "Full-time"),
            "description": (j.get("snippet", {}).get("requirement", "") or "") + " " + (j.get("snippet", {}).get("responsibility", "") or ""),
            "skills": [],
            "link": j.get("alternate_url")
        })

    prompt = f"You are an AI career advisor. Select the 5 best matching jobs from the list below for this user.\n\nUser Profile: {request.profile}\nInterests: {', '.join(request.interests)}\nJob Candidates:\n{json.dumps(job_candidates, ensure_ascii=False)}\n\nReturn ONLY a valid JSON array with keys: id, title, company, location, type, description, skills (list of strings), link. No extra text."
    
    res_text = safe_generate(prompt)
    if res_text:
        try:
            cleaned = res_text.replace('```json', '').replace('```', '').strip()
            jobs = json.loads(cleaned)
            new_h = SearchHistory(user_id=current_user.id, profile=request.profile, interests=", ".join(request.interests), results_count=len(jobs))
            db.add(new_h)
            db.commit()
            return {"matches": jobs}
        except: pass
    
    return {"matches": job_candidates[:5]}

@app.post("/analyze-resume")
async def analyze_resume(request: ResumeAnalysisRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""You are a professional resume reviewer. Analyze the following resume and provide detailed feedback.

Resume:
{request.resume_text}

Respond with a JSON object containing:
- "score": a number 0-100
- "strengths": list of 3-5 strengths
- "weaknesses": list of 3-5 weaknesses  
- "suggestions": list of 3-5 actionable improvements
- "raw": a 2-3 paragraph detailed summary

Return ONLY valid JSON, no extra text."""

    res_text = safe_generate(prompt)
    if res_text:
        return {"analysis": res_text}
    return {"analysis": "AI is temporarily unavailable. Please try again in a minute."}

class FixResumeRequest(BaseModel):
    resume_text: str
    analysis_feedback: Optional[str] = ""

@app.post("/fix-resume")
async def fix_resume(request: FixResumeRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""You are a world-class professional resume writer. Your job is to take the user's original resume and rewrite it into a polished, improved version.

ORIGINAL RESUME:
{request.resume_text}

ANALYSIS FEEDBACK (issues to fix):
{request.analysis_feedback}

INSTRUCTIONS:
1. Keep ALL the user's real information (name, contacts, education, experience, projects) — do NOT invent anything.
2. Fix grammar, spelling, and formatting issues.
3. Rewrite bullet points to use strong action verbs and quantify achievements where possible.
4. Improve the professional summary / objective section.
5. Organize sections in the best order (Contact → Summary → Experience → Education → Skills → Projects).
6. Make it ATS-friendly.
7. If the user's resume is in Russian or Kazakh, keep it in that language but improve it professionally.
8. Output ONLY the improved resume text, ready to copy-paste. No extra commentary."""

    res_text = safe_generate(prompt)
    if res_text:
        return {"fixed_resume": res_text}
    return {"fixed_resume": "AI is temporarily unavailable. Please try again in a minute."}

@app.post("/generate-interview-questions")
async def generate_questions(request: InterviewRequest, current_user: User = Depends(get_current_user)):
    # The resume_context field carries the full conversation context from the Voice Coach
    context = request.resume_context or ""
    
    prompt = f"""You are an experienced interview coach conducting a practice interview for the position of: {request.position}

Here is the conversation context:
{context}

IMPORTANT RULES:
1. You MUST read and understand what the user just said.
2. If the user answered a question, give brief feedback on their answer (what was good, what could be better), then ask a new follow-up question.
3. If this is the start of the interview, introduce yourself briefly and ask the first question.
4. Ask only ONE question at a time.
5. Be professional but encouraging and warm.
6. If the user speaks in Russian or Kazakh, respond in the same language.
7. Keep your response concise (2-4 sentences max).
8. Make questions relevant to the position: {request.position}

Respond naturally as a real interviewer would."""

    res_text = safe_generate(prompt)
    if res_text:
        return {"questions": res_text}
    return {"questions": "I apologize, I'm having a brief technical issue. Could you repeat what you said? I want to make sure I give you the best feedback."}

@app.post("/generate-cover-letter")
async def generate_cover_letter(request: CoverLetterRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""You are an expert career consultant. Write a compelling, personalized cover letter.

Resume:
{request.resume_text}

Job Description:
{request.job_description}

Write a professional cover letter that:
1. Is personalized to the specific job
2. Highlights relevant experience from the resume
3. Shows enthusiasm and fit for the role
4. Is 3-4 paragraphs long
5. Does NOT use generic placeholders like [Company Name] - use real details from the job description"""

    res_text = safe_generate(prompt)
    if res_text:
        return {"cover_letter": res_text}
    return {"cover_letter": "AI is temporarily unavailable. Please try again in a minute."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
