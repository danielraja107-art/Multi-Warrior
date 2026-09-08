# Storm Arena — Environment Variables

## Server

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | Colyseus WebSocket server port | No | `2567` |
| `NODE_ENV` | Environment mode | No | `development` |

> `CORS_ORIGIN` is not yet used. It will be introduced later (Phase 9) when the HTTP/REST layer (Express) is added.

## Database (Phase 8+)

| Variable | Description | Required | Default |
|---|---|---|---|
| `DATABASE_URL` | Database connection string | No | — |

## Shared

No environment variables required for the shared package.