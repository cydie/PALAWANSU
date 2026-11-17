# Palawan State University – Rizal Campus  
## Student Deficiency Monitoring System

Web system for the **Office of the Registrar** to track documentary deficiencies of **Freshman**, **Transferee**, and **Graduating** students at **Palawan State University – Rizal Campus**.

## Stack

- Next.js 15 (React) + PostgreSQL
- Bootstrap 5 + Bootstrap Icons
- Branding: Rizal Campus logo + PSU seal watermark

## How to run

### Option A — Docker (recommended)

1. Open **Docker Desktop** and wait until it is running.
2. In this folder:

```bash
docker compose up --build
```

3. Open **http://localhost:3000/**

### Option B — Local (Node + PostgreSQL)

1. Start PostgreSQL and create database `palawansu_deficiency` (or use Docker only for Postgres).
2. Copy `.env.example` to `.env.local` if needed.
3. Initialize and seed:

```bash
npm install
npm run db:init
npm run seed
npm run dev
```

Or double-click **`start-dev.bat`**.

4. Open **http://localhost:3000/**

## Demo accounts

| Username    | Password         | Role      |
|-------------|------------------|-----------|
| `admin`     | `Admin@123`      | Admin     |
| `registrar` | `Registrar@123`  | Registrar |
| `student`   | `Student@123`    | Freshman  |

## Official workflow

1. **Admin / Registrar** → Assign Deficiencies (single student or bulk by category)  
2. **Student** → My Deficiencies → Upload Documents (PDF/JPG/PNG) while status is Pending/Rejected  
3. **Admin / Registrar** → Verification → Approve / Clear, Mark Reviewing, or Reject (remarks required)  
4. Student receives **Notifications**; approved items become **Cleared (Completed)**  
5. **Students** → Clearance view shows open vs cleared requirements  
6. **Reports** → Open Deficiencies / Completion / Cleared Students → **Print / Save as PDF** or **Save as CSV**

**Roles:** Registrar handles day-to-day deficiency work. **Users** and **System Logs** are Admin-only.

## Reset Docker database

```bash
docker compose down -v
docker compose up --build
```
