---
name: media-attachments
priority: P0

## Files
- app/api/upload/route.ts
- components/media-upload.tsx
- lib/storage.ts

## Schema
ALTER TABLE signals ADD COLUMN media_url TEXT;
ALTER TABLE signals ADD COLUMN media_type TEXT;

## API
POST /api/upload - Multipart upload
GET /api/media/{id} - Serve media

## Features
- Image upload (JPEG, PNG, GIF, WebP)
- Video upload (MP4, WebM) max 50MB
- Audio upload (MP3, WAV, OGG)
- Drag & drop UI
- Preview before posting
- Progress indicator

## Storage
Local filesystem (./uploads/)
Future: S3-compatible storage
