import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CasbinService, CasbinGuard } from '@app/casbin';
import { ApiResponseDto } from '@app/common';

@ApiTags('6. Konfigurasi Akses RBAC (Casbin)')
@ApiBearerAuth()
@Controller('api/v1/access-control')
@UseGuards(CasbinGuard)
export class AccessControlController {
  constructor(private readonly casbinService: CasbinService) {}

  @Get('policies')
  @ApiOperation({ summary: 'Mendapatkan seluruh matrik aturan kebijakan Casbin RBAC saat ini' })
  async getPolicies() {
    const policies = await this.casbinService.getAllPolicies();
    return new ApiResponseDto(true, 'Matrik policy Casbin berhasil diambil', policies);
  }

  @Post('policies')
  @ApiOperation({ summary: 'Menambahkan izin aturan baru ke dalam Casbin RBAC Engine' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', example: 'HRD_ADMIN' },
        path: { type: 'string', example: '/api/v1/employees/*' },
        method: { type: 'string', example: '(GET|POST|PUT|DELETE)' },
      },
    },
  })
  async addPolicy(@Body() dto: { role: string; path: string; method: string }) {
    await this.casbinService.addPolicy(dto.role, dto.path, dto.method);
    return new ApiResponseDto(true, 'Izin policy Casbin berhasil ditambahkan', null);
  }

  @Delete('policies')
  @ApiOperation({ summary: 'Menghapus izin aturan dari Casbin RBAC Engine' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', example: 'KARYAWAN' },
        path: { type: 'string', example: '/api/v1/attendance/monitoring' },
        method: { type: 'string', example: 'GET' },
      },
    },
  })
  async removePolicy(@Body() dto: { role: string; path: string; method: string }) {
    await this.casbinService.removePolicy(dto.role, dto.path, dto.method);
    return new ApiResponseDto(true, 'Izin policy Casbin berhasil dihapus', null);
  }
}
