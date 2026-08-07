import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { ApiResponseDto } from '@app/common';

@ApiTags('5. Rekapitulasi Payroll & Tunjangan')
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
        attendances: true,
        leaveRequests: true,
      },
    });

    const summary = employees.map((emp) => {
      const totalHadir = emp.attendances.length;
      const totalTerlambat = emp.attendances.filter((a) => a.status === 'LATE').length;
      const totalHoursWorked = totalHadir * 8; // Simulasi 8 jam/hari

      return {
        employeeId: emp.id,
        nip: emp.nip,
        fullName: emp.fullName,
        department: emp.department?.name,
        totalHadir,
        totalTerlambat,
        totalHoursWorked,
        wfhAllowanceEligibleDays: Math.min(totalHadir, emp.wfhAllowanceDaysPerWeek * 4),
      };
    });

    return new ApiResponseDto(true, 'Rekapitulasi payroll berhasil dihitung', summary);
  }
}
