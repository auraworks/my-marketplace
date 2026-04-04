---
name: cloudflare-stream
description: Cloudflare Stream 동영상 업로드 및 스트리밍 서비스 구축. FastAPI 서버로 동영상을 Cloudflare Stream에 업로드하고 HLS 스트리밍 URL을 반환하는 REST API 서버 생성. 동영상 업로드(파일/URL), 상태 확인, 목록 조회, 삭제 기능 포함. Cloudflare Stream API 연동, multipart/form-data 업로드, direct_upload URL 방식 사용. 키워드: cloudflare, stream, video upload, 동영상 업로드, 스트리밍, HLS, FastAPI, 영상 서비스.
---

# Cloudflare Stream 동영상 업로드 서비스

Cloudflare Stream을 이용한 동영상 업로드 및 HLS 스트리밍 FastAPI 서버를 구축합니다.

## 자동 실행 지침 (Claude Code용)

**이 스킬이 호출되면 다음 단계를 자동으로 수행합니다:**

### Step 1: 환경변수 확인

`.env` 파일을 읽어서 다음 변수 확인:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

없으면 `.env` 파일 생성 안내:

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

**Cloudflare 정보 확인 방법:**
- Account ID: Cloudflare Dashboard 우측 사이드바
- API Token: My Profile → API Tokens → Create Token → `Stream:Edit` 권한 필요

### Step 2: 의존성 설치

`requirements.txt` 또는 `pyproject.toml` 확인 후 패키지 설치:

```bash
pip install fastapi uvicorn httpx python-dotenv python-multipart
```

### Step 3: 서버 파일 생성

`scripts/main.py`를 프로젝트에 복사하거나, 기존 서버가 있으면 아래 엔드포인트 패턴을 참고하여 통합합니다.

### Step 4: 서버 실행

```bash
uvicorn main:app --reload --port 8000
```

### Step 5: 완료 안내

사용자에게 다음 정보 제공:
- ✅ FastAPI 서버 설정 완료
- 🎬 `POST /upload/file` — 로컬 파일 업로드
- 🔗 `POST /upload/url` — 외부 URL 업로드
- 📊 `GET /status/{video_id}` — 처리 상태 확인
- 📋 `GET /videos` — 전체 목록 조회
- 🗑️ `DELETE /video/{video_id}` — 동영상 삭제

---

## 핵심 구조

```
프로젝트/
├── main.py          # FastAPI 서버 (scripts/main.py 참조)
├── .env             # Cloudflare 인증 정보
└── requirements.txt
```

## API 엔드포인트

### POST /upload/file — 파일 업로드

Cloudflare `direct_upload` URL을 발급받아 `multipart/form-data`로 전송합니다.

```python
# 업로드 흐름
# 1. POST /stream/direct_upload → 서명된 uploadURL + video_id 발급
# 2. 발급된 uploadURL로 multipart/form-data POST 전송
# 3. video_id로 스트리밍 URL 구성하여 반환
```

> **핵심**: raw bytes 전송 (`Content-Type: video/mp4`) 시 Cloudflare에서
> `Decoding Error` 발생. 반드시 `files={"file": (filename, content, "video/mp4")}` 사용.

```bash
curl -X POST http://localhost:8000/upload/file \
  -F "file=@video.mp4"
```

### POST /upload/url — URL로 업로드

```bash
curl -X POST http://localhost:8000/upload/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/video.mp4", "name": "My Video"}'
```

### GET /status/{video_id} — 상태 확인

| status 값    | 의미                    |
|--------------|-------------------------|
| `pending`    | 처리 대기 중            |
| `inprogress` | 인코딩 중               |
| `ready`      | 스트리밍 준비 완료      |
| `error`      | 처리 실패               |

업로드 직후에는 `pending` 상태이며, 처리 완료 후 `ready`가 됩니다.

### GET /videos — 목록 조회

### DELETE /video/{video_id} — 삭제

---

## 스트리밍 URL 패턴

```
HLS:       https://{ACCOUNT_ID}.cloudflarestream.com/{VIDEO_ID}/manifest/video.m3u8
썸네일:    https://{ACCOUNT_ID}.cloudflarestream.com/{VIDEO_ID}/thumbnails/thumbnail.jpg
```

---

## 주요 구현 패턴

### httpx로 multipart 업로드

```python
file_content = await file.read()

async with httpx.AsyncClient(timeout=600) as client:
    upload_response = await client.post(
        upload_url,
        files={"file": (file.filename, file_content, "video/mp4")},
    )
```

### 스트리밍 URL 생성

```python
def build_streaming_urls(video_id: str) -> tuple[str, str]:
    subdomain = f"{CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com"
    streaming_url = f"https://{subdomain}/{video_id}/manifest/video.m3u8"
    thumbnail_url = f"https://{subdomain}/{video_id}/thumbnails/thumbnail.jpg"
    return streaming_url, thumbnail_url
```

---

## 오류 처리

| 오류 | 원인 | 해결 |
|------|------|------|
| `Decoding Error` | raw bytes 업로드 | `multipart/form-data` 사용 |
| `401 Unauthorized` | API 토큰 오류 | `Stream:Edit` 권한 확인 |
| `404 Not Found` | 잘못된 video_id | video_id 재확인 |
| `credentials not configured` | .env 없음 | .env 파일 생성 |

---

## 참고 자료

- 상세 API 사용법: `references/api-guide.md`
- 완성된 서버 코드: `scripts/main.py`
