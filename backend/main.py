import io
import uuid
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from gtts import gTTS
import pytesseract
from PIL import Image

from sqlalchemy.orm import Session

from database import get_db, PatientModel, CaseModel
#language dictionaries
SUPPORTED_LANGUAGES = {
    "English": {"code": "en", "voice_code": "en-US"},
    "Tamil": {"code": "ta", "voice_code": "ta-IN"},
    "Hindi": {"code": "hi", "voice_code": "hi-IN"},
    "Telugu": {"code": "te", "voice_code": "te-IN"},
    "Malayalam": {"code": "ml", "voice_code": "ml-IN"},
    "Kannada": {"code": "kn", "voice_code": "kn-IN"}
}
#FastAPI initialization
app = FastAPI(
    title="Multilingual Patient Case-Taking API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class StartSessionRequest(BaseModel):
    language: str


class VoicePromptRequest(BaseModel):
    language: str
    step_key: str


class SubmitStepRequest(BaseModel):
    patient_db_id: str
    case_db_id: str
    step_key: str
    response_text: str

class ReviewStatusUpdate(BaseModel):
    case_id: str
    doctor_notes: Optional[str] = ""
    status: str = "REVIEWED"
  
  if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
