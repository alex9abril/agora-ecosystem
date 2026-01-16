import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { supabaseAdmin } from '../../config/supabase.config';

@Injectable()
export class BrandingImagesService {
  private readonly BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'personalizacion';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

  constructor() {
    if (process.env.NODE_ENV !== 'production') {
    }
  }

  /**
   * Valida el archivo de imagen
   */
  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Tipos permitidos: ${this.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Genera la ruta del archivo en el bucket
   */
  private generateFilePath(type: 'group' | 'business', id: string, imageType: 'logo' | 'logo_light' | 'logo_dark' | 'favicon', originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const ext = originalName.split('.').pop() || 'png';
    const fileName = `${imageType}-${timestamp}-${randomStr}.${ext}`;
    return `branding/${type}/${id}/${fileName}`;
  }

  /**
   * Sube una imagen de branding
   */
  async uploadImage(
    type: 'group' | 'business',
    id: string,
    imageType: 'logo' | 'logo_light' | 'logo_dark' | 'favicon',
    file: Express.Multer.File
  ): Promise<{ url: string; path: string }> {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    this.validateImageFile(file);

    try {
      // Generar ruta del archivo
      const filePath = this.generateFilePath(type, id, imageType, file.originalname);

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true, // Permitir sobrescribir si existe
        });

      if (uploadError) {
        console.error('❌ Error subiendo archivo a Storage:', uploadError);
        throw new ServiceUnavailableException(`Error al subir archivo: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[BrandingImagesService.uploadImage] Archivo subido:', {
          type,
          id,
          imageType,
          filePath,
        });
      }

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error('❌ Error procesando imagen de branding:', error);
      throw new ServiceUnavailableException(`Error al procesar imagen: ${error.message}`);
    }
  }

  /**
   * Elimina una imagen de branding
   */
  async deleteImage(filePath: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    try {
      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error eliminando archivo de Storage:', error);
        throw new ServiceUnavailableException(`Error al eliminar archivo: ${error.message}`);
      }

    } catch (error: any) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error('❌ Error eliminando imagen de branding:', error);
      throw new ServiceUnavailableException(`Error al eliminar imagen: ${error.message}`);
    }
  }
}

