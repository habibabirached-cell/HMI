# Databank FastAPI (WP5 Option B)

Serves windowed Aug14 series without rewriting GE samples.

```bash
npm run api:install   # once
npm run api           # http://127.0.0.1:8000
```

Vite proxies `/api` → `:8000` in `npm start` / `npm run dev`.

| Endpoint | Example |
|----------|---------|
| Health | `GET /api/v1/health` |
| Series | `GET /api/v1/series/CFG1/SCL?phase=pre` |
| | `GET /api/v1/series/CFG1/SCL?phase=post` |

`phase=pre` ≈ 2 s before Excel event time · `phase=post` = event → end of source file.

Static fallback (Option A): `npm run prepare:databank` → `public/databank/CFG*/{EVENT}.{pre|post|}.csv`.
