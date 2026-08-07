import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding initial data for WFH Attendance System & Casbin RBAC...');

  // 1. Seed Departments
  const deptEngineering = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: {
      code: 'ENG',
      name: 'Engineering & Tech',
      headOfDepartment: 'Budi Santoso',
      description: 'Divisi Rekayasa Perangkat Lunak dan Teknologi Informasi',
      status: 'AKTIF',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: 'HRD' },
    update: {},
    create: {
      code: 'HRD',
      name: 'Human Resources',
      headOfDepartment: 'Siti Rahmawati',
      description: 'Divisi Manajemen Sumber Daya Manusia dan Talenta',
      status: 'AKTIF',
    },
  });

  // 2. Seed Positions
  const posSeniorDev = await prisma.position.upsert({
    where: { code: 'POS-ENG-01' },
    update: {},
    create: {
      code: 'POS-ENG-01',
      name: 'Senior Frontend Engineer',
      departmentId: deptEngineering.id,
      level: 'Senior',
      status: 'AKTIF',
    },
  });

  const posHRManager = await prisma.position.upsert({
    where: { code: 'POS-HR-01' },
    update: {},
    create: {
      code: 'POS-HR-01',
      name: 'HR Manager',
      departmentId: deptHR.id,
      level: 'Manager',
      status: 'AKTIF',
    },
  });

  // 3. Seed Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const empBudi = await prisma.user.upsert({
    where: { email: 'budi.santoso@company.co.id' },
    update: {},
    create: {
      nip: 'EMP-2026-001',
      fullName: 'Budi Santoso',
      email: 'budi.santoso@company.co.id',
      password: hashedPassword,
      phone: '081234567890',
      departmentId: deptEngineering.id,
      positionId: posSeniorDev.id,
      role: Role.KARYAWAN,
      status: 'AKTIF',
      wfhAllowanceDaysPerWeek: 3,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    },
  });

  const empSiti = await prisma.user.upsert({
    where: { email: 'siti.rahmawati@company.co.id' },
    update: {},
    create: {
      nip: 'EMP-2026-002',
      fullName: 'Siti Rahmawati',
      email: 'siti.rahmawati@company.co.id',
      password: hashedPassword,
      phone: '081987654321',
      departmentId: deptHR.id,
      positionId: posHRManager.id,
      role: Role.HRD_ADMIN,
      status: 'AKTIF',
      wfhAllowanceDaysPerWeek: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    },
  });

  // 4. Seed Casbin Rules
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

  console.log('✅ Seed success! Default users & Casbin RBAC policies created.');
  console.log('  - Employee User: budi.santoso@company.co.id (Password: password123)');
  console.log('  - HRD Admin User: siti.rahmawati@company.co.id (Password: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
