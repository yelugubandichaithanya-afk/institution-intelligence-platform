import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    FRONTEND_ORIGINS = [
        o.strip()
        for o in os.environ.get("FRONTEND_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500").split(",")
        if o.strip()
    ]
    DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"

    REQUIRED = ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")

    @classmethod
    def missing(cls):
        return [k for k in cls.REQUIRED if not getattr(cls, k)]
