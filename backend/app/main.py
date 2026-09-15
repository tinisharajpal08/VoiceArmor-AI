import sys
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routes import health, analyze, speakers, verify, demo, incidents, dashboard, analytics

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

# Initialize SQLite database tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="VoiceArmor AI Cybersecurity Defense System against Voice Impersonation Attacks (SIH26104 Prototype)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(speakers.router)
app.include_router(verify.router)
app.include_router(demo.router)
app.include_router(incidents.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi"):
            return FileResponse(FRONTEND_DIST / "index.html")

        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)

        return FileResponse(FRONTEND_DIST / "index.html")

@app.get("/", include_in_schema=False)
def root():
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")

    return {
        "product": "VoiceArmor AI",
        "tagline": "Detect • Verify • Assess • Prevent",
        "description": "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks",
        "docs": "/docs",
        "status": "RUNNING"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
