import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { supabaseAdmin } from '../../../config/supabase.config';
import { dbPool } from '../../../config/database.config';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { normalizeStoragePath } from '../../../utils/storage.utils';

@Injectable()
export class ProductImagesService {
  // Normalizar el nombre del bucket: si viene una URL, extraer solo el nombre
  private readonly BUCKET_NAME = this.normalizeBucketName(process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products');
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Normaliza el nombre del bucket: si viene una URL completa, extrae solo el nombre
   */
  private normalizeBucketName(bucketName: string): string {
    if (!bucketName) return 'products';
    
    // Si es una URL completa, intentar extraer el nombre del bucket
    if (bucketName.startsWith('http')) {
      console.warn('⚠️ [ProductImagesService] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS contiene una URL completa:', bucketName);
      console.warn('⚠️ [ProductImagesService] Usando nombre por defecto: products');
      return 'products';
    }
    
    // Si contiene caracteres especiales de URL, probablemente es una URL mal configurada
    if (bucketName.includes('://') || bucketName.includes('/storage/')) {
      console.warn('⚠️ [ProductImagesService] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS parece contener una URL:', bucketName);
      console.warn('⚠️ [ProductImagesService] Usando nombre por defecto: products');
      return 'products';
    }
    
    // Si es solo el nombre del bucket, retornarlo tal cual
    return bucketName.trim();
  }

  constructor() {
    // Log de configuración del bucket (siempre, para debugging)
    console.log('🔍 [ProductImagesService] Constructor inicializado');
    console.log('🔍 [ProductImagesService] Bucket configurado:', this.BUCKET_NAME);
    console.log('🔍 [ProductImagesService] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS (raw):', process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'no configurada (usando default: products)');
    console.log('🔍 [ProductImagesService] Bucket normalizado:', this.BUCKET_NAME);
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
   * Genera la ruta del archivo en Storage
   * Formato: {product_id}/{image_id}.{ext}
   */
  private generateFilePath(productId: string, imageId: string, originalName: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    return `${productId}/${imageId}.${ext}`;
  }

  /**
   * Obtiene las dimensiones de una imagen (opcional, requiere sharp o similar)
   * Por ahora retorna null, se puede implementar después
   */
  private async getImageDimensions(file: Express.Multer.File): Promise<{ width: number | null; height: number | null }> {
    // TODO: Implementar con sharp o similar si se necesita
    return { width: null, height: null };
  }

  /**
   * Sube una imagen para un producto
   */
  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    altText?: string,
    isPrimary?: boolean,
    displayOrder?: number
  ) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Validar archivo
    this.validateImageFile(file);

    // Verificar que el producto existe
    const productCheck = await dbPool.query(
      'SELECT id, business_id FROM catalog.products WHERE id = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    try {
      // Verificar que supabaseAdmin esté configurado
      if (!supabaseAdmin) {
        console.error('❌ [uploadImage] supabaseAdmin no está configurado');
        throw new ServiceUnavailableException('Supabase Storage no está configurado');
      }

      console.log('🔍 [uploadImage] Iniciando subida de imagen...');
      console.log('🔍 [uploadImage] Bucket configurado (normalizado):', this.BUCKET_NAME);
      console.log('🔍 [uploadImage] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS (raw):', process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'no configurada');
      console.log('🔍 [uploadImage] SUPABASE_URL:', process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 40)}...` : 'NO CONFIGURADO');
      console.log('🔍 [uploadImage] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ NO CONFIGURADO');
      
      // Validar que el nombre del bucket sea válido (no una URL)
      if (this.BUCKET_NAME.includes('://') || this.BUCKET_NAME.includes('/storage/') || this.BUCKET_NAME.startsWith('http')) {
        console.error('❌ [uploadImage] ERROR: El nombre del bucket parece ser una URL:', this.BUCKET_NAME);
        throw new ServiceUnavailableException(`Nombre de bucket inválido. Debe ser solo el nombre (ej: 'products'), no una URL completa. Valor actual: ${this.BUCKET_NAME}`);
      }

      // Generar ID para la imagen
      const imageId = `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Generar ruta del archivo
      const filePath = this.generateFilePath(productId, imageId, file.originalname);

      // Debug antes de subir (igual que BrandingImagesService - no verificamos el bucket, solo intentamos subir)
      console.log('🔍 [uploadImage] Intentando subir:', {
        bucket: this.BUCKET_NAME,
        filePath,
        fileSize: file.buffer.length,
        contentType: file.mimetype,
        supabaseUrl: process.env.SUPABASE_URL?.substring(0, 40) + '...',
        hasSupabaseAdmin: !!supabaseAdmin,
      });

      // Subir archivo a Supabase Storage (igual que BrandingImagesService)
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false, // No sobrescribir si existe
        });

      if (uploadError) {
        const errorStatus = (uploadError as any).statusCode || (uploadError as any).status || 'unknown';
        console.error('❌ Error subiendo archivo a Storage:', {
          error: uploadError,
          message: uploadError.message,
          statusCode: errorStatus,
          bucket: this.BUCKET_NAME,
          filePath,
          errorDetails: JSON.stringify(uploadError, null, 2),
        });
        
        // Si el error es "Bucket not found", dar más contexto
        if (uploadError.message?.includes('not found') || errorStatus === 404 || errorStatus === '404') {
          throw new ServiceUnavailableException(
            `Bucket '${this.BUCKET_NAME}' no encontrado o no accesible: ${uploadError.message}. ` +
            `Verifica que el bucket existe en el Dashboard de Supabase y que las políticas RLS están configuradas correctamente.`
          );
        }
        
        throw new ServiceUnavailableException(`Error al subir archivo: ${uploadError.message}`);
      }

      // Obtener dimensiones (opcional)
      const { width, height } = await this.getImageDimensions(file);

      // Determinar si es principal
      let isPrimaryValue = isPrimary ?? false;
      
      // Si no hay imágenes principales, esta será la principal
      if (isPrimaryValue === false) {
        const primaryCheck = await dbPool.query(
          'SELECT id FROM catalog.product_images WHERE product_id = $1 AND is_primary = TRUE AND is_active = TRUE',
          [productId]
        );
        if (primaryCheck.rows.length === 0) {
          isPrimaryValue = true;
        }
      } else {
        // Si se marca como principal, desmarcar las demás (el trigger lo hace, pero lo hacemos aquí también)
        await dbPool.query(
          'UPDATE catalog.product_images SET is_primary = FALSE WHERE product_id = $1 AND id != $2',
          [productId, '00000000-0000-0000-0000-000000000000'] // Placeholder, se actualizará después
        );
      }

      // Determinar display_order
      let displayOrderValue = displayOrder ?? 0;
      if (displayOrder === undefined) {
        // Si no se especifica, ponerla al final
        const maxOrderResult = await dbPool.query(
          'SELECT COALESCE(MAX(display_order), -1) as max_order FROM catalog.product_images WHERE product_id = $1',
          [productId]
        );
        displayOrderValue = (maxOrderResult.rows[0]?.max_order ?? -1) + 1;
      }

      // Guardar metadata en la base de datos
      const insertResult = await dbPool.query(
        `INSERT INTO catalog.product_images (
          product_id, file_path, file_name, file_size, mime_type,
          width, height, alt_text, display_order, is_primary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          productId,
          filePath,
          file.originalname,
          file.size,
          file.mimetype,
          width,
          height,
          altText || null,
          displayOrderValue,
          isPrimaryValue,
          true,
        ]
      );

      const imageRecord = insertResult.rows[0];

      // Si se marcó como principal, actualizar el trigger ya lo hizo, pero actualizamos el registro
      if (isPrimaryValue) {
        await dbPool.query(
          'UPDATE catalog.product_images SET is_primary = FALSE WHERE product_id = $1 AND id != $2',
          [productId, imageRecord.id]
        );
      }

      // Obtener URL pública (normalizar filePath por si acaso)
      const normalizedPath = normalizeStoragePath(filePath);
      if (!normalizedPath) {
        throw new ServiceUnavailableException('Error al normalizar la ruta del archivo');
      }
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(normalizedPath);

      return {
        ...imageRecord,
        public_url: urlData.publicUrl,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error subiendo imagen de producto:', error);
      throw new ServiceUnavailableException(`Error al subir imagen: ${error.message}`);
    }
  }

  /**
   * Lista todas las imágenes de un producto
   */
  async getProductImages(productId: string, includeInactive: boolean = false) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    try {
      // Verificar que el producto existe
      const productCheck = await dbPool.query(
        'SELECT id FROM catalog.products WHERE id = $1',
        [productId]
      );

      if (productCheck.rows.length === 0) {
        throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
      }

      // Obtener imágenes
      let query = `
        SELECT 
          id, product_id, file_path, file_name, file_size, mime_type,
          width, height, alt_text, display_order, is_primary, is_active,
          created_at, updated_at
        FROM catalog.product_images
        WHERE product_id = $1
      `;

      const params: any[] = [productId];

      if (!includeInactive) {
        query += ' AND is_active = TRUE';
      }

      query += ' ORDER BY display_order ASC, created_at ASC';

      const result = await dbPool.query(query, params);

      // Agregar URLs públicas (normalizar filePath)
      const imagesWithUrls = result.rows.map((image) => {
        const normalizedPath = normalizeStoragePath(image.file_path);
        if (!normalizedPath) {
          console.warn('⚠️ [getProductImages] No se pudo normalizar file_path para imagen:', image.id);
          return { ...image, public_url: null };
        }
        const { data: urlData } = supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(normalizedPath);

        return {
          ...image,
          public_url: urlData.publicUrl,
        };
      });

      return imagesWithUrls;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo imágenes de producto:', error);
      throw new ServiceUnavailableException(`Error al obtener imágenes: ${error.message}`);
    }
  }

  /**
   * Obtiene una imagen específica
   */
  async getImage(imageId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    try {
      const result = await dbPool.query(
        'SELECT * FROM catalog.product_images WHERE id = $1',
        [imageId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
      }

      const image = result.rows[0];

      // Agregar URL pública (normalizar filePath)
      const normalizedPath = normalizeStoragePath(image.file_path);
      if (!normalizedPath) {
        throw new ServiceUnavailableException('Error al normalizar la ruta del archivo');
      }
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(normalizedPath);

      return {
        ...image,
        public_url: urlData.publicUrl,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo imagen:', error);
      throw new ServiceUnavailableException(`Error al obtener imagen: ${error.message}`);
    }
  }

  /**
   * Actualiza metadata de una imagen
   */
  async updateImage(imageId: string, updateDto: UpdateProductImageDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que la imagen existe
      const imageCheck = await dbPool.query(
        'SELECT id, product_id FROM catalog.product_images WHERE id = $1',
        [imageId]
      );

      if (imageCheck.rows.length === 0) {
        throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
      }

      const image = imageCheck.rows[0];

      // Si se marca como principal, desmarcar las demás
      if (updateDto.is_primary === true) {
        await dbPool.query(
          'UPDATE catalog.product_images SET is_primary = FALSE WHERE product_id = $1 AND id != $2',
          [image.product_id, imageId]
        );
      }

      // Construir query de actualización
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateDto.alt_text !== undefined) {
        updateFields.push(`alt_text = $${paramIndex++}`);
        updateValues.push(updateDto.alt_text || null);
      }
      if (updateDto.display_order !== undefined) {
        updateFields.push(`display_order = $${paramIndex++}`);
        updateValues.push(updateDto.display_order);
      }
      if (updateDto.is_primary !== undefined) {
        updateFields.push(`is_primary = $${paramIndex++}`);
        updateValues.push(updateDto.is_primary);
      }
      if (updateDto.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updateDto.is_active);
      }

      if (updateFields.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(imageId);

      const updateQuery = `
        UPDATE catalog.product_images
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await dbPool.query(updateQuery, updateValues);

      const updatedImage = result.rows[0];

      // Agregar URL pública
      if (supabaseAdmin) {
        const { data: urlData } = supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(updatedImage.file_path);

        return {
          ...updatedImage,
          public_url: urlData.publicUrl,
        };
      }

      return updatedImage;
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando imagen:', error);
      throw new ServiceUnavailableException(`Error al actualizar imagen: ${error.message}`);
    }
  }

  /**
   * Elimina una imagen (de Storage y de la base de datos)
   */
  async deleteImage(imageId: string) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Supabase Storage no está configurado');
    }

    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Obtener información de la imagen
      const imageResult = await dbPool.query(
        'SELECT id, file_path, product_id FROM catalog.product_images WHERE id = $1',
        [imageId]
      );

      if (imageResult.rows.length === 0) {
        throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
      }

      const image = imageResult.rows[0];

      // Eliminar de Storage (normalizar filePath)
      const normalizedPath = normalizeStoragePath(image.file_path);
      if (normalizedPath) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .remove([normalizedPath]);

        if (storageError) {
          console.warn('⚠️  Error eliminando archivo de Storage (continuando):', storageError);
          // No lanzamos error, solo logueamos, porque puede que el archivo ya no exista
        }
      }

      // Eliminar de la base de datos
      await dbPool.query('DELETE FROM catalog.product_images WHERE id = $1', [imageId]);

      return { message: 'Imagen eliminada exitosamente', imageId };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error eliminando imagen:', error);
      throw new ServiceUnavailableException(`Error al eliminar imagen: ${error.message}`);
    }
  }
}

