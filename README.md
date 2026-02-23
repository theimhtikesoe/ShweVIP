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

## Real WireGuard Setup (Production)

`PROVISION_DRY_RUN=true` only simulates provisioning.  
To make clients connect from iPhone/Android/desktop, complete these steps:

1. Prepare a public Linux VPS (Ubuntu/Debian) with a public IPv4.
2. Bootstrap WireGuard on that VPS:

```bash
sudo bash ops/setup-wireguard-server.sh --public-nic eth0 --port 51820 --interface wg0 --server-cidr 10.10.0.1/16
```

3. Copy output values:
- `Server public key`
- `Suggested endpoint` (public IP/domain with port)

4. Configure Railway backend + worker variables (same values on both services):
- `PROVISION_DRY_RUN=false`
- `WG_INTERFACE=wg0`
- `WG_SERVER_PUBLIC_KEY=<server public key>`
- `WG_SERVER_ENDPOINT=<public-domain-or-ip>:51820`
- `PROVISION_SERVICE_RELOAD_CMD=wg-quick save wg0`
- `PROVISION_SSH_USER=root`
- `PROVISION_SSH_PRIVATE_KEY_B64=<base64 of your SSH private key>`

5. Redeploy both Railway services:
- `backend`
- `worker`

6. In admin panel:
- Add VPN node using the VPS public IP.
- Create user (or run manual provision).

7. In user dashboard:
- `Download Config` or `Download QR`.
- Import into WireGuard app.

### SSH Key Base64 helper

```bash
base64 -i ~/.ssh/id_rsa | tr -d '\n'
```

Use the output as `PROVISION_SSH_PRIVATE_KEY_B64`.
