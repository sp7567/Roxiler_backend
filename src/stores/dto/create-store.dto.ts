import { IsEmail, IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(20)
  @MaxLength(60)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(400)
  address: string;

  @IsUUID()
  ownerId: string;
}
