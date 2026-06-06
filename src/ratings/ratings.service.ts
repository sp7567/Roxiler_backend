import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
  ) {}

  async create(userId: string, dto: CreateRatingDto): Promise<Rating> {
    const existing = await this.ratingRepository.findOne({
      where: { userId, storeId: dto.storeId },
    });
    if (existing) throw new BadRequestException('You have already rated this store. Use update instead.');

    const rating = this.ratingRepository.create({ userId, storeId: dto.storeId, value: dto.value });
    return this.ratingRepository.save(rating);
  }

  async update(userId: string, ratingId: string, dto: UpdateRatingDto): Promise<Rating> {
    const rating = await this.ratingRepository.findOne({ where: { id: ratingId, userId } });
    if (!rating) throw new NotFoundException('Rating not found or not owned by you');
    rating.value = dto.value;
    return this.ratingRepository.save(rating);
  }

  async countAll(): Promise<number> {
    return this.ratingRepository.count();
  }
}
