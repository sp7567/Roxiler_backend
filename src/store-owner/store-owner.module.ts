import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreOwnerService } from './store-owner.service';
import { StoreOwnerController } from './store-owner.controller';
import { Store } from '../stores/entities/store.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Store, Rating, User])],
  controllers: [StoreOwnerController],
  providers: [StoreOwnerService],
})
export class StoreOwnerModule {}
