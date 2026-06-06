import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { FilterStoresDto } from './dto/filter-stores.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
  ) {}

  async create(dto: CreateStoreDto): Promise<Store> {
    const store = this.storeRepository.create(dto);
    return this.storeRepository.save(store);
  }

  async findAll(filters: FilterStoresDto, userId?: string) {
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

    let userRatingMap: Record<string, any> = {};
    if (userId) {
      const userRatings = await this.ratingRepository.find({ where: { userId } });
      userRatingMap = Object.fromEntries(userRatings.map(r => [r.storeId, r]));
    }

    return stores.map(s => ({
      ...s,
      owner: s.owner ? { id: s.owner.id, name: s.owner.name } : null,
      avgRating: avgMap[s.id] || null,
      userRating: userRatingMap[s.id] || null,
    }));
  }

  async findOne(id: string) {
    const store = await this.storeRepository.findOne({
      where: { id },
      relations: { owner: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async countAll(): Promise<number> {
    return this.storeRepository.count();
  }

  async getStoreOwners() {
    return this.storeRepository.find({ relations: { owner: true } });
  }
}
