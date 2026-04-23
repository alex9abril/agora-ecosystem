import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConnectorDto {
  @ApiProperty({ example: 'DMS refaccionaria' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'mssql' })
  @IsString()
  @MinLength(1)
  connectorTypeId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  /** Cuerpo real: se persiste tal cual. `example` es solo para documentación OpenAPI (Swagger), no valor por defecto ni merge. */
  @ApiProperty({
    example: {
      server: '10.0.0.1',
      port: 1433,
      database: 'DMS',
      user: 'reader',
      options: { encrypt: true, trustServerCertificate: true },
    },
  })
  @IsObject()
  config: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Solo al crear/rotar; no se devuelve en listados' })
  @IsOptional()
  @IsString()
  password?: string;
}
