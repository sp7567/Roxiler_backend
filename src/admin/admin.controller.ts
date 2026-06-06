import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateStoreDto } from '../stores/dto/create-store.dto';
import { FilterUsersDto } from '../users/dto/filter-users.dto';
import { FilterStoresDto } from '../stores/dto/filter-stores.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('ratings')
  getRatings() {
    return this.adminService.getRatings();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users')
  getUsers(@Query() filters: FilterUsersDto) {
    return this.adminService.getUsers(filters);
  }

  @Get('users/store-owners')
  getStoreOwners() {
    return this.adminService.getStoreOwners();
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('stores')
  createStore(@Body() dto: CreateStoreDto) {
    return this.adminService.createStore(dto);
  }

  @Get('stores')
  getStores(@Query() filters: FilterStoresDto) {
    return this.adminService.getStores(filters);
  }
}
