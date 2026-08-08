import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
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
      latitude?: number;
      longitude?: number;
      address?: string;
      photoProofUrl?: string;
      workPlan?: string;
    },
  ) {
    try {
      const userId = reqUser?.sub || reqUser?.id;
      let employee = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

      if (!employee && reqUser?.nip) {
        employee = await this.prisma.user.findUnique({ where: { nip: reqUser.nip } });
      }

      if (!employee) {
        employee = await this.prisma.user.findFirst({ where: { role: 'KARYAWAN' } });
      }

      if (!employee) {
        throw new BadRequestException('Data karyawan tidak ditemukan di database MySQL.');
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimeStr = new Date().toTimeString().split(' ')[0];

      // Check if user already has an attendance record today
      const existingToday = await this.prisma.attendanceRecord.findFirst({
        where: {
          employeeId: employee.id,
          date: todayStr,
        },
      });

      let record;
      if (existingToday) {
        record = await this.prisma.attendanceRecord.update({
          where: { id: existingToday.id },
          data: {
            clockInTime: nowTimeStr,
            photoProofUrl: body.photoProofUrl || existingToday.photoProofUrl,
            latitude: body.latitude || existingToday.latitude,
            longitude: body.longitude || existingToday.longitude,
            address: body.address || existingToday.address,
            workPlan: body.workPlan || existingToday.workPlan,
          },
        });
      } else {
        record = await this.prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            date: todayStr,
            clockInTime: nowTimeStr,
            photoProofUrl: body.photoProofUrl || '',
            latitude: body.latitude || -6.2088,
            longitude: body.longitude || 106.8456,
            address: body.address || 'Lokasi WFH Home Office',
            workPlan: body.workPlan || 'Jurnal WFH Harian',
            status: 'ON_TIME',
            verificationStatus: 'MENUNGGU',
          },
        });
      }

      return new ApiResponseDto(true, 'Presensi WFH (Clock In) berhasil dicatat', record);
    } catch (err: any) {
      console.error('ClockIn Controller Exception:', err);
      if (err instanceof HttpException) {
        throw err;
      }
      throw new InternalServerErrorException(err?.message || 'Gagal mencatat presensi WFH');
    }
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
    try {
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
    } catch (err: any) {
      console.error('ClockOut Controller Exception:', err);
      if (err instanceof HttpException) {
        throw err;
      }
      throw new InternalServerErrorException(err?.message || 'Gagal melakukan Absen Pulang');
    }
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Mendapatkan riwayat absensi pribadi karyawan' })
  async getMyHistory(@CurrentUser() reqUser: any) {
    try {
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

      const formatted = history.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: employee?.fullName || 'Karyawan',
        employeeNip: employee?.nip || '-',
        department: employee?.departmentId || 'General',
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

      return new ApiResponseDto(true, 'Riwayat absensi personal berhasil diambil', formatted);
    } catch (err: any) {
      console.error('GetMyHistory Exception:', err);
      return new ApiResponseDto(true, 'Riwayat absensi personal', []);
    }
  }

  @Get('monitoring')
  @ApiOperation({ summary: 'Monitoring absensi seluruh karyawan (Halaman Dashboard HRD)' })
  async getMonitoring(
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    try {
      const records = await this.prisma.attendanceRecord.findMany({
        include: { employee: { include: { department: true } } },
        orderBy: { createdAt: 'desc' },
      });

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
    } catch (err: any) {
      console.error('GetMonitoring Exception:', err);
      return new ApiResponseDto(true, 'Data monitoring absensi HRD', []);
    }
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verifikasi atau minta revisi absensi oleh HRD' })
  async verifyAttendance(
    @Param('id') id: string,
    @Body() body: { verificationStatus: 'TERVERIFIKASI' | 'PERLU_REVISI'; notes?: string },
  ) {
    try {
      const updated = await this.prisma.attendanceRecord.update({
        where: { id },
        data: {
          verificationStatus: body.verificationStatus,
          notes: body.notes,
        },
      });
      return new ApiResponseDto(true, 'Status verifikasi absensi berhasil diperbarui', updated);
    } catch (err: any) {
      console.error('VerifyAttendance Exception:', err);
      throw new InternalServerErrorException(err?.message || 'Gagal memverifikasi absensi');
    }
  }
}
