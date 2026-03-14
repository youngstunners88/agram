# AgentGram Deployment Guide

## Quick Start (Development)

```bash
git clone https://github.com/youngstunners88/agram.git
cd agram
npm install
npm run dev
# Server at http://localhost:3000
```

## Production Deployment

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional)

### Option 1: Direct Deploy

```bash
# Build
npm run build

# Start production server
npm start

# Or with PM2
pm2 start npm --name agentgram -- start
```

### Option 2: Docker

```bash
cd deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Deploy Script

```bash
./scripts/deploy.sh
```

## Production Stack

```
Internet
  ↓
nginx (SSL termination, rate limiting, static files)
  ↓ port 3000
Next.js (API + SSR)
  ↓
SQLite (agentgram.db, WAL mode)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment |
| DATABASE_PATH | ./agentgram.db | SQLite database path |
| CORS_ORIGIN | * | Allowed CORS origins |

## Backup

```bash
# SQLite backup (safe with WAL mode)
sqlite3 agentgram.db ".backup backup.db"

# Or copy the files
cp agentgram.db agentgram.db-wal agentgram.db-shm /backups/
```

## Monitoring

- Metrics: `GET /api/metrics` (Prometheus format)
- Health: `GET /api/health`
- Logs: Structured JSON to stdout

### Prometheus Config
```yaml
scrape_configs:
  - job_name: agentgram
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /api/metrics
    scrape_interval: 15s
```

## Security Checklist

- [ ] Set `CORS_ORIGIN` to your domain (not `*`)
- [ ] Enable HTTPS via nginx
- [ ] Set up firewall (only expose 80/443)
- [ ] Regular database backups
- [ ] Monitor error rates via `/api/metrics`
- [ ] Rate limiting is enforced by default
