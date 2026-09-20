# PalawanSU–Rizal Student Deficiency Monitoring System

Web app for tracking documentary deficiencies of **Freshman**, **Transferee**, and **Graduating** students at Palawan State University – Rizal Campus.

## Stack

- **Next.js 15 (React)** + Docker
- **PostgreSQL** (inside Docker — no password to type)
- Bootstrap 5 + Bootstrap Icons (responsive on phone, tablet, and desktop)

## Run with Docker

1. Open **Docker Desktop** and wait until it is running.
2. In this folder:

```bash
docker compose up --build
```

3. Open **http://localhost:3000/**

No `.env.local` and no PostgreSQL password. Docker starts the database and the website together.

| Username    | Password         | Role      |
|-------------|------------------|-----------|
| `admin`     | `Admin@123`      | Admin     |
| `registrar` | `Registrar@123`  | Registrar |
| `student`   | `Student@123`    | Student   |

Stop it with `Ctrl+C`, or in another terminal: `docker compose down`.

If an old Docker database was created before this setup, reset it once:

```bash
docker compose down -v
docker compose up --build
```

## Suggested test path

1. Log in as **admin** or **registrar** → Assign Deficiencies
2. Log in as **student** → upload a PDF/JPG
3. As admin/registrar → Verification → Approve or Reject
4. Check student Notifications
