# Cloudflare Stream API 가이드

## 사전 요구사항

### 1. Cloudflare 계정 설정

Cloudflare Dashboard에서 다음 정보를 확인하세요:

- **Account ID**: Dashboard URL 또는 우측 사이드바에서 확인
- **API Token**: My Profile → API Tokens → Create Token
  - 필요 권한: `Stream:Edit`

### 2. 환경변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

### 3. 의존성 설치

```bash
pip install fastapi uvicorn httpx python-dotenv python-multipart
```

또는 requirements.txt 사용:

```bash
pip install -r requirements.txt
```

---

## API 엔드포인트 사용법

### 서버 시작

```bash
uvicorn main:app --reload --port 8000
```

### GET /health

서버 상태 확인:

```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

---

### POST /upload/file

로컬 동영상 파일을 Cloudflare Stream에 업로드합니다.

**방식**: `multipart/form-data`로 Cloudflare `direct_upload` URL에 전송

```bash
curl -X POST http://localhost:8000/upload/file \
  -F "file=@/path/to/video.mp4"
```

**응답:**

```json
{
  "success": true,
  "video_id": "ea95132c15732412d22c1476fa83f27a",
  "streaming_url": "https://ACCOUNT_ID.cloudflarestream.com/VIDEO_ID/manifest/video.m3u8",
  "thumbnail_url": "https://ACCOUNT_ID.cloudflarestream.com/VIDEO_ID/thumbnails/thumbnail.jpg",
  "created_at": "2026-04-04T12:00:00Z"
}
```

**업로드 흐름:**

1. `/stream/direct_upload` API로 서명된 업로드 URL 발급
2. 발급된 URL로 파일을 `multipart/form-data` 형식으로 전송
3. 업로드 완료 후 video_id와 스트리밍 URL 반환

> **중요**: raw bytes 전송(`Content-Type: video/mp4`)은 Cloudflare에서 Decoding Error를 유발합니다. 반드시 `multipart/form-data`를 사용하세요.

---

### POST /upload/url

외부 URL의 동영상을 Cloudflare Stream으로 복사합니다.

```bash
curl -X POST http://localhost:8000/upload/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/video.mp4", "name": "My Video"}'
```

**요청 본문:**

| 필드 | 타입   | 필수 | 설명           |
|------|--------|------|----------------|
| url  | string | ✅   | 동영상 URL     |
| name | string | ❌   | 동영상 이름    |

---

### GET /status/{video_id}

동영상 처리 상태를 확인합니다.

```bash
curl http://localhost:8000/status/ea95132c15732412d22c1476fa83f27a
```

**응답:**

```json
{
  "video_id": "ea95132c15732412d22c1476fa83f27a",
  "status": "ready",
  "streaming_url": "https://...",
  "thumbnail_url": "https://...",
  "created_at": "2026-04-04T12:00:00Z"
}
```

**status 값:**

| 값        | 의미                           |
|-----------|--------------------------------|
| `pending` | 업로드 완료, 처리 대기 중      |
| `inprogress` | 인코딩 진행 중              |
| `ready`   | 스트리밍 준비 완료             |
| `error`   | 처리 실패                      |

---

### GET /videos

Cloudflare Stream의 모든 동영상 목록을 반환합니다.

```bash
curl http://localhost:8000/videos
```

---

### DELETE /video/{video_id}

동영상을 삭제합니다.

```bash
curl -X DELETE http://localhost:8000/video/ea95132c15732412d22c1476fa83f27a
```

**응답:**

```json
{
  "success": true,
  "message": "Video ea95132c15732412d22c1476fa83f27a deleted successfully"
}
```

---

## 스트리밍 URL 구조

```
https://{ACCOUNT_ID}.cloudflarestream.com/{VIDEO_ID}/manifest/video.m3u8
```

- **HLS 스트리밍**: `.m3u8` 매니페스트 URL 사용
- **썸네일**: `.../thumbnails/thumbnail.jpg`
- **상태가 `ready`일 때만** 스트리밍 가능

## 일반적인 오류

| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| `Decoding Error` | raw bytes로 업로드 시도 | `multipart/form-data` 사용 |
| `401 Unauthorized` | API 토큰 오류 | Token 권한 확인 (Stream:Edit 필요) |
| `404 Not Found` | 잘못된 video_id | video_id 재확인 |
| `500 credentials not configured` | .env 파일 없음 | .env 파일 생성 및 환경변수 설정 |
