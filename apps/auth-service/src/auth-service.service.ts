import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(identifier: string, pass: string) {
    if (!identifier) {
      throw new UnauthorizedException('NIP atau password wajib diisi');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { nip: identifier },
          { email: identifier },
        ],
      },
      include: { department: true, position: true },
    });

    if (!user) {
      throw new UnauthorizedException('NIP atau password salah');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('NIP atau password salah');
    }

    const payload = {
      sub: user.id,
      nip: user.nip,
      name: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department?.name,
      position: user.position?.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        nip: user.nip,
        name: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department?.name,
        position: user.position?.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true, position: true },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const { password, ...result } = user;
    return result;
  }
}
