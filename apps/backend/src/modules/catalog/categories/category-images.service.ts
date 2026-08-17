import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { supabaseAdmin } from '../../../config/supabase.config';
import { dbPool } from '../../../config/database.config';

@Injectable()
export class CategoryImagesService {
  private readonly BUCKET_NAME = this.normalizeBucketName(
    process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products',
  );
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
  ];

  private normalizeBucketName(bucketName: string): string {
    if (!bucketName) return 'products';
    if (bucketName.startsWith('http')) {
      return 'products';
    }
    if (bucketName.includes('://') || bucketName.includes('/storage/')) {
      return 'products';
    }
    return bucketName.trim();
  }

  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Tipos permitidos: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  private generateFilePath(categoryId: string, originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const ext = originalName.split('.').pop() || 'png';
    const fileName = `category-${timestamp}-${randomStr}.${ext}`;
    return `categories/${categoryId}/${fileName}`;
  }

  async uploadImage(categoryId: string, file: Express.Multer.File) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    this.validateImageFile(file);

    const categoryCheck = await dbPool.query(
      'SELECT id FROM catalog.product_categories WHERE id = $1',
      [categoryId],
    );
    if (categoryCheck.rows.length === 0) {
      throw new NotFoundException('Categoría no encontrada');
    }

    try {
      const filePath = this.generateFilePath(categoryId, file.originalname);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new ServiceUnavailableException(`Error al subir archivo: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      await dbPool.query(
        'UPDATE catalog.product_categories SET icon_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [imageUrl, categoryId],
      );

      return { url: imageUrl, path: filePath };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al procesar imagen: ${error.message}`);
    }
  }
}
