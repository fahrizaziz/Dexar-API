import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { CurrentUser, ApiResponseDto } from '@app/common';

@ApiTags('3. Absensi WFH & Monitoring HRD')
@ApiBearerAuth()
@Controller('api/v1/attendance')
@UseGuards(CasbinGuard)
export class AttendanceServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Absen Masuk WFH (Clock In) dengan koordinat GPS & Foto Bukti' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', example: -6.2088 },
        longitude: { type: 'number', example: 106.8456 },
        address: { type: 'string', example: 'Jl. Sudirman No. 45, Jakarta Pusat' },
        photoProofUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' },
        workPlan: { type: 'string', example: 'Implementasi API Gateway Swagger & Auth Module' },
      },
    },
  })
  async clockIn(
    @CurrentUser() reqUser: any,
    @Body()
    body: {
      latitude: number;
      longitude: number;
      address: string;
      photoProofUrl: string;
      workPlan: string;
    },
  ) {
    const userId = reqUser?.sub || reqUser?.id;
    let employee = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

    if (!employee && reqUser?.nip) {
      employee = await this.prisma.user.findUnique({ where: { nip: reqUser.nip } });
    }

    if (!employee) {
      employee = await this.prisma.user.findFirst();
    }

    if (!employee) {
      throw new UnauthorizedException('Data karyawan tidak ditemukan di database');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toTimeString().split(' ')[0];

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        date: todayStr,
        clockInTime: nowTimeStr,
        photoProofUrl: body.photoProofUrl,
        latitude: body.latitude,
        longitude: body.longitude,
        address: body.address,
        workPlan: body.workPlan,
        status: 'ON_TIME',
        verificationStatus: 'MENUNGGU',
      },
    });

    return new ApiResponseDto(true, 'Presensi WFH (Clock In) berhasil dicatat', record);
  }

  @Post('clock-out/:id')
  @ApiOperation({ summary: 'Absen Pulang WFH (Clock Out) dengan Laporan Hasil Kerja' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        workSummary: { type: 'string', example: 'Selesai integrasi Swagger OpenAPI dan modul autentikasi' },
      },
    },
  })
  async clockOut(
    @Param('id') recordId: string,
    @Body() body: { workSummary: string },
  ) {
    const nowTimeStr = new Date().toTimeString().split(' ')[0];

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        clockOutTime: nowTimeStr,
        workSummary: body.workSummary,
        status: 'WORK_COMPLETED',
      },
    });

    return new ApiResponseDto(true, 'Absen Pulang (Clock Out) berhasil dicatat', updated);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Mendapatkan riwayat absensi pribadi karyawan' })
  async getMyHistory(@CurrentUser() reqUser: any) {
    const userId = reqUser?.sub || reqUser?.id;
    let employee = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

    if (!employee && reqUser?.nip) {
      employee = await this.prisma.user.findUnique({ where: { nip: reqUser.nip } });
    }

    if (!employee) {
      employee = await this.prisma.user.findFirst();
    }

    const history = await this.prisma.attendanceRecord.findMany({
      where: { employeeId: employee?.id },
      orderBy: { createdAt: 'desc' },
    });
    return new ApiResponseDto(true, 'Riwayat absensi personal berhasil diambil', history);
  }

  @Get('monitoring')
  @ApiOperation({ summary: 'Monitoring absensi seluruh karyawan (Halaman Dashboard HRD)' })
  async getMonitoring(
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    const records = await this.prisma.attendanceRecord.findMany({
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Format response so Frontend receives employeeName and employeeNip directly
    const formattedRecords = records.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee?.fullName || 'Karyawan',
      employeeNip: r.employee?.nip || '-',
      department: r.employee?.department?.name || 'General',
      date: r.date,
      clockInTime: r.clockInTime,
      clockOutTime: r.clockOutTime,
      photoProofUrl: r.photoProofUrl,
      location: {
        latitude: r.latitude,
        longitude: r.longitude,
        address: r.address,
      },
      workPlan: r.workPlan,
      workSummary: r.workSummary,
      status: r.status,
      verificationStatus: r.verificationStatus,
    }));

    return new ApiResponseDto(true, 'Data monitoring absensi HRD berhasil diambil', formattedRecords);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verifikasi atau minta revisi absensi oleh HRD' })
  async verifyAttendance(
    @Param('id') id: string,
    @Body() body: { verificationStatus: 'TERVERIFIKASI' | 'PERLU_REVISI'; notes?: string },
  ) {
    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data: {
        verificationStatus: body.verificationStatus,
        notes: body.notes,
      },
    });
    return new ApiResponseDto(true, 'Status verifikasi absensi berhasil diperbarui', updated);
  }
}
