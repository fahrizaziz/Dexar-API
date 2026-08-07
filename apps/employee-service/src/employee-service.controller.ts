import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { ApiResponseDto } from '@app/common';

@ApiTags('2. Master Data Karyawan (HRD)')
@ApiBearerAuth()
@Controller('api/v1/employees')
@UseGuards(CasbinGuard)
export class EmployeeServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan daftar karyawan (Filter: search, department)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  async getEmployees(
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { nip: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (department) {
      where.department = { name: department };
    }

    const employees = await this.prisma.user.findMany({
      where,
      include: { department: true, position: true },
      orderBy: { createdAt: 'desc' },
    });

    return new ApiResponseDto(true, 'Data karyawan berhasil diambil', employees);
  }

  @Post()
  @ApiOperation({ summary: 'Menambah data karyawan baru' })
  async createEmployee(@Body() data: any) {
    const created = await this.prisma.user.create({ data });
    return new ApiResponseDto(true, 'Karyawan baru berhasil ditambahkan', created);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data karyawan berdasarkan ID' })
  async updateEmployee(@Param('id') id: string, @Body() data: any) {
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return new ApiResponseDto(true, 'Data karyawan berhasil diperbarui', updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data karyawan berdasarkan ID' })
  async deleteEmployee(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return new ApiResponseDto(true, 'Karyawan berhasil dihapus', null);
  }
}
