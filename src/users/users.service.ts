import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { FilterUsersDto } from './dto/filter-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({ ...createUserDto, password: hashed });
    return this.userRepository.save(user);
  }

  async findAll(filters: FilterUsersDto): Promise<Omit<User, 'password'>[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (filters.name) query.andWhere('user.name ILIKE :name', { name: `%${filters.name}%` });
    if (filters.email) query.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    if (filters.address) query.andWhere('user.address ILIKE :address', { address: `%${filters.address}%` });
    if (filters.role) query.andWhere('user.role = :role', { role: filters.role });

    const allowedSort = ['name', 'email', 'address', 'role', 'createdAt'];
    const sortField = allowedSort.includes(filters.sortBy || '')
      ? `user.${filters.sortBy}`
      : 'user.name';
    query.orderBy(sortField, filters.sortOrder === 'DESC' ? 'DESC' : 'ASC');

    const users = await query.getMany();
    return users.map(u => { const { password, ...rest } = u as any; return rest; });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...rest } = user as any;
    return rest;
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
    return { message: 'Password updated successfully' };
  }

  async countAll(): Promise<number> {
    return this.userRepository.count();
  }
}
