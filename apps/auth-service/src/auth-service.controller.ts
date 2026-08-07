import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { Public, CurrentUser, ApiResponseDto } from '@app/common';

@Controller('api/v1/auth')
export class AuthServiceController {
  constructor(private readonly authService: AuthServiceService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const data = await this.authService.login(body.email, body.password);
    return new ApiResponseDto(true, 'Login berhasil', data);
  }

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.sub);
    return new ApiResponseDto(true, 'Profil pengguna berhasil diambil', profile);
  }
}
