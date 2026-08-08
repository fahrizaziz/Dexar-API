import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database and seeding ONLY 1 HRD Admin user...');

  // Delete all existing attendance records, leave requests, audit logs, users, positions, departments
  await prisma.attendanceRecord.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.position.deleteMany({});
  await prisma.department.deleteMany({});

  // 1. Seed HR Department & Position
  const deptHR = await prisma.department.create({
    data: {
      code: 'HRD-001',
      name: 'Human Resources & General Affairs',
      headOfDepartment: 'Siti Rahmawati',
      description: 'Divisi Manajemen Sumber Daya Manusia dan Talenta',
      status: 'AKTIF',
    },
  });

  const posHRManager = await prisma.position.create({
    data: {
      code: 'POS-001',
      name: 'HR Manager & System Admin',
      departmentId: deptHR.id,
      level: 'Manager',
      status: 'AKTIF',
    },
  });

  // 2. Seed ONLY 1 HRD Admin User (Siti Rahmawati)
  const hashedPassword = await bcrypt.hash('password123', 10);

  const empSiti = await prisma.user.create({
    data: {
      nip: 'EMP-2026-001',
      fullName: 'Siti Rahmawati',
      email: 'siti.rahmawati@company.co.id',
      password: hashedPassword,
      phone: '0819-8765-4321',
      departmentId: deptHR.id,
      positionId: posHRManager.id,
      role: Role.HRD_ADMIN,
      status: 'AKTIF',
      wfhAllowanceDaysPerWeek: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    },
  });

  // 3. Seed Casbin Rules
  const initialPolicies = [
    // Policies for KARYAWAN
    { ptype: 'p', v0: 'KARYAWAN', v1: '/api/v1/attendance/clock-in', v2: 'POST' },
    { ptype: 'p', v0: 'KARYAWAN', v1: '/api/v1/attendance/clock-out/*', v2: 'POST' },
    { ptype: 'p', v0: 'KARYAWAN', v1: '/api/v1/attendance/today-status', v2: 'GET' },
    { ptype: 'p', v0: 'KARYAWAN', v1: '/api/v1/attendance/my-history', v2: 'GET' },
    { ptype: 'p', v0: 'KARYAWAN', v1: '/api/v1/leave-requests/my-requests', v2: 'GET' },
    { ptype: 'p', v0: 'KARYAWAN', v1: '/api/v1/leave-requests', v2: 'POST' },

    // Role Inheritance: HRD_ADMIN inherits all KARYAWAN permissions
    { ptype: 'g', v0: 'HRD_ADMIN', v1: 'KARYAWAN' },

    // Admin Policies for HRD_ADMIN
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/attendance/monitoring', v2: 'GET' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/attendance/*/verify', v2: 'PATCH' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/attendance/analytics', v2: 'GET' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/attendance/export', v2: 'GET' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/leave-requests', v2: 'GET' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/leave-requests/*/status', v2: 'PATCH' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/employees/*', v2: '(GET|POST|PUT|DELETE)' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/departments/*', v2: '(GET|POST|PUT|DELETE)' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/positions/*', v2: '(GET|POST|PUT|DELETE)' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/payroll/*', v2: 'GET' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/geofence-shifts/*', v2: '(GET|POST|PUT|DELETE)' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/audit-logs', v2: 'GET' },
    { ptype: 'p', v0: 'HRD_ADMIN', v1: '/api/v1/access-control/*', v2: '(GET|POST|PUT|DELETE)' },
  ];

  await prisma.casbinRule.deleteMany();
  await prisma.casbinRule.createMany({ data: initialPolicies });

  // 4. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      actorNip: empSiti.nip,
      actorName: empSiti.fullName,
      actorRole: Role.HRD_ADMIN,
      action: 'SYSTEM_INITIALIZATION',
      category: 'SYSTEM',
      details: 'Pembersihan database sistem & inisialisasi akun tunggal Admin HRD Utama (Siti Rahmawati).',
    },
  });

  console.log('✅ Clean seed success! Database wiped. ONLY 1 HRD Admin created:');
  console.log('  - HRD Admin User: siti.rahmawati@company.co.id (NIP: EMP-2026-001 / Password: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
