import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../stores/entities/store.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class StoreOwnerService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getDashboard(ownerId: string) {
    const store = await this.storeRepository.findOne({ where: { ownerId } });
    if (!store) {
      return { hasStore: false, store: null, avgRating: null, totalRatings: 0, raters: [] };
    }

    const avgResult = await this.ratingRepository
      .createQueryBuilder('r')
      .select('AVG(r.value)', 'avg')
      .where('r.storeId = :sid', { sid: store.id })
      .getRawOne();

    const ratings = await this.ratingRepository.find({
      where: { storeId: store.id },
      order: { createdAt: 'DESC' },
    });

    const userIds = ratings.map(r => r.userId);
    const users = userIds.length
      ? await this.userRepository
          .createQueryBuilder('u')
          .select(['u.id', 'u.name', 'u.email'])
          .where('u.id IN (:...ids)', { ids: userIds })
          .getMany()
      : [];

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const ratersList = ratings.map(r => ({
      ratingId: r.id,
      value: r.value,
      submittedAt: r.createdAt,
      user: userMap[r.userId] || { id: r.userId, name: 'Unknown', email: 'Unknown' },
    }));

    return {
      hasStore: true,
      store: { id: store.id, name: store.name, email: store.email, address: store.address },
      avgRating: avgResult?.avg ? parseFloat(avgResult.avg).toFixed(2) : null,
      totalRatings: ratings.length,
      raters: ratersList,
    };
  }
}
