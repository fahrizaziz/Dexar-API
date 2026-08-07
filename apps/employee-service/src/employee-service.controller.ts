import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { ApiResponseDto } from '@app/common';

@Controller('api/v1/employees')
@UseGuards(CasbinGuard)
export class EmployeeServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getEmployees(
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
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
  async createEmployee(@Body() data: any) {
    const created = await this.prisma.user.create({ data });
    return new ApiResponseDto(true, 'Karyawan baru berhasil ditambahkan', created);
  }

  @Put(':id')
  async updateEmployee(@Param('id') id: string, @Body() data: any) {
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return new ApiResponseDto(true, 'Data karyawan berhasil diperbarui', updated);
  }

  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return new ApiResponseDto(true, 'Karyawan berhasil dihapus', null);
  }
}
