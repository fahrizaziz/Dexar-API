import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '@app/database';
import { CasbinGuard } from '@app/casbin';
import { ApiResponseDto } from '@app/common';
import * as bcrypt from 'bcrypt';

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
    if (department && department !== 'ALL') {
      where.OR = [
        { department: { name: { contains: department } } },
        { departmentId: department },
      ];
    }

    const employees = await this.prisma.user.findMany({
      where,
      include: { department: true, position: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = employees.map((emp) => ({
      id: emp.id,
      nip: emp.nip,
      fullName: emp.fullName,
      email: emp.email,
      role: emp.role,
      department: emp.department?.name || 'Engineering & Tech',
      position: emp.position?.name || 'Senior Software Engineer',
      avatarUrl:
        emp.avatarUrl ||
        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
      phone: emp.phone || '0812-3456-7890',
      joinDate: emp.joinDate ? emp.joinDate.toISOString().split('T')[0] : '2025-01-15',
      status: emp.status || 'AKTIF',
      wfhAllowanceDaysPerWeek: emp.wfhAllowanceDaysPerWeek || 3,
      salary: 12000000,
    }));

    return new ApiResponseDto(true, 'Data karyawan berhasil diambil', formatted);
  }

  @Post()
  @ApiOperation({ summary: 'Menambah data karyawan baru' })
  async createEmployee(@Body() body: any) {
    if (!body.fullName || !body.email) {
      throw new BadRequestException('Nama lengkap dan Email wajib diisi');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existingEmail) {
      throw new BadRequestException('Email sudah terdaftar di sistem');
    }

    // Auto-generate NIP if not provided
    let nip = body.nip;
    if (!nip) {
      const count = await this.prisma.user.count();
      nip = `EMP-2026-${String(count + 1).padStart(3, '0')}`;
    }

    const hashedPassword = await bcrypt.hash(body.password || 'password123', 10);

    // Find default department & position
    const dept = await this.prisma.department.findFirst({
      where: { name: { contains: body.department || 'Engineering' } },
    });
    const pos = await this.prisma.position.findFirst({
      where: { name: { contains: body.position || 'Engineer' } },
    });

    const created = await this.prisma.user.create({
      data: {
        nip,
        fullName: body.fullName,
        email: body.email,
        password: hashedPassword,
        role: body.role === 'HRD' ? 'HRD_ADMIN' : 'KARYAWAN',
        phone: body.phone || '0812-3456-7890',
        avatarUrl:
          body.avatarUrl ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        status: body.status || 'AKTIF',
        wfhAllowanceDaysPerWeek: body.wfhAllowanceDaysPerWeek || 3,
        departmentId: dept?.id,
        positionId: pos?.id,
      },
      include: { department: true, position: true },
    });

    return new ApiResponseDto(true, 'Karyawan baru berhasil ditambahkan', {
      id: created.id,
      nip: created.nip,
      fullName: created.fullName,
      email: created.email,
      role: created.role,
      department: created.department?.name || body.department || 'Engineering & Tech',
      position: created.position?.name || body.position || 'Senior Software Engineer',
      avatarUrl: created.avatarUrl,
      phone: created.phone,
      joinDate: created.joinDate ? created.joinDate.toISOString().split('T')[0] : '2026-08-08',
      status: created.status,
      wfhAllowanceDaysPerWeek: created.wfhAllowanceDaysPerWeek,
      salary: body.salary ? Number(body.salary) : 12000000,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui data karyawan berdasarkan ID' })
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    const dataToUpdate: any = {};
    if (body.fullName) dataToUpdate.fullName = body.fullName;
    if (body.email) dataToUpdate.email = body.email;
    if (body.phone) dataToUpdate.phone = body.phone;
    if (body.status) dataToUpdate.status = body.status;
    if (body.role) dataToUpdate.role = body.role === 'HRD' ? 'HRD_ADMIN' : 'KARYAWAN';
    if (body.wfhAllowanceDaysPerWeek) dataToUpdate.wfhAllowanceDaysPerWeek = Number(body.wfhAllowanceDaysPerWeek);
    if (body.password) dataToUpdate.password = await bcrypt.hash(body.password, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: { department: true, position: true },
    });

    return new ApiResponseDto(true, 'Data karyawan berhasil diperbarui', {
      id: updated.id,
      nip: updated.nip,
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role,
      department: updated.department?.name || 'Engineering & Tech',
      position: updated.position?.name || 'Software Engineer',
      avatarUrl: updated.avatarUrl,
      phone: updated.phone,
      joinDate: updated.joinDate ? updated.joinDate.toISOString().split('T')[0] : '2026-08-08',
      status: updated.status,
      wfhAllowanceDaysPerWeek: updated.wfhAllowanceDaysPerWeek,
      salary: body.salary ? Number(body.salary) : 12000000,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus data karyawan berdasarkan ID' })
  async deleteEmployee(@Param('id') id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      // If user has child records in Attendance/Leave, mark status as INACTIVE
      await this.prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
    }
    return new ApiResponseDto(true, 'Data karyawan berhasil dihapus/dinonaktifkan', null);
  }
}

@ApiTags('2. Master Departemen (HRD)')
@ApiBearerAuth()
@Controller('api/v1/departments')
@UseGuards(CasbinGuard)
export class DepartmentServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan seluruh daftar Master Departemen' })
  async getDepartments() {
    const departments = await this.prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });

    const formatted = departments.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      headOfDepartment: d.headOfDepartment || 'Belum Ditentukan',
      description: d.description || '',
      status: d.status,
      employeeCount: d._count.users,
    }));

    return new ApiResponseDto(true, 'Daftar departemen berhasil diambil', formatted);
  }

  @Post()
  @ApiOperation({ summary: 'Menambah Master Departemen baru' })
  async createDepartment(@Body() body: any) {
    if (!body.name || !body.code) {
      throw new BadRequestException('Kode dan Nama Departemen wajib diisi');
    }

    const created = await this.prisma.department.create({
      data: {
        code: body.code,
        name: body.name,
        headOfDepartment: body.headOfDepartment,
        description: body.description,
        status: body.status || 'AKTIF',
      },
    });

    return new ApiResponseDto(true, 'Master Departemen berhasil dibuat', created);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui Master Departemen' })
  async updateDepartment(@Param('id') id: string, @Body() body: any) {
    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        headOfDepartment: body.headOfDepartment,
        description: body.description,
        status: body.status,
      },
    });

    return new ApiResponseDto(true, 'Master Departemen berhasil diperbarui', updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus Master Departemen' })
  async deleteDepartment(@Param('id') id: string) {
    await this.prisma.department.delete({ where: { id } });
    return new ApiResponseDto(true, 'Master Departemen berhasil dihapus', null);
  }
}

@ApiTags('2. Master Jabatan & Posisi (HRD)')
@ApiBearerAuth()
@Controller('api/v1/positions')
@UseGuards(CasbinGuard)
export class PositionServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan seluruh daftar Master Jabatan & Posisi' })
  async getPositions() {
    const positions = await this.prisma.position.findMany({
      include: { department: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });

    const formatted = positions.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      departmentName: p.department?.name || 'Engineering & Tech',
      level: p.level || 'Staff',
      status: p.status,
      assignedEmployeesCount: p._count.users,
    }));

    return new ApiResponseDto(true, 'Daftar jabatan berhasil diambil', formatted);
  }

  @Post()
  @ApiOperation({ summary: 'Menambah Master Jabatan baru' })
  async createPosition(@Body() body: any) {
    if (!body.name || !body.code) {
      throw new BadRequestException('Kode dan Nama Jabatan wajib diisi');
    }

    const dept = await this.prisma.department.findFirst({
      where: { name: { contains: body.departmentName || 'Engineering' } },
    });

    if (!dept) {
      throw new BadRequestException('Departemen tidak ditemukan');
    }

    const created = await this.prisma.position.create({
      data: {
        code: body.code,
        name: body.name,
        departmentId: dept.id,
        level: body.level || 'Staff',
        status: body.status || 'AKTIF',
      },
      include: { department: true },
    });

    return new ApiResponseDto(true, 'Master Jabatan berhasil dibuat', {
      id: created.id,
      code: created.code,
      name: created.name,
      departmentName: created.department.name,
      level: created.level,
      status: created.status,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui Master Jabatan' })
  async updatePosition(@Param('id') id: string, @Body() body: any) {
    const updated = await this.prisma.position.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        level: body.level,
        status: body.status,
      },
      include: { department: true },
    });

    return new ApiResponseDto(true, 'Master Jabatan berhasil diperbarui', {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      departmentName: updated.department?.name || 'Engineering & Tech',
      level: updated.level,
      status: updated.status,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus Master Jabatan' })
  async deletePosition(@Param('id') id: string) {
    await this.prisma.position.delete({ where: { id } });
    return new ApiResponseDto(true, 'Master Jabatan berhasil dihapus', null);
  }
}
