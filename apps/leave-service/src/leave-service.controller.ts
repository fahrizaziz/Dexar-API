import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
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
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      type: LeaveType;
      startDate: string;
      endDate: string;
      reason: string;
    },
  ) {
    const created = await this.prisma.leaveRequest.create({
      data: {
        employeeId: userId,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        status: LeaveStatus.PENDING,
      },
    });

    return new ApiResponseDto(true, 'Pengajuan cuti/WFH berhasil dikirim', created);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Mendapatkan daftar pengajuan cuti milik user yang login' })
  async getMyLeaveRequests(@CurrentUser('sub') userId: string) {
    const requests = await this.prisma.leaveRequest.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return new ApiResponseDto(true, 'Pengajuan cuti personal berhasil diambil', requests);
  }

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua pengajuan cuti seluruh karyawan (Untuk HRD Approval)' })
  async getAllLeaveRequests() {
    const requests = await this.prisma.leaveRequest.findMany({
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return new ApiResponseDto(true, 'Daftar semua pengajuan cuti berhasil diambil', requests);
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
