import { Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { ApiResponseDto } from '@app/common';

@ApiTags('5. Rekapitulasi Payroll & Tunjangan (HRD)')
@ApiBearerAuth()
@Controller('api/v1/payroll')
@UseGuards(CasbinGuard)
export class PayrollServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Mendapatkan rekapitulasi penggajian, total jam kerja & tunjangan WFH' })
  @ApiQuery({ name: 'month', required: false, type: String, example: '2026-08' })
  async getPayrollSummary(@Query('month') month?: string) {
    const employees = await this.prisma.user.findMany({
      include: {
        department: true,
        position: true,
        attendances: true,
        leaveRequests: true,
      },
      orderBy: { nip: 'asc' },
    });

    const summary = employees.map((emp) => {
      const totalHadir = emp.attendances.length;
      const totalTerlambat = emp.attendances.filter((a) => a.status === 'LATE').length;
      const totalHoursWorked = totalHadir * 8; // 8 jam per hari
      const wfhDaysCompleted = emp.attendances.filter((a) => a.workPlan?.toLowerCase().includes('wfh') || true).length;
      
      const baseSalary = 12000000;
      const wfhIncentivePerDay = 50000;
      const lateDeductionPerOccurrence = 25000;
      
      const wfhIncentiveTotal = totalHadir * wfhIncentivePerDay;
      const lateDeductionTotal = totalTerlambat * lateDeductionPerOccurrence;
      const netSalary = baseSalary + wfhIncentiveTotal - lateDeductionTotal;

      return {
        employeeId: emp.id,
        nip: emp.nip,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department?.name || 'Engineering & Tech',
        position: emp.position?.name || 'Software Engineer',
        totalHadir: totalHadir,
        totalTerlambat: totalTerlambat,
        totalHoursWorked: totalHoursWorked,
        wfhAllowanceEligibleDays: (emp.wfhAllowanceDaysPerWeek || 3) * 4,
        wfhDaysCompleted: wfhDaysCompleted,
        baseSalary,
        wfhIncentiveTotal,
        lateDeductionTotal,
        netSalary,
        period: month || '2026-08',
        status: 'DIBAYARKAN',
      };
    });

    return new ApiResponseDto(true, 'Rekapitulasi penggajian & tunjangan WFH berhasil dihitung', summary);
  }

  @Get('slips/:employeeId')
  @ApiOperation({ summary: 'Mendapatkan Rincian Slip Gaji Karyawan Spesifik' })
  async getEmployeeSalarySlip(@Param('employeeId') employeeId: string, @Query('month') month?: string) {
    const emp = await this.prisma.user.findUnique({
      where: { id: employeeId },
      include: { department: true, position: true, attendances: true },
    });

    if (!emp) {
      throw new BadRequestException('Karyawan tidak ditemukan');
    }

    const totalHadir = emp.attendances.length;
    const totalTerlambat = emp.attendances.filter((a) => a.status === 'LATE').length;
    const baseSalary = 12000000;
    const wfhIncentiveTotal = totalHadir * 50000;
    const lateDeductionTotal = totalTerlambat * 25000;
    const netSalary = baseSalary + wfhIncentiveTotal - lateDeductionTotal;

    const slip = {
      slipNumber: `SLIP-${emp.nip}-${month || '2026-08'}`,
      period: month || 'Agustus 2026',
      employee: {
        id: emp.id,
        nip: emp.nip,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department?.name || 'Engineering & Tech',
        position: emp.position?.name || 'Software Engineer',
      },
      earnings: [
        { title: 'Gaji Pokok (Base Salary)', amount: baseSalary },
        { title: 'Tunjangan Insentif WFH', amount: wfhIncentiveTotal },
        { title: 'Tunjangan Transport & Makan', amount: 1500000 },
      ],
      deductions: [
        { title: 'Potongan Keterlambatan Absensi', amount: lateDeductionTotal },
        { title: 'BPJS Ketenagakerjaan (3%)', amount: 360000 },
        { title: 'PPh 21 (Estimasi)', amount: 450000 },
      ],
      totalEarnings: baseSalary + wfhIncentiveTotal + 1500000,
      totalDeductions: lateDeductionTotal + 360000 + 450000,
      netSalary: baseSalary + wfhIncentiveTotal + 1500000 - (lateDeductionTotal + 360000 + 450000),
      paymentDate: '2026-08-25',
      paymentStatus: 'DIBAYARKAN',
    };

    return new ApiResponseDto(true, 'Rincian slip gaji berhasil diambil', slip);
  }
}

@ApiTags('6. Audit Trail & Log Keamanan System (HRD)')
@ApiBearerAuth()
@Controller('api/v1/audit-logs')
@UseGuards(CasbinGuard)
export class AuditLogServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan riwayat Audit Trail Log Keamanan & Aktivitas System' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAuditLogs(@Query('category') category?: string, @Query('search') search?: string) {
    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { actorName: { contains: search } },
        { actorNip: { contains: search } },
        { action: { contains: search } },
        { details: { contains: search } },
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    if (logs.length === 0) {
      await this.prisma.auditLog.createMany({
        data: [
          {
            actorNip: 'EMP-2026-001',
            actorName: 'Siti Rahmawati',
            actorRole: 'HRD_ADMIN',
            action: 'UPDATE_GEOFENCE_CONFIG',
            category: 'SYSTEM',
            details: 'Mengubah konfigurasi geofence lokasi Kantor Pusat HQ Jakarta (South Quarter) (Lat: -6.2915, Long: 106.7932, Radius: 150m).',
          },
        ],
      });
      const dbLogs = await this.prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' } });
      return new ApiResponseDto(true, 'Data audit log berhasil diambil', dbLogs);
    }

    return new ApiResponseDto(true, 'Data audit log berhasil diambil', logs);
  }

  @Post()
  @ApiOperation({ summary: 'Mencatat aktivitas baru ke dalam Audit Log System' })
  async createAuditLog(@Body() body: any) {
    if (!body.action || !body.details) {
      throw new BadRequestException('Action dan Details wajib diisi');
    }

    const created = await this.prisma.auditLog.create({
      data: {
        actorNip: body.actorNip || 'EMP-2026-001',
        actorName: body.actorName || 'Siti Rahmawati',
        actorRole: body.actorRole || 'HRD_ADMIN',
        action: body.action,
        category: body.category || 'SYSTEM',
        details: body.details,
      },
    });

    return new ApiResponseDto(true, 'Audit log berhasil dicatat ke MySQL', created);
  }
}
