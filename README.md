# 🚀 API Absensi WFH & Monitoring Karyawan (NestJS Monorepo)

Backend microservice architecture dibangun dengan **NestJS Monorepo**, **Casbin RBAC**, **Prisma ORM**, dan **PostgreSQL**.

---

## 🏗️ Struktur Arsitektur Monorepo

- `apps/api-gateway` (Port 4000) - Entry Point HTTP, Swagger OpenAPI (`/docs`), Jwt Validation & Casbin RBAC Guard
- `apps/auth-service` (Port 4001) - Authentications, Login, Profile & JWT Issue
- `apps/employee-service` (Port 4002) - Master Data Karyawan, Departemen, Jabatan, Bulk Import
- `apps/attendance-service` (Port 4003) - Absen Masuk/Pulang WFH, Geofence, History & HRD Monitoring Analytics
- `apps/leave-service` (Port 4004) - Pengajuan Cuti, Sakit, & Tukar Hari WFH
- `apps/payroll-service` (Port 4005) - Rekapitulasi Payroll & Tunjangan WFH

---

## 🛠️ Shared Libraries (`libs/`)

- `libs/casbin` - Enforcer Casbin Engine (`rbac_model.conf`), Persistent DB Policies, & `CasbinGuard`.
- `libs/common` - Global DTOs (`ApiResponseDto`), Decorators (`@CurrentUser`, `@Public`), Exception Filters.
- `libs/database` - Prisma Client Service & Shared PostgreSQL Connection.

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Install Dependencies
```bash
bun install  # Atau npm install
```

### 2. Jalankan Database PostgreSQL & Redis via Docker
```bash
npm run docker:up
```

### 3. Generate Prisma & Seed Data Initial
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 4. Jalankan Microservices
- **Jalankan API Gateway**:
  ```bash
  npm run start:gateway
  ```
- **Jalankan Auth Service**:
  ```bash
  npm run start:auth
  ```
- **Jalankan Attendance Service**:
  ```bash
  npm run start:attendance
  ```

---

## 🔑 Default User Seed

| Role | Email | Password |
| :--- | :--- | :--- |
| **KARYAWAN** | `budi.santoso@company.co.id` | `password123` |
| **HRD_ADMIN** | `siti.rahmawati@company.co.id` | `password123` |

---

## 📚 API Documentation (Swagger)
Akses dokumentasi Swagger interaktif di: **http://localhost:4000/docs**
