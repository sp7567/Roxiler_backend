import { Controller, Get, UseGuards } from '@nestjs/common';
import { StoreOwnerService } from './store-owner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('store-owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STORE_OWNER)
export class StoreOwnerController {
  constructor(private readonly storeOwnerService: StoreOwnerService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.storeOwnerService.getDashboard(user.id);
  }
}
