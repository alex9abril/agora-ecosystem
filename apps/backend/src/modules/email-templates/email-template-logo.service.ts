import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { supabaseAdmin } from '../../config/supabase.config';

@Injectable()
export class EmailTemplateLogoService {
  private readonly BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'personalizacion';

  /**
   * Valida que el archivo sea una imagen válida
   */
  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Tipos permitidos: ${allowedMimeTypes.join(', ')}`
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('El archivo es demasiado grande. Tamaño máximo: 5MB');
    }
  }

  /**
   * Genera la ruta del archivo para el logo del template
   */
  private generateFilePath(
    level: 'global' | 'group' | 'business',
    templateId: string,
    originalName: string
  ): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const ext = originalName.split('.').pop() || 'png';
    const fileName = `logo-${timestamp}-${randomStr}.${ext}`;

    return `email-templates/${level}/${templateId}/${fileName}`;
  }

  /**
   * Sube un logo para un template de email
   */
  async uploadLogo(
    level: 'global' | 'group' | 'business',
    templateId: string,
    file: Express.Multer.File
  ): Promise<{ url: string; path: string }> {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    this.validateImageFile(file);

    try {
      // Generar ruta del archivo
      const filePath = this.generateFilePath(level, templateId, file.originalname);

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

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error('❌ Error procesando logo de template:', error);
      throw new ServiceUnavailableException(`Error al procesar logo: ${error.message}`);
    }
  }

  /**
   * Elimina un logo de template
   */
  async deleteLogo(filePath: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    try {
      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error eliminando logo:', error);
        throw new ServiceUnavailableException(`Error al eliminar logo: ${error.message}`);
      }

    } catch (error: any) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error('❌ Error eliminando logo:', error);
      throw new ServiceUnavailableException(`Error al eliminar logo: ${error.message}`);
    }
  }
}

