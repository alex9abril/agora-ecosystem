import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class StorefrontChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;
}

export class StorefrontChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => StorefrontChatMessageDto)
  messages: StorefrontChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  groupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  vehicleBrandId?: string;
}
