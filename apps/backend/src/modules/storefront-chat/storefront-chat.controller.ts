import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StorefrontChatDto } from './dto/storefront-chat.dto';
import { StorefrontChatService } from './storefront-chat.service';

@ApiTags('storefront')
@Controller('storefront/chat')
export class StorefrontChatController {
  constructor(private readonly storefrontChatService: StorefrontChatService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Chat de ventas para storefront (IA + sugerencias de catálogo)',
    description:
      'Público. Usa catálogo real según búsqueda y contexto de tienda. Requiere clave de modelo (STOREFRONT_CHAT_AI_API_KEY u OPENAI_API_KEY); si no hay, responde con plantilla.',
  })
  @ApiResponse({ status: 200, description: 'Texto de respuesta y pistas de producto' })
  async chat(@Body() body: StorefrontChatDto) {
    return this.storefrontChatService.chat(body);
  }
}
