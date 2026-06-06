import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Store } from '../stores/entities/store.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateStoreDto } from '../stores/dto/create-store.dto';
import { FilterUsersDto } from '../users/dto/filter-users.dto';
import { FilterStoresDto } from '../stores/dto/filter-stores.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
  ) {}

  async getDashboard() {
    const [totalUsers, totalStores, totalRatings] = await Promise.all([
      this.userRepository.count(),
      this.storeRepository.count(),
      this.ratingRepository.count(),
    ]);
    return { totalUsers, totalStores, totalRatings };
  }

  async getRatings() {
    const ratings = await this.ratingRepository.find({
      relations: { user: true, store: true },
      order: { createdAt: 'DESC' },
    });
    return ratings.map(r => ({
      id: r.id,
      value: r.value,
      createdAt: r.createdAt,
      user: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
      store: r.store ? { id: r.store.id, name: r.store.name, email: r.store.email, address: r.store.address } : null,
    }));
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email address already exists');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({ ...dto, password: hashed });
    const saved = await this.userRepository.save(user);
    const { password, ...rest } = saved as any;
    return rest;
  }

  async createStore(dto: CreateStoreDto) {
    // Validate that the assigned owner exists and has the store_owner role
    const owner = await this.userRepository.findOne({ where: { id: dto.ownerId } });
    if (!owner || owner.role !== UserRole.STORE_OWNER) {
      throw new BadRequestException('Assigned owner must be a valid Store Owner user');
    }
    // Check for duplicate store email
    const existingStore = await this.storeRepository.findOne({ where: { email: dto.email } });
    if (existingStore) throw new ConflictException('A store with this email address already exists');
    const store = this.storeRepository.create(dto);
    return this.storeRepository.save(store);
  }

  async getUsers(filters: FilterUsersDto) {
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

  async getUserDetail(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;
    const { password, ...rest } = user as any;

    if (user.role === UserRole.STORE_OWNER) {
      const store = await this.storeRepository.findOne({ where: { ownerId: id } });
      if (store) {
        const result = await this.ratingRepository
          .createQueryBuilder('r')
          .select('AVG(r.value)', 'avg')
          .where('r.storeId = :sid', { sid: store.id })
          .getRawOne();
        rest.storeRating = result?.avg ? parseFloat(result.avg).toFixed(2) : null;
        rest.storeName = store.name;
      }
    }
    return rest;
  }

  async getStores(filters: FilterStoresDto) {
    const query = this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.owner', 'owner');

    if (filters.name) query.andWhere('store.name ILIKE :name', { name: `%${filters.name}%` });
    if (filters.address) query.andWhere('store.address ILIKE :address', { address: `%${filters.address}%` });
    if (filters.email) query.andWhere('store.email ILIKE :email', { email: `%${filters.email}%` });

    const allowedSort = ['name', 'email', 'address', 'createdAt'];
    const sortField = allowedSort.includes(filters.sortBy || '')
      ? `store.${filters.sortBy}`
      : 'store.name';
    query.orderBy(sortField, filters.sortOrder === 'DESC' ? 'DESC' : 'ASC');

    const stores = await query.getMany();
    const storeIds = stores.map(s => s.id);

    const avgRatings = storeIds.length
      ? await this.ratingRepository
          .createQueryBuilder('r')
          .select('r.storeId', 'storeId')
          .addSelect('AVG(r.value)', 'avg')
          .where('r.storeId IN (:...ids)', { ids: storeIds })
          .groupBy('r.storeId')
          .getRawMany()
      : [];

    const avgMap: Record<string, string> = Object.fromEntries(
      avgRatings.map(r => [r.storeId, parseFloat(r.avg).toFixed(2)]),
    );

    return stores.map(s => ({
      ...s,
      owner: s.owner ? { id: s.owner.id, name: s.owner.name, email: s.owner.email } : null,
      avgRating: avgMap[s.id] || null,
    }));
  }

  async getStoreOwners() {
    const owners = await this.userRepository.find({ where: { role: UserRole.STORE_OWNER } });
    return owners.map(u => { const { password, ...rest } = u as any; return rest; });
  }
}
