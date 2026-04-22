import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

/** Probar conexión con credenciales completas (crear conector o validar antes de guardar). */
export class TestMssqlPayloadDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  server: string;

  @ApiPropertyOptional({ default: 1433 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  port?: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  database: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  user: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: { encrypt?: boolean; trustServerCertificate?: boolean };
}

/** Probar conexión de un conector existente; campos opcionales sustituyen los guardados. */
export class TestMssqlOverrideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  server?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  database?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user?: string;

  /** Vacío o ausente: usar la contraseña almacenada. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: { encrypt?: boolean; trustServerCertificate?: boolean };
}
