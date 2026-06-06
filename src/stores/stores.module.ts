import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { Rating } from '../ratings/entities/rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Store, Rating])],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService, TypeOrmModule],
})
export class StoresModule {}
