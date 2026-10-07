import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ingestion, timeline, search, auth

app = FastAPI(title="MemoryVerse AI Backend", version="1.0.0")


allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://memory-verse-ai.netlify.app",
    "https://memory-verse-ai.netlify.app/",
]
production_origin = os.getenv("FRONTEND_URL")
if production_origin:
    for origin in production_origin.split(","):
        clean_origin = origin.strip().rstrip("/")
        if clean_origin:
            if clean_origin not in allowed_origins:
                allowed_origins.append(clean_origin)
            with_slash = clean_origin + "/"
            if with_slash not in allowed_origins:
                allowed_origins.append(with_slash)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ingestion.router)
app.include_router(timeline.router)
app.include_router(search.router)
app.include_router(auth.router)



@app.get("/")
@app.head("/")
def read_root():
    return {"message": "Welcome to MemoryVerse AI Backend", "version": "1.0.0", "status": "ok"}


@app.get("/health")
@app.head("/health")
@app.options("/health")
@app.get("/api/health")
@app.head("/api/health")
@app.options("/api/health")
@app.get("/api/ping")
def health_check():
    return {"status": "ok", "service": "memory-verse-ai-backend"}


