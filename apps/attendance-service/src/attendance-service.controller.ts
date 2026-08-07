import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
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
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      latitude: number;
      longitude: number;
      address: string;
      photoProofUrl: string;
      workPlan: string;
    },
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toTimeString().split(' ')[0];

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId: userId,
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
  async getMyHistory(@CurrentUser('sub') userId: string) {
    const history = await this.prisma.attendanceRecord.findMany({
      where: { employeeId: userId },
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
    return new ApiResponseDto(true, 'Data monitoring absensi HRD berhasil diambil', records);
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
