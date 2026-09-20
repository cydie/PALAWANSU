# PalawanSU–Rizal Student Deficiency Monitoring System

Web app for tracking documentary deficiencies of **Freshman**, **Transferee**, and **Graduating** students at Palawan State University – Rizal Campus.

## Stack

- **Next.js 15 (React)** + npm
- **PostgreSQL**
- Bootstrap 5 + Bootstrap Icons (responsive on phone, tablet, and desktop)

## Trial and error (local)

### 1. PostgreSQL

PostgreSQL should already be running on `127.0.0.1:5432`.

Copy env values if needed:

```bash
copy .env.example .env.local
```

Edit `.env.local` so `PGPASSWORD` matches your postgres password.

Create tables:

```bash
npm run db:init
```

### 2. Install and seed

```bash
npm install
npm run seed
```

### 3. Start

```bash
npm run dev
```

Open **http://localhost:3000/**

| Username    | Password         | Role      |
|-------------|------------------|-----------|
| `admin`     | `Admin@123`      | Admin     |
| `registrar` | `Registrar@123`  | Registrar |
| `student`   | `Student@123`    | Student   |

## Suggested test path

1. Log in as **admin** or **registrar** → Assign Deficiencies
2. Log in as **student** → upload a PDF/JPG
3. As admin/registrar → Verification → Approve or Reject
4. Check student Notifications

Refresh the browser after UI edits. Restart `npm run dev` only if you change `.env.local`.

## Docker PostgreSQL (optional)

```bash
docker compose up -d
npm run db:init
npm run seed
npm run dev
```
