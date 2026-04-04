import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Cloudflare Video Streaming Service", lifespan=lifespan)

CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/stream"


class UploadResponse(BaseModel):
    success: bool
    video_id: str
    streaming_url: str
    thumbnail_url: str
    created_at: str


class StatusResponse(BaseModel):
    video_id: str
    status: str
    streaming_url: str | None
    thumbnail_url: str | None
    created_at: str


class UploadByUrlRequest(BaseModel):
    url: str
    name: str | None = None


class DeleteResponse(BaseModel):
    success: bool
    message: str


def get_headers() -> dict:
    return {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
    }


def build_streaming_urls(video_id: str) -> tuple[str, str]:
    subdomain = f"{CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com"
    streaming_url = f"https://{subdomain}/{video_id}/manifest/video.m3u8"
    thumbnail_url = f"https://{subdomain}/{video_id}/thumbnails/thumbnail.jpg"
    return streaming_url, thumbnail_url


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/upload/url", response_model=UploadResponse)
async def upload_video_by_url(request: UploadByUrlRequest):
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Cloudflare credentials not configured. Check .env file.",
        )

    payload = {
        "url": request.url,
        "meta": {"name": request.name or "video"},
    }

    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            f"{BASE_URL}/copy",
            headers={**get_headers(), "Content-Type": "application/json"},
            json=payload,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cloudflare API error: {response.text}",
        )

    data = response.json()
    result = data.get("result", {})

    video_id = result.get("uid")
    streaming_url, thumbnail_url = build_streaming_urls(video_id)

    return UploadResponse(
        success=True,
        video_id=video_id,
        streaming_url=streaming_url,
        thumbnail_url=thumbnail_url,
        created_at=result.get("createdAt", datetime.utcnow().isoformat() + "Z"),
    )


@app.post("/upload/file", response_model=UploadResponse)
async def upload_video_file(file: UploadFile = File(...)):
    """
    Upload a local video file using direct upload URL from Cloudflare.
    Gets a signed upload URL and uploads the file as multipart/form-data.
    """
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Cloudflare credentials not configured. Check .env file.",
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Step 1: Get signed upload URL
    async with httpx.AsyncClient(timeout=30) as client:
        init_response = await client.post(
            f"{BASE_URL}/direct_upload",
            headers=get_headers(),
            json={"filename": file.filename, "maxDurationSeconds": 36000},
        )

    if init_response.status_code != 200:
        raise HTTPException(
            status_code=init_response.status_code,
            detail=f"Cloudflare API error: {init_response.text}",
        )

    init_data = init_response.json()
    result = init_data.get("result", {})
    upload_url = result.get("uploadURL")
    video_id = result.get("uid")

    if not upload_url:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get upload URL from Cloudflare. Response: {init_response.text}",
        )

    # Step 2: Read file content and upload as multipart/form-data
    file_content = await file.read()

    # Step 3: Upload using multipart/form-data (required by Cloudflare direct upload URL)
    async with httpx.AsyncClient(timeout=600) as client:
        upload_response = await client.post(
            upload_url,
            files={"file": (file.filename, file_content, "video/mp4")},
        )

    if upload_response.status_code not in (200, 201):
        raise HTTPException(
            status_code=upload_response.status_code,
            detail=f"Upload failed: {upload_response.text}",
        )

    streaming_url, thumbnail_url = build_streaming_urls(video_id)

    return UploadResponse(
        success=True,
        video_id=video_id,
        streaming_url=streaming_url,
        thumbnail_url=thumbnail_url,
        created_at=result.get("createdAt", datetime.utcnow().isoformat() + "Z"),
    )


@app.get("/status/{video_id}", response_model=StatusResponse)
async def get_video_status(video_id: str):
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Cloudflare credentials not configured. Check .env file.",
        )

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{BASE_URL}/{video_id}",
            headers=get_headers(),
        )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Video not found")
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cloudflare API error: {response.text}",
        )

    data = response.json()
    result = data.get("result", {})
    state = result.get("status", {}).get("state", "unknown")

    streaming_url, thumbnail_url = None, None
    if state == "ready":
        streaming_url, thumbnail_url = build_streaming_urls(video_id)

    return StatusResponse(
        video_id=video_id,
        status=state,
        streaming_url=streaming_url,
        thumbnail_url=thumbnail_url,
        created_at=result.get("createdAt", ""),
    )


@app.delete("/video/{video_id}", response_model=DeleteResponse)
async def delete_video(video_id: str):
    """Delete a video from Cloudflare Stream."""
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Cloudflare credentials not configured. Check .env file.",
        )

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.delete(
            f"{BASE_URL}/{video_id}",
            headers=get_headers(),
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cloudflare API error: {response.text}",
        )

    return DeleteResponse(
        success=True,
        message=f"Video {video_id} deleted successfully",
    )


@app.get("/videos")
async def list_videos():
    """List all videos in Cloudflare Stream."""
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Cloudflare credentials not configured. Check .env file.",
        )

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            BASE_URL,
            headers=get_headers(),
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Cloudflare API error: {response.text}",
        )

    data = response.json()
    return data.get("result", [])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
