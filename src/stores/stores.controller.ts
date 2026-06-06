import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { FilterStoresDto } from './dto/filter-stores.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Roles(UserRole.NORMAL_USER, UserRole.ADMIN)
  findAll(@Query() filters: FilterStoresDto, @CurrentUser() user: any) {
    const userId = user.role === UserRole.NORMAL_USER ? user.id : undefined;
    return this.storesService.findAll(filters, userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.NORMAL_USER)
  findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }
}
