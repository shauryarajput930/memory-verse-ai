import os
import re
from dotenv import load_dotenv

# Patch regex before creating Supabase client if using new key format (e.g. sb_secret_...)
_orig_match = re.match
def _patched_match(pattern, string, *args, **kwargs):
    if isinstance(pattern, str) and ("A-Za-z0-9" in pattern or "^[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+" in str(pattern)):
        return True
    return _orig_match(pattern, string, *args, **kwargs)
re.match = _patched_match

import cloudinary
import cloudinary.uploader
from supabase import create_client, Client

load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
re.match = _orig_match

# Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

