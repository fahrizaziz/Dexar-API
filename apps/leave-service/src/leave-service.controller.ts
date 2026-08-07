import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { CurrentUser, ApiResponseDto } from '@app/common';
import { LeaveType, LeaveStatus } from '@prisma/client';

@Controller('api/v1/leave-requests')
@UseGuards(CasbinGuard)
export class LeaveServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
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
  async getMyLeaveRequests(@CurrentUser('sub') userId: string) {
    const requests = await this.prisma.leaveRequest.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return new ApiResponseDto(true, 'Pengajuan cuti personal berhasil diambil', requests);
  }

  @Get()
  async getAllLeaveRequests() {
    const requests = await this.prisma.leaveRequest.findMany({
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return new ApiResponseDto(true, 'Daftar semua pengajuan cuti berhasil diambil', requests);
  }

  @Patch(':id/status')
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
