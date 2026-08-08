import { Controller, Get, Post, Patch, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { CurrentUser, ApiResponseDto } from '@app/common';
import { LeaveType, LeaveStatus } from '@prisma/client';

@ApiTags('4. Pengajuan Cuti & WFH')
@ApiBearerAuth()
@Controller('api/v1/leave-requests')
@UseGuards(CasbinGuard)
export class LeaveServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat pengajuan Cuti / Sakit / Tukar WFH baru' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['CUTI', 'SAKIT', 'TUKAR_HARI_WFH', 'LEMBUR'], example: 'CUTI' },
        startDate: { type: 'string', example: '2026-08-10' },
        endDate: { type: 'string', example: '2026-08-12' },
        reason: { type: 'string', example: 'Acara keluarga di luar kota' },
      },
    },
  })
  async createLeaveRequest(
    @CurrentUser() reqUser: any,
    @Body()
    body: {
      type: LeaveType;
      startDate: string;
      endDate: string;
      reason: string;
    },
  ) {
    const userId = reqUser?.sub || reqUser?.id;
    let employee = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

    if (!employee && reqUser?.nip) {
      employee = await this.prisma.user.findUnique({ where: { nip: reqUser.nip } });
    }

    if (!employee) {
      employee = await this.prisma.user.findFirst({ where: { role: 'KARYAWAN' } });
    }

    if (!employee) {
      throw new BadRequestException('Data karyawan tidak ditemukan di database');
    }

    const created = await this.prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        status: LeaveStatus.PENDING,
      },
    });

    return new ApiResponseDto(true, 'Pengajuan cuti/WFH berhasil dikirim', {
      id: created.id,
      employeeId: created.employeeId,
      employeeNip: employee.nip,
      employeeName: employee.fullName,
      department: employee.departmentId || 'General',
      type: created.type,
      startDate: created.startDate.toISOString().split('T')[0],
      endDate: created.endDate.toISOString().split('T')[0],
      reason: created.reason,
      status: created.status,
    });
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Mendapatkan daftar pengajuan cuti milik user yang login' })
  async getMyLeaveRequests(@CurrentUser() reqUser: any) {
    const userId = reqUser?.sub || reqUser?.id;
    let employee = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

    if (!employee && reqUser?.nip) {
      employee = await this.prisma.user.findUnique({ where: { nip: reqUser.nip } });
    }

    if (!employee) {
      employee = await this.prisma.user.findFirst();
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where: { employeeId: employee?.id },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeNip: employee?.nip || '-',
      employeeName: employee?.fullName || 'Karyawan',
      department: employee?.departmentId || 'General',
      type: r.type,
      startDate: r.startDate.toISOString().split('T')[0],
      endDate: r.endDate.toISOString().split('T')[0],
      reason: r.reason,
      status: r.status,
    }));

    return new ApiResponseDto(true, 'Pengajuan cuti personal berhasil diambil', formatted);
  }

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua pengajuan cuti seluruh karyawan (Untuk HRD Approval)' })
  async getAllLeaveRequests() {
    const requests = await this.prisma.leaveRequest.findMany({
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeNip: r.employee?.nip || '-',
      employeeName: r.employee?.fullName || 'Karyawan',
      department: r.employee?.department?.name || 'General',
      type: r.type,
      startDate: r.startDate.toISOString().split('T')[0],
      endDate: r.endDate.toISOString().split('T')[0],
      reason: r.reason,
      status: r.status,
    }));

    return new ApiResponseDto(true, 'Daftar semua pengajuan cuti berhasil diambil', formatted);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Menyetujui atau menolak pengajuan cuti (Approval HRD)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: LeaveStatus; hrdNotes?: string },
  ) {
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: body.status,
        hrdNotes: body.hrdNotes,
      },
    });
    return new ApiResponseDto(true, 'Status pengajuan cuti berhasil diperbarui', updated);
  }
}
