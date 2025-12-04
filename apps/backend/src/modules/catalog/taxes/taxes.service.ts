import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../../config/database.config';
import { CreateTaxTypeDto } from './dto/create-tax-type.dto';
import { UpdateTaxTypeDto } from './dto/update-tax-type.dto';
import { AssignTaxToProductDto } from './dto/assign-tax-to-product.dto';

@Injectable()
export class TaxesService {
  /**
   * Obtener todos los tipos de impuestos
   */
  async findAll(includeInactive: boolean = false) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';
      const query = `
        SELECT 
          id,
          name,
          description,
          code,
          rate,
          rate_type,
          fixed_amount,
          applies_to_subtotal,
          applies_to_delivery,
          applies_to_tip,
          is_active,
          is_default,
          created_at,
          updated_at
        FROM catalog.tax_types
        ${whereClause}
        ORDER BY is_default DESC, name ASC
      `;
      
      console.log('[TaxesService] Consultando tipos de impuestos:', { includeInactive, whereClause });
      const result = await dbPool.query(query);
      console.log('[TaxesService] Tipos de impuestos encontrados:', result.rows.length);
      
      if (result.rows.length === 0) {
        console.warn('[TaxesService] No se encontraron tipos de impuestos activos. Verificando si hay impuestos inactivos...');
        const allResult = await dbPool.query('SELECT COUNT(*) as total FROM catalog.tax_types');
        console.log('[TaxesService] Total de tipos de impuestos en la base de datos:', allResult.rows[0]?.total || 0);
      }

      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo tipos de impuestos:', error);
      throw new ServiceUnavailableException(`Error al obtener tipos de impuestos: ${error.message}`);
    }
  }

  /**
   * Obtener un tipo de impuesto por ID
   */
  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          id,
          name,
          description,
          code,
          rate,
          rate_type,
          fixed_amount,
          applies_to_subtotal,
          applies_to_delivery,
          applies_to_tip,
          is_active,
          is_default,
          created_at,
          updated_at
        FROM catalog.tax_types
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Tipo de impuesto no encontrado');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo tipo de impuesto:', error);
      throw new ServiceUnavailableException(`Error al obtener tipo de impuesto: ${error.message}`);
    }
  }

  /**
   * Crear un nuevo tipo de impuesto
   */
  async create(createTaxTypeDto: CreateTaxTypeDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Validar que si rate_type es 'fixed', debe tener fixed_amount
      if (createTaxTypeDto.rate_type === 'fixed' && !createTaxTypeDto.fixed_amount) {
        throw new BadRequestException('Si rate_type es "fixed", debe proporcionar fixed_amount');
      }

      // Si se marca como default, desmarcar otros defaults
      if (createTaxTypeDto.is_default) {
        await dbPool.query(
          `UPDATE catalog.tax_types SET is_default = FALSE WHERE is_default = TRUE`
        );
      }

      const result = await dbPool.query(
        `INSERT INTO catalog.tax_types (
          name,
          description,
          code,
          rate,
          rate_type,
          fixed_amount,
          applies_to_subtotal,
          applies_to_delivery,
          applies_to_tip,
          is_default,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
        RETURNING *`,
        [
          createTaxTypeDto.name,
          createTaxTypeDto.description || null,
          createTaxTypeDto.code || null,
          createTaxTypeDto.rate,
          createTaxTypeDto.rate_type,
          createTaxTypeDto.fixed_amount || null,
          createTaxTypeDto.applies_to_subtotal,
          createTaxTypeDto.applies_to_delivery,
          createTaxTypeDto.applies_to_tip,
          createTaxTypeDto.is_default,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException('Ya existe un tipo de impuesto con ese nombre');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error creando tipo de impuesto:', error);
      throw new ServiceUnavailableException(`Error al crear tipo de impuesto: ${error.message}`);
    }
  }

  /**
   * Actualizar un tipo de impuesto
   */
  async update(id: string, updateTaxTypeDto: UpdateTaxTypeDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que existe
      const existing = await this.findOne(id);

      // Validar que si rate_type es 'fixed', debe tener fixed_amount
      if (updateTaxTypeDto.rate_type === 'fixed' && !updateTaxTypeDto.fixed_amount && !existing.fixed_amount) {
        throw new BadRequestException('Si rate_type es "fixed", debe proporcionar fixed_amount');
      }

      // Si se marca como default, desmarcar otros defaults
      if (updateTaxTypeDto.is_default === true) {
        await dbPool.query(
          `UPDATE catalog.tax_types SET is_default = FALSE WHERE is_default = TRUE AND id != $1`,
          [id]
        );
      }

      // Construir query dinámico
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateTaxTypeDto.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.name);
      }
      if (updateTaxTypeDto.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.description);
      }
      if (updateTaxTypeDto.code !== undefined) {
        updateFields.push(`code = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.code);
      }
      if (updateTaxTypeDto.rate !== undefined) {
        updateFields.push(`rate = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.rate);
      }
      if (updateTaxTypeDto.rate_type !== undefined) {
        updateFields.push(`rate_type = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.rate_type);
      }
      if (updateTaxTypeDto.fixed_amount !== undefined) {
        updateFields.push(`fixed_amount = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.fixed_amount);
      }
      if (updateTaxTypeDto.applies_to_subtotal !== undefined) {
        updateFields.push(`applies_to_subtotal = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.applies_to_subtotal);
      }
      if (updateTaxTypeDto.applies_to_delivery !== undefined) {
        updateFields.push(`applies_to_delivery = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.applies_to_delivery);
      }
      if (updateTaxTypeDto.applies_to_tip !== undefined) {
        updateFields.push(`applies_to_tip = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.applies_to_tip);
      }
      if (updateTaxTypeDto.is_default !== undefined) {
        updateFields.push(`is_default = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.is_default);
      }
      if (updateTaxTypeDto.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updateTaxTypeDto.is_active);
      }

      if (updateFields.length === 0) {
        return existing;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await dbPool.query(
        `UPDATE catalog.tax_types 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando tipo de impuesto:', error);
      throw new ServiceUnavailableException(`Error al actualizar tipo de impuesto: ${error.message}`);
    }
  }

  /**
   * Eliminar (desactivar) un tipo de impuesto
   */
  async remove(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que existe
      await this.findOne(id);

      // Desactivar en lugar de eliminar (soft delete)
      const result = await dbPool.query(
        `UPDATE catalog.tax_types 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error eliminando tipo de impuesto:', error);
      throw new ServiceUnavailableException(`Error al eliminar tipo de impuesto: ${error.message}`);
    }
  }

  /**
   * Obtener impuestos asignados a un producto
   */
  async getProductTaxes(productId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          pt.id,
          pt.product_id,
          pt.tax_type_id,
          pt.override_rate,
          pt.override_fixed_amount,
          pt.display_order,
          pt.created_at,
          tt.name as tax_name,
          tt.description as tax_description,
          tt.code as tax_code,
          tt.rate as default_rate,
          tt.rate_type,
          tt.fixed_amount as default_fixed_amount,
          tt.applies_to_subtotal,
          tt.applies_to_delivery,
          tt.applies_to_tip
        FROM catalog.product_taxes pt
        INNER JOIN catalog.tax_types tt ON pt.tax_type_id = tt.id
        WHERE pt.product_id = $1 AND tt.is_active = TRUE
        ORDER BY pt.display_order, tt.name`,
        [productId]
      );

      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo impuestos del producto:', error);
      throw new ServiceUnavailableException(`Error al obtener impuestos del producto: ${error.message}`);
    }
  }

  /**
   * Asignar un impuesto a un producto
   */
  async assignTaxToProduct(productId: string, assignTaxDto: AssignTaxToProductDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que el producto existe
      const productResult = await dbPool.query(
        `SELECT id FROM catalog.products WHERE id = $1`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Verificar que el tipo de impuesto existe y está activo
      const taxResult = await dbPool.query(
        `SELECT id, rate_type FROM catalog.tax_types WHERE id = $1 AND is_active = TRUE`,
        [assignTaxDto.tax_type_id]
      );

      if (taxResult.rows.length === 0) {
        throw new NotFoundException('Tipo de impuesto no encontrado o inactivo');
      }

      const taxType = taxResult.rows[0];

      // Validar override según rate_type
      if (taxType.rate_type === 'fixed' && assignTaxDto.override_rate) {
        throw new BadRequestException('No se puede usar override_rate para impuestos de tipo fixed');
      }
      if (taxType.rate_type === 'percentage' && assignTaxDto.override_fixed_amount) {
        throw new BadRequestException('No se puede usar override_fixed_amount para impuestos de tipo percentage');
      }

      const result = await dbPool.query(
        `INSERT INTO catalog.product_taxes (
          product_id,
          tax_type_id,
          override_rate,
          override_fixed_amount,
          display_order
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (product_id, tax_type_id) DO UPDATE SET
          override_rate = EXCLUDED.override_rate,
          override_fixed_amount = EXCLUDED.override_fixed_amount,
          display_order = EXCLUDED.display_order
        RETURNING *`,
        [
          productId,
          assignTaxDto.tax_type_id,
          assignTaxDto.override_rate || null,
          assignTaxDto.override_fixed_amount || null,
          assignTaxDto.display_order || 0,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === '23503') { // Foreign key violation
        throw new NotFoundException('Producto o tipo de impuesto no encontrado');
      }
      console.error('❌ Error asignando impuesto a producto:', error);
      throw new ServiceUnavailableException(`Error al asignar impuesto a producto: ${error.message}`);
    }
  }

  /**
   * Desasignar un impuesto de un producto
   */
  async removeTaxFromProduct(productId: string, taxTypeId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `DELETE FROM catalog.product_taxes 
         WHERE product_id = $1 AND tax_type_id = $2
         RETURNING *`,
        [productId, taxTypeId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('El impuesto no está asignado a este producto');
      }

      return { message: 'Impuesto desasignado correctamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error desasignando impuesto de producto:', error);
      throw new ServiceUnavailableException(`Error al desasignar impuesto de producto: ${error.message}`);
    }
  }

  /**
   * Calcular impuestos para un producto y subtotal
   */
  async calculateProductTaxes(productId: string, subtotal: number) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const taxes = await this.getProductTaxes(productId);

      const taxBreakdown = taxes
        .filter(tax => tax.applies_to_subtotal)
        .map(tax => {
          const rate = tax.override_rate ?? tax.default_rate;
          const amount = tax.rate_type === 'percentage'
            ? subtotal * rate
            : tax.override_fixed_amount ?? tax.default_fixed_amount ?? 0;

          return {
            tax_type_id: tax.tax_type_id,
            tax_name: tax.tax_name,
            tax_code: tax.tax_code,
            rate: parseFloat(rate.toString()),
            rate_type: tax.rate_type,
            amount: Math.round(amount * 100) / 100, // Redondear a 2 decimales
            applied_to: 'subtotal',
          };
        });

      const totalTax = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);

      return {
        taxes: taxBreakdown,
        total_tax: Math.round(totalTax * 100) / 100,
      };
    } catch (error: any) {
      console.error('❌ Error calculando impuestos del producto:', error);
      throw new ServiceUnavailableException(`Error al calcular impuestos: ${error.message}`);
    }
  }
}

