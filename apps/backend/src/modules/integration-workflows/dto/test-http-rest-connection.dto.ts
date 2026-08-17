import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Par clave/valor estilo Postman (params, headers o body form). */
export class HttpKvPairDto {
  @ApiPropertyOptional({ example: 'page' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  key?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  value?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Probar health check HTTP con credenciales del formulario (antes de guardar). */
export class TestHttpRestPayloadDto {
  @ApiProperty({
    example: 'https://api.example.com/v1/agora',
    description: 'URL base del API (sin path de health si se usa healthPath)',
  })
  @IsString()
  @MinLength(1)
  baseUrl: string;

  @ApiProperty({
    example: 'Ocp-Apim-Subscription-Key',
    description: 'Nombre del header de autenticación',
  })
  @IsString()
  @MinLength(1)
  authHeaderName: string;

  @ApiProperty({ description: 'Valor del header (API key / subscription key)' })
  @IsString()
  @MinLength(1)
  apiKey: string;

  @ApiPropertyOptional({
    example: '/health',
    description: 'Ruta relativa al baseUrl. Vacío = se usa solo baseUrl.',
  })
  @IsOptional()
  @IsString()
  healthPath?: string;

  @ApiPropertyOptional({ enum: ['GET', 'HEAD'], default: 'GET' })
  @IsOptional()
  @IsIn(['GET', 'HEAD'])
  healthMethod?: 'GET' | 'HEAD';
}

/** Probar conector guardado; campos opcionales sustituyen los del registro. */
export class TestHttpRestOverrideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authHeaderName?: string;

  @ApiPropertyOptional({ description: 'Si se omite, se usa el secreto cifrado del conector' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  healthPath?: string;

  @ApiPropertyOptional({ enum: ['GET', 'HEAD'] })
  @IsOptional()
  @IsIn(['GET', 'HEAD'])
  healthMethod?: 'GET' | 'HEAD';
}

/** Vista previa de petición HTTP con un conector guardado. */
export class PreviewHttpRestDto {
  @ApiPropertyOptional({ enum: ['GET', 'POST'], default: 'GET' })
  @IsOptional()
  @IsIn(['GET', 'POST'])
  method?: 'GET' | 'POST';

  @ApiPropertyOptional({ description: 'Ruta relativa a baseUrl del conector' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  path?: string;

  @ApiPropertyOptional({ type: [HttpKvPairDto], description: 'Query params (GET y POST)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => HttpKvPairDto)
  queryParams?: HttpKvPairDto[];

  @ApiPropertyOptional({ type: [HttpKvPairDto], description: 'Headers extra (además del de auth del conector)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => HttpKvPairDto)
  headers?: HttpKvPairDto[];

  @ApiPropertyOptional({
    enum: ['none', 'urlencoded', 'json'],
    description: 'Cuerpo POST: ninguno, pares x-www-form-urlencoded, o JSON crudo',
  })
  @IsOptional()
  @IsIn(['none', 'urlencoded', 'json'])
  bodyMode?: 'none' | 'urlencoded' | 'json';

  @ApiPropertyOptional({ type: [HttpKvPairDto], description: 'Pares del body (bodyMode=urlencoded)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => HttpKvPairDto)
  bodyParams?: HttpKvPairDto[];

  @ApiPropertyOptional({ description: 'JSON crudo del body (bodyMode=json)' })
  @IsOptional()
  @IsString()
  @MaxLength(262144)
  bodyJson?: string;
}
