import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthServiceService } from './auth-service.service';
import { Public, CurrentUser, ApiResponseDto } from '@app/common';

@ApiTags('1. Autentikasi & Sesi User')
@Controller('api/v1/auth')
export class AuthServiceController {
  constructor(private readonly authService: AuthServiceService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login pengguna (NIP / Email + Password) -> Mengembalikan JWT Access Token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nip: { type: 'string', example: 'EMP-2026-001' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  async login(@Body() body: { nip?: string; email?: string; identifier?: string; password: string }) {
    const identifier = body.nip || body.identifier || body.email || '';
    const data = await this.authService.login(identifier, body.password);
    return new ApiResponseDto(true, 'Login berhasil', data);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengambil profil pengguna yang sedang login' })
  async getMe(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.sub);
    return new ApiResponseDto(true, 'Profil pengguna berhasil diambil', profile);
  }
}
