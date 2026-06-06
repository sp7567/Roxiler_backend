import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: loginDto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.userRepository.findOne({ where: { email: registerDto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      ...registerDto,
      password: hashed,
      role: UserRole.NORMAL_USER,
    });
    const saved = await this.userRepository.save(user);
    const payload = { sub: saved.id, email: saved.email, role: saved.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: saved.id, name: saved.name, email: saved.email, role: saved.role },
    };
  }

  async seedAdmin() {
    const existing = await this.userRepository.findOne({ where: { email: 'admin@admin.com' } });
    if (!existing) {
      const hashed = await bcrypt.hash('Admin@123', 10);
      const admin = this.userRepository.create({
        name: 'System Administrator User',
        email: 'admin@admin.com',
        password: hashed,
        address: 'Admin Office, Main Street, City, Country',
        role: UserRole.ADMIN,
      });
      await this.userRepository.save(admin);
      console.log('✅ Default admin seeded: admin@admin.com / Admin@123');
    }
  }
}
