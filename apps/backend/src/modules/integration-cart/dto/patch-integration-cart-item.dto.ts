import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsOptional } from 'class-validator';

export class PatchIntegrationCartItemDto {
  @ApiPropertyOptional({
    description:
      'Cantidad absoluta base. Si también envías quantityDelta, el resultado final es quantity + quantityDelta',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description:
      'Delta sobre la cantidad actual; si además envías quantity, el resultado es quantity + quantityDelta. Si el total es ≤ 0, se elimina el ítem',
  })
  @IsOptional()
  @IsInt()
  quantityDelta?: number;
}
