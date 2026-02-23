# Private Network Manager (PNM)

PNM is a TypeScript monorepo with:
- Fastify backend (`/backend`)
- Next.js + Tailwind frontend (`/frontend`)
- PostgreSQL + Redis + BullMQ provisioning worker
- Docker Compose + Nginx reverse proxy

## API Routes

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/sessions`

### Users
- `GET /api/users` (admin)
- `POST /api/users` (admin)
- `PATCH /api/users/:id` (admin)
- `GET /api/users/me/config` (authenticated)

### Dashboard
- `GET /api/dashboard/stats` (admin)
- `GET /api/dashboard/me` (authenticated)

### Servers
- `GET /api/servers` (admin)
- `POST /api/servers` (admin)
- `PATCH /api/servers/:id` (admin)
- `DELETE /api/servers/:id` (admin)

### Provisioning
- `POST /api/provision` (admin)

### Misc
- `GET /api/health`

## Frontend Routes
- `/login`
- `/admin/users`
- `/admin/servers`
- `/dashboard`

## Run with Docker

```bash
cd pnm
cp .env.example .env
docker compose up --build
```

Default seeded admin credentials:
- Email: `admin@pnm.local`
- Password: `AdminPass123`

## Backend Tests

```bash
cd pnm/backend
npm test
```
