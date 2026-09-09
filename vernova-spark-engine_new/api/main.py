"""
WP5 Option B — FastAPI databank series API.
Serves windowed CSV (phase=pre|post|full) without rewriting GE samples.

  GET /api/v1/series/{cfg}/{event}?phase=pre|post|full
  GET /api/v1/health
  GET /api/v1/catalogue

Run:  python -m api.main --reload
  or: npm run api
"""
from __future__ import annotations

import argparse
import os
import socket
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse

from api.databank_io import crop_to_csv_text, list_available, resolve_source_root, Phase

from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).resolve().parent.parent
PORT_FILE = ROOT_DIR / ".fastapi-port"


def save_port(port: int) -> None:
    try:
        PORT_FILE.write_text(str(port).strip(), encoding="utf-8")
    except Exception as e:
        print(f"[FastAPI] Warning: Failed to write {PORT_FILE}: {e}")


def cleanup_port() -> None:
    try:
        if PORT_FILE.is_file():
            PORT_FILE.unlink()
    except Exception:
        pass


def find_available_port(start_port: int = 8001, max_attempts: int = 100) -> int:
    env_port = os.environ.get("FASTAPI_PORT") or os.environ.get("PORT")
    if env_port:
        try:
            return int(env_port)
        except ValueError:
            pass

    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue

    # Fallback to dynamic OS-assigned ephemeral port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not PORT_FILE.is_file():
        env_port = os.environ.get("FASTAPI_PORT") or os.environ.get("PORT")
        if env_port:
            try:
                save_port(int(env_port))
            except ValueError:
                save_port(8001)
        else:
            save_port(8001)
    yield
    cleanup_port()




app = FastAPI(title="Verona Spark Databank API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")

def health():
    root = resolve_source_root()
    return {
        "ok": True,
        "source": str(root),
        "exists": root.is_dir(),
    }


@app.get("/api/v1/catalogue")
def catalogue():
    return {"events": list_available()}


@app.get("/api/v1/series/{cfg}/{event}")
def series(
    cfg: str,
    event: str,
    phase: Phase = Query("post", description="pre (~2s before event), post (event→end), full"),
):
    try:
        text = crop_to_csv_text(cfg, event, phase)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not text.strip():
        raise HTTPException(status_code=404, detail="Empty crop")
    return PlainTextResponse(text, media_type="text/csv; charset=utf-8")


@app.get("/")
def root():
    return JSONResponse(
        {
            "service": "verona-databank-api",
            "docs": "/docs",
            "health": "/api/v1/health",
            "series": "/api/v1/series/{cfg}/{event}?phase=pre|post|full",
        }
    )


def run() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(description="Start Verona Spark Databank FastAPI server")
    parser.add_argument("--port", type=int, default=None, help="Port to listen on (auto-detects if busy)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address to bind")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()

    port = args.port or find_available_port(8001)
    save_port(port)
    print(f"\n=======================================================")
    print(f" [FastAPI] Verona Spark Databank API running on:")
    print(f"           http://{args.host}:{port}")
    print(f"=======================================================\n")
    try:
        uvicorn.run("api.main:app", host=args.host, port=port, reload=args.reload)
    finally:
        cleanup_port()


if __name__ == "__main__":
    run()

