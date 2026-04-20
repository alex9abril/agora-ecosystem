import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient, User, AuthResponse } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../../config/supabase.config';
import { dbPool } from '../../config/database.config';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { AdminSignUpDto } from './dto/admin-signup.dto';
import { EmailService } from '../email/email.service';
import { EmailTriggerType } from '../email-templates/dto/create-email-template.dto';
import { BusinessesService } from '../businesses/businesses.service';
import { KarbotService } from '../businesses/karbot.service';
import { IntegrationLogsService } from '../settings/integration-logs.service';

/**
 * Servicio de autenticación usando Supabase
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly emailService: EmailService,
    private readonly businessesService: BusinessesService,
    private readonly karbotService: KarbotService,
    private readonly integrationLogs: IntegrationLogsService,
  ) {}

  /**
   * Obtiene el usuario actual desde el token
   */
  async getUserFromToken(token: string): Promise<User> {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Tu sesión ha expirado o el token es inválido. Por favor, inicia sesión nuevamente.');
    }

    return user;
  }

  /**
   * Verifica si un usuario tiene un rol específico
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    if (!dbPool) {
      return false;
    }

    const result = await dbPool.query(
      'SELECT role FROM core.user_profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].role === role;
  }

  /**
   * Obtiene el perfil completo del usuario (incluyendo datos de user_profiles)
   */
  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(userId: string, updateDto: { first_name?: string; last_name?: string; phone?: string }) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que el perfil existe
      const existing = await this.getUserProfile(userId);
      if (!existing) {
        throw new UnauthorizedException('Perfil de usuario no encontrado');
      }

      // Construir la consulta UPDATE dinámicamente
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateDto.first_name !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        updateValues.push(updateDto.first_name || null);
      }
      if (updateDto.last_name !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        updateValues.push(updateDto.last_name || null);
      }
      if (updateDto.phone !== undefined) {
        // Validar que el teléfono no esté en uso por otro usuario
        if (updateDto.phone) {
          const phoneCheck = await dbPool.query(
            'SELECT id FROM core.user_profiles WHERE phone = $1 AND id != $2',
            [updateDto.phone, userId]
          );
          if (phoneCheck.rows.length > 0) {
            throw new ConflictException('Este teléfono ya está registrado por otro usuario');
          }
        }
        updateFields.push(`phone = $${paramIndex++}`);
        updateValues.push(updateDto.phone || null);
      }

      if (updateFields.length === 0) {
        return existing; // No hay cambios
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(userId);

      const result = await dbPool.query(
        `UPDATE core.user_profiles 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      console.error('❌ Error actualizando perfil:', error);
      throw new ServiceUnavailableException(`Error al actualizar perfil: ${error.message}`);
    }
  }

  /**
   * Registra una conexión del usuario (acceso al sitio).
   */
  async recordConnection(userId: string, ip?: string, userAgent?: string): Promise<void> {
    if (!dbPool) return;
    try {
      await dbPool.query(
        `INSERT INTO core.user_connections (user_id, ip_address, user_agent, app_context)
         VALUES ($1, $2, $3, 'web-local')`,
        [userId, ip || null, userAgent || null]
      );
    } catch (err: any) {
      console.error('Error registrando conexión:', err?.message);
    }
  }

  /**
   * Obtiene las últimas conexiones del usuario.
   * Si la tabla core.user_connections no existe (migración no aplicada), devuelve [].
   */
  async getMyConnections(
    userId: string,
    limit: number = 20,
  ): Promise<Array<{ id: string; connected_at: Date; ip_address: string | null; user_agent: string | null }>> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    try {
      const result = await dbPool.query(
        `SELECT id, connected_at, ip_address, user_agent
         FROM core.user_connections
         WHERE user_id = $1
         ORDER BY connected_at DESC
         LIMIT $2`,
        [userId, Math.min(limit, 100)]
      );
      return result.rows;
    } catch (err: any) {
      // Tabla no existe (migración no aplicada) o relación no encontrada
      if (err?.code === '42P01' || (typeof err?.message === 'string' && err.message.includes('user_connections') && err.message.includes('does not exist'))) {
        return [];
      }
      throw err;
    }
  }

  async getUserProfile(userId: string) {
    // Usar conexión directa a PostgreSQL porque la tabla está en el schema 'core'
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let result = await dbPool.query(
        'SELECT * FROM core.user_profiles WHERE id = $1',
        [userId]
      );


      // Si no existe el perfil, intentar obtener información del usuario desde auth.users
      // y crear el perfil automáticamente
      if (result.rows.length === 0) {
        console.warn('⚠️  No se encontró perfil para userId:', userId);
        
        // Obtener información del usuario desde Supabase Auth
        if (!supabaseAdmin) {
          throw new ServiceUnavailableException('Servicio de autenticación no configurado');
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
          console.error('❌ No se pudo obtener usuario de auth.users:', authError?.message);
          throw new UnauthorizedException('Usuario no encontrado en el sistema de autenticación');
        }

        const user = authUser.user;

        // Crear perfil con información básica
        // Intentar extraer nombre del user_metadata
        const firstName = user.user_metadata?.first_name || user.user_metadata?.firstName || null;
        const lastName = user.user_metadata?.last_name || user.user_metadata?.lastName || null;
        let phone = user.user_metadata?.phone || user.phone || null;
        
        // Validar y limpiar el teléfono si existe
        if (phone) {
          // Verificar si el teléfono ya existe en otro perfil
          const phoneCheck = await dbPool.query(
            'SELECT id FROM core.user_profiles WHERE phone = $1 AND id != $2',
            [phone, userId]
          );
          if (phoneCheck.rows.length > 0) {
            console.warn('⚠️  Teléfono ya existe en otro perfil, estableciendo a null');
            phone = null; // Evitar constraint violation
          }
        }
        
        // Determinar el rol (por defecto 'client', pero puede estar en metadata)
        // Validar que el rol sea uno de los permitidos
        const validRoles = ['client', 'repartidor', 'local', 'admin'];
        let role = user.user_metadata?.role || 'client';
        if (!validRoles.includes(role)) {
          console.warn(`⚠️  Rol inválido '${role}', usando 'client' por defecto`);
          role = 'client';
        }

        try {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[AuthService.getUserProfile] Creando perfil:', {
              userId,
              role,
              firstName,
              lastName,
              phone,
            });
          }

          const insertResult = await dbPool.query(
            `INSERT INTO core.user_profiles (id, role, first_name, last_name, phone, phone_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              userId,
              role,
              firstName,
              lastName,
              phone,
              false,
              true,
            ]
          );

          return insertResult.rows[0];
        } catch (insertError: any) {
          console.error('❌ Error al crear perfil automáticamente:', {
            message: insertError.message,
            code: insertError.code,
            detail: insertError.detail,
            hint: insertError.hint,
            constraint: insertError.constraint,
          });
          
          // Si es un error de constraint (por ejemplo, foreign key), proporcionar más información
          if (insertError.code === '23503') {
            throw new UnauthorizedException(
              `No se pudo crear el perfil: El usuario no existe en auth.users o hay un problema de referencia. Detalle: ${insertError.detail || insertError.message}`
            );
          }
          
          // Si es un error de constraint único (duplicado)
          if (insertError.code === '23505') {
            // El perfil ya existe, intentar obtenerlo nuevamente
            const retryResult = await dbPool.query(
              'SELECT * FROM core.user_profiles WHERE id = $1',
              [userId]
            );
            if (retryResult.rows.length > 0) {
              return retryResult.rows[0];
            }
          }
          
          // Si falla la inserción, lanzar el error con más detalles
          throw new UnauthorizedException(
            `Perfil de usuario no encontrado y no se pudo crear automáticamente: ${insertError.message || insertError.detail || 'Error desconocido'}`
          );
        }
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error en getUserProfile:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack,
      });
      
      // Si es un error de conexión o de base de datos, lanzar ServiceUnavailableException
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code?.startsWith('28')) {
        throw new ServiceUnavailableException(`Error de conexión a la base de datos: ${error.message}`);
      }
      
      // Si es un error de autenticación de PostgreSQL
      if (error.code === '28P01') {
        throw new ServiceUnavailableException('Error de autenticación con la base de datos. Verifica DATABASE_URL');
      }
      
      // Si es un error de schema o tabla no encontrada
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new ServiceUnavailableException(`Tabla o schema no encontrado: ${error.message}`);
      }
      
      // Si es UnauthorizedException, re-lanzarlo tal cual
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Para otros errores, re-lanzar como BadRequestException con más detalles
      throw new BadRequestException(`Error al obtener perfil: ${error.message}`);
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async signUp(signUpDto: SignUpDto) {
    // Debug: Verificar estado de Supabase
    
    if (!supabase) {
      console.error('❌ ERROR: supabase client es NULL');
      console.error('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configurado' : 'Faltante');
      console.error('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Faltante');
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }


    // Determinar el rol del usuario (default: 'client')
    const platformRole = signUpDto.role || 'client';
    const requiresEmailConfirmation = !!signUpDto.requiresEmailConfirmation;
    const frontendBaseUrl = (process.env.FRONTEND_URL || 'https://agoramp.mx').replace(/\/+$/, '');
    const confirmationRedirectBaseUrl = (signUpDto.appUrl || frontendBaseUrl).replace(/\/+$/, '');
    const emailConfirmationRedirectTo = `${confirmationRedirectBaseUrl}/auth/email-verified`;

    // Resolver businessId / businessGroupId desde slug si no vienen en el body (registro desde URL contextual)
    let resolvedBusinessId: string | undefined = signUpDto.businessId;
    let resolvedBusinessGroupId: string | undefined = signUpDto.businessGroupId;
    if (!resolvedBusinessId && signUpDto.businessSlug) {
      try {
        const branch = await this.businessesService.getBranchBySlug(signUpDto.businessSlug);
        if (branch) {
          resolvedBusinessId = branch.id;
          if (!resolvedBusinessGroupId && branch.business_group_id) {
            resolvedBusinessGroupId = branch.business_group_id;
          }
          console.log('[AuthService.signUp] Resolución por slug: businessId=', resolvedBusinessId, 'businessGroupId=', resolvedBusinessGroupId);
        }
      } catch (e) {
        console.warn('[AuthService.signUp] No se pudo resolver sucursal por slug:', signUpDto.businessSlug, (e as Error)?.message);
      }
    }
    if (!resolvedBusinessGroupId && signUpDto.businessGroupSlug) {
      try {
        const group = await this.businessesService.getBusinessGroupBySlug(signUpDto.businessGroupSlug);
        if (group) {
          resolvedBusinessGroupId = group.id;
          console.log('[AuthService.signUp] Resolución grupo por slug: businessGroupId=', resolvedBusinessGroupId);
        }
      } catch (e) {
        console.warn('[AuthService.signUp] No se pudo resolver grupo por slug:', signUpDto.businessGroupSlug, (e as Error)?.message);
      }
    }

    // Validar duplicados antes de crear el usuario en Auth
    if (dbPool && signUpDto.phone) {
      const phoneCheck = await dbPool.query(
        'SELECT id FROM core.user_profiles WHERE phone = $1',
        [signUpDto.phone]
      );
      if (phoneCheck.rows.length > 0) {
        throw new ConflictException('Este teléfono ya está registrado. Usa otro número.');
      }
    }

    // Para usuarios 'client', usar admin client para confirmar email automáticamente
    // Para otros roles (local, admin, repartidor), usar signUp normal (requiere confirmación)
    let authData: any;
    let authError: any = null;
    let session: any = null;
    let confirmationLink: string | null = null;

    if (platformRole === 'client' && supabaseAdmin) {
      // Intentar usar admin client para crear usuario client
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email: signUpDto.email,
        password: signUpDto.password,
        email_confirm: !requiresEmailConfirmation,
        user_metadata: {
          first_name: signUpDto.firstName,
          last_name: signUpDto.lastName,
          phone: signUpDto.phone,
        },
      });

      if (adminError) {
        // Si falla con "User not allowed" o similar, usar enfoque alternativo
        if (adminError.message.includes('not allowed') || adminError.message.includes('User not allowed') || adminError.code === 'not_admin') {
          
          // Verificar si el usuario ya existe
          try {
            const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (!listError && existingUsers?.users) {
              const existingUser = (existingUsers.users as any[]).find(
                (u: any) => u.email?.toLowerCase() === signUpDto.email.toLowerCase()
              );
              if (existingUser) {
                throw new ConflictException('Este email ya está registrado. Si ya tienes una cuenta, intenta iniciar sesión.');
              }
            }
          } catch (checkError: any) {
            if (checkError instanceof ConflictException) {
              throw checkError;
            }
            console.warn('⚠️  No se pudo verificar usuarios existentes:', checkError.message);
          }

          // Crear usuario con signUp normal (Supabase dispara correo de confirmación si está habilitado)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: signUpDto.email,
            password: signUpDto.password,
            options: {
              emailRedirectTo: emailConfirmationRedirectTo,
              data: {
                first_name: signUpDto.firstName,
                last_name: signUpDto.lastName,
                phone: signUpDto.phone,
              },
            },
          });

          if (signUpError) {
            authError = signUpError;
            authData = signUpData;
            session = signUpData?.session;
          } else if (signUpData?.user) {
            const userId = signUpData.user.id;
            authData = { user: signUpData.user };
            session = signUpData.session;
            if (requiresEmailConfirmation) {
              session = null;
            }

            if (requiresEmailConfirmation && supabaseAdmin) {
              try {
                const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                  type: 'signup',
                  email: signUpDto.email,
                  password: signUpDto.password,
                  options: {
                    redirectTo: emailConfirmationRedirectTo,
                    data: {
                      first_name: signUpDto.firstName,
                      last_name: signUpDto.lastName,
                      phone: signUpDto.phone,
                    },
                  },
                });

                if (linkError) {
                  console.warn('⚠️  No se pudo generar link de confirmación:', linkError.message);
                } else {
                  confirmationLink = linkData?.properties?.action_link || null;
                }
              } catch (linkErr: any) {
                console.warn('⚠️  Error generando link de confirmación:', linkErr.message);
              }

              // Enviar correo de confirmación con el link generado
              if (confirmationLink) {
                const userName = `${signUpDto.firstName || ''} ${signUpDto.lastName || ''}`.trim() || signUpDto.email;
                this.emailService.sendEmailConfirmation(
                  signUpDto.email,
                  userName,
                  confirmationLink,
                  { userId: signUpData.user.id },
                ).catch((err) => {
                  console.error('❌ Error enviando correo de confirmación fallback (no crítico):', err);
                });
              }
            }

            if (!requiresEmailConfirmation) {
              // Confirmar email usando SQL directo (más confiable que admin client)
              try {
                if (dbPool) {
                  // Confirmar email directamente en la base de datos
                  // Nota: confirmed_at es una columna generada, no se puede actualizar directamente
                  await dbPool.query(
                    `UPDATE auth.users 
                     SET email_confirmed_at = CURRENT_TIMESTAMP,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [userId]
                  );
                } else if (supabaseAdmin) {
                  // Fallback: intentar con admin client (puede fallar si no tiene permisos)
                  try {
                    await supabaseAdmin.auth.admin.updateUserById(userId, {
                      email_confirm: true,
                    });
                  } catch (adminError: any) {
                    console.warn('⚠️  No se pudo confirmar email con admin client (puede ser problema de permisos):', adminError.message);
                    // Continuar de todas formas - el usuario puede confirmar manualmente más tarde
                  }
                }
                
                // Esperar un momento para asegurar que la confirmación se procese
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Después de confirmar el email, crear sesión automáticamente
                try {
                  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: signUpDto.email,
                    password: signUpDto.password,
                  });
                  if (signInError) {
                    console.error('❌ Error al iniciar sesión después de confirmar email:', {
                      message: signInError.message,
                      status: signInError.status,
                    });
                    // Intentar una vez más después de esperar más tiempo
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const { data: retrySignInData, error: retrySignInError } = await supabase.auth.signInWithPassword({
                      email: signUpDto.email,
                      password: signUpDto.password,
                    });
                    if (!retrySignInError && retrySignInData?.session) {
                      session = retrySignInData.session;
                      authData = { user: retrySignInData.user };
                    } else {
                      console.error('❌ Error en segundo intento de crear sesión:', retrySignInError?.message);
                    }
                  } else if (signInData?.session) {
                    session = signInData.session;
                    authData = { user: signInData.user };
                    if (process.env.NODE_ENV !== 'production') {
                      console.debug('[AuthService.signUp] Sesión creada (confirm email):', {
                        hasSession: !!session,
                        hasAccessToken: !!session?.access_token,
                        hasRefreshToken: !!session?.refresh_token,
                      });
                    }
                  } else {
                    console.warn('⚠️  No se pudo crear sesión después de confirmar email: signInData no tiene session');
                  }
                } catch (sessionErr: any) {
                  console.error('❌ Excepción creando sesión después de confirmar email:', {
                    message: sessionErr.message,
                    stack: sessionErr.stack,
                  });
                }
              } catch (confirmError: any) {
                console.error('❌ Error al confirmar email automáticamente:', confirmError);
                // Continuar de todas formas, el usuario puede confirmar manualmente
              }
            }
          }
        } else {
          // Otro tipo de error del admin client
          authError = adminError;
        }
      } else if (adminData.user) {
        authData = { user: adminData.user };
        if (requiresEmailConfirmation && supabaseAdmin) {
          try {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'signup',
              email: signUpDto.email,
              password: signUpDto.password,
              options: {
                redirectTo: emailConfirmationRedirectTo,
                data: {
                  first_name: signUpDto.firstName,
                  last_name: signUpDto.lastName,
                  phone: signUpDto.phone,
                },
              },
            });

            if (linkError) {
              console.warn('⚠️  No se pudo generar link de confirmación:', linkError.message);
            } else {
              confirmationLink = linkData?.properties?.action_link || null;
            }
          } catch (linkErr: any) {
            console.warn('⚠️  Error generando link de confirmación:', linkErr.message);
          }

          // Enviar correo de confirmación con el link generado
          if (confirmationLink) {
            const userName = `${signUpDto.firstName || ''} ${signUpDto.lastName || ''}`.trim() || signUpDto.email;
            this.emailService.sendEmailConfirmation(
              signUpDto.email,
              userName,
              confirmationLink,
              { userId: adminData.user.id },
            ).catch((err) => {
              console.error('❌ Error enviando correo de confirmación (no crítico):', err);
            });
          }
        }

        if (!requiresEmailConfirmation) {
          // Para usuarios creados con admin, necesitamos crear una sesión manualmente
          // Iniciar sesión automáticamente para crear la sesión
          
          // Esperar un momento para asegurar que el usuario esté completamente creado
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: signUpDto.email,
              password: signUpDto.password,
            });
            
            if (signInError) {
              console.error('❌ Error al iniciar sesión después de crear usuario:', {
                message: signInError.message,
                status: signInError.status,
              });
              // Si falla, intentar una vez más después de esperar
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: retrySignInData, error: retrySignInError } = await supabase.auth.signInWithPassword({
                email: signUpDto.email,
                password: signUpDto.password,
              });
              if (!retrySignInError && retrySignInData?.session) {
                session = retrySignInData.session;
                authData = { user: retrySignInData.user };
              } else {
                console.error('❌ Error en segundo intento de crear sesión:', retrySignInError?.message);
              }
            } else if (signInData?.session) {
              session = signInData.session;
              authData = { user: signInData.user };
              if (process.env.NODE_ENV !== 'production') {
                console.debug('[AuthService.signUp] Sesión creada (admin):', {
                  hasSession: !!session,
                  hasAccessToken: !!session?.access_token,
                  hasRefreshToken: !!session?.refresh_token,
                });
              }
            } else {
              console.warn('⚠️  No se pudo crear sesión automática: signInData no tiene session');
            }
          } catch (sessionErr: any) {
            console.error('❌ Excepción creando sesión automática:', {
              message: sessionErr.message,
              stack: sessionErr.stack,
            });
          }
        }
      }
    } else {
      // Para otros roles, usar signUp normal (Supabase envía correo de confirmación automáticamente)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
        options: {
          emailRedirectTo: emailConfirmationRedirectTo,
          data: {
            first_name: signUpDto.firstName,
            last_name: signUpDto.lastName,
            phone: signUpDto.phone,
          },
        },
      });

      authData = signUpData;
      authError = signUpError;
      session = signUpData?.session;
    }

    if (authError) {
      console.error('❌ Error en Supabase Auth:', authError);
      
      // Mensajes personalizados según el tipo de error
      if (authError.message.includes('already registered') || authError.message.includes('already exists') || authError.message.includes('User already registered')) {
        throw new ConflictException('Este email ya está registrado en nuestra plataforma. Si ya tienes una cuenta, intenta iniciar sesión.');
      }
      
      if (authError.message.includes('Password') && authError.message.includes('weak')) {
        throw new BadRequestException('La contraseña es demasiado débil. Por favor, usa una contraseña más segura con al menos 6 caracteres.');
      }
      
      if (authError.message.includes('Email') && authError.message.includes('invalid')) {
        throw new BadRequestException('El formato del email no es válido. Por favor, verifica que esté escrito correctamente.');
      }
      
      throw new BadRequestException('No se pudo completar el registro. Por favor, verifica los datos proporcionados e intenta nuevamente.');
    }

    if (!authData || !authData.user) {
      console.error('❌ ERROR: authData.user es null');
      console.error('  authData:', JSON.stringify(authData, null, 2));
      throw new BadRequestException('No se pudo crear el usuario');
    }


    // Crear perfil en core.user_profiles usando conexión directa
    if (dbPool) {
      try {
        await dbPool.query(
          `INSERT INTO core.user_profiles (id, role, first_name, last_name, phone, phone_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            authData.user.id,
            platformRole,
            signUpDto.firstName,
            signUpDto.lastName,
            signUpDto.phone || null,
            false,
            true,
          ]
        );
      } catch (profileError: any) {
        console.error('❌ Error creando perfil de usuario:', profileError);
        console.error('  Detalles:', profileError.message);
        if (profileError.code === '23505') {
          if (profileError.constraint === 'user_profiles_phone_key') {
            throw new ConflictException('Este teléfono ya está registrado. Usa otro número.');
          }
          if (profileError.constraint === 'user_profiles_pkey') {
            throw new ConflictException('Este usuario ya tiene un perfil asociado. Inicia sesión.');
          }
        }
        throw new BadRequestException('No se pudo crear el perfil del usuario.');
      }
    } else {
      console.warn('⚠️  dbPool no está disponible, no se creará perfil en core.user_profiles');
    }

    // Para usuarios que requieren confirmación, no se genera sesión automáticamente
    const needsEmailConfirmation = requiresEmailConfirmation || (!session && platformRole !== 'client');

    // Log final de la respuesta

    // Enviar correo/WhatsApp de bienvenida según configuración (no bloquea el flujo si falla)
    let emailEnabled = true;
    let whatsappEnabled = false;
    if (resolvedBusinessId) {
      const channels = await this.businessesService.getNotificationChannels(
        resolvedBusinessId,
        'user_registration',
      );
      emailEnabled = channels.emailEnabled;
      whatsappEnabled = channels.whatsappEnabled;
      console.log('[AuthService.signUp] Canales user_registration:', { businessId: resolvedBusinessId, emailEnabled, whatsappEnabled });
    } else {
      console.log('[AuthService.signUp] Sin businessId; se usará template global para correo de bienvenida (emailEnabled=true por defecto).');
    }

    if (emailEnabled && authData.user && authData.user.email) {
      const userName = `${signUpDto.firstName} ${signUpDto.lastName}`.trim() || signUpDto.email;
      const fallbackUrl = `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/dashboard`;
      const dashboardUrl = signUpDto.appUrl || confirmationLink || fallbackUrl;

      console.log('[AuthService.signUp] Enviando correo de bienvenida desde nuestro aplicativo:', {
        to: authData.user.email,
        businessId: resolvedBusinessId ?? null,
        businessGroupId: resolvedBusinessGroupId ?? null,
      });

      this.emailService.sendWelcomeEmail(
        authData.user.email,
        userName,
        dashboardUrl,
        resolvedBusinessId,
        resolvedBusinessGroupId,
        { userId: authData.user.id }
      ).then((status) => {
        console.log('[AuthService.signUp] Resultado envío correo de bienvenida:', status);
      }).catch((error) => {
        console.error('❌ Error enviando correo de bienvenida (no crítico):', error);
      });
    } else {
      console.log('[AuthService.signUp] No se envía correo de bienvenida desde nuestro aplicativo: emailEnabled=', emailEnabled, 'hasUser=', !!authData.user, 'hasEmail=', !!(authData.user && authData.user.email));
    }

    if (whatsappEnabled && resolvedBusinessId) {
      if (!signUpDto.phone) {
        await this.integrationLogs.log({
          integration: 'karbot',
          eventType: 'user_registration',
          channel: 'whatsapp',
          status: 'skipped',
          businessId: resolvedBusinessId,
          userId: authData.user?.id,
          message: 'Telefono no disponible para WhatsApp',
        });
      } else {
        this.karbotService.sendWhatsappNotification({
          businessId: resolvedBusinessId,
          triggerType: 'user_registration',
          to: signUpDto.phone,
          userId: authData.user?.id,
          data: {
            user_name: `${signUpDto.firstName || ''} ${signUpDto.lastName || ''}`.trim() || signUpDto.email,
            app_url: signUpDto.appUrl || confirmationLink || `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/dashboard`,
          },
        }).catch((error) => {
          console.error('❌ Error enviando WhatsApp de bienvenida (no crítico):', error);
        });
      }
    }

    // Notificar supervisores del nuevo registro (si hay negocio asociado)
    if (resolvedBusinessId && authData.user) {
      this.sendSupervisorRegistrationNotification(
        resolvedBusinessId,
        resolvedBusinessGroupId ?? null,
        `${signUpDto.firstName || ''} ${signUpDto.lastName || ''}`.trim() || signUpDto.email,
        authData.user.email || signUpDto.email,
        signUpDto.phone,
        authData.user.id,
      ).catch((err) => {
        console.error('❌ Error enviando notificación de registro a supervisores (no crítico):', err);
      });
    }

    return {
      user: authData.user,
      session: session || null,
      accessToken: session?.access_token || null,
      refreshToken: session?.refresh_token || null,
      message: needsEmailConfirmation
        ? 'Usuario registrado exitosamente. Por favor, verifica tu email para confirmar tu cuenta.'
        : 'Usuario registrado exitosamente. Ya puedes iniciar sesión.',
      needsEmailConfirmation,
    };
  }

  /**
   * Liberar email en desarrollo (no elimina el usuario, solo cambia el email)
   */
  async releaseEmailForDev(email: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Acción no permitida en producción');
    }
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de autenticación admin no configurado');
    }

    let userId: string | null = null;
    let originalEmail = email;

    if (dbPool) {
      const result = await dbPool.query(
        'SELECT id, email FROM auth.users WHERE lower(email) = lower($1)',
        [email]
      );
      if (result.rows.length > 0) {
        userId = result.rows[0].id;
        originalEmail = result.rows[0].email;
      }
    }

    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (!error && data?.users) {
        const user = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (user) {
          userId = user.id;
          originalEmail = user.email || email;
        }
      }
    }

    if (!userId) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newEmail = `deleted+${userId.slice(0, 8)}-${Date.now()}@agoramp.mx`;
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });

    if (updateError) {
      throw new BadRequestException(`No se pudo liberar el email: ${updateError.message}`);
    }

    if (dbPool) {
      await dbPool.query(
        `UPDATE core.user_profiles
         SET is_active = FALSE,
             is_blocked = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );
    }

    return {
      success: true,
      userId,
      originalEmail,
      newEmail,
      message: 'Email liberado para pruebas',
    };
  }

  /**
   * Registra un nuevo usuario administrador
   * Este método solo permite crear usuarios con rol 'admin'
   */
  async signUpAdmin(adminSignUpDto: AdminSignUpDto) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de autenticación admin no configurado');
    }

    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }


    let adminData: any = null;
    let adminError: any = null;
    let userId: string | null = null;

    // Primero intentar crear usuario usando admin client
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: adminSignUpDto.email,
        password: adminSignUpDto.password,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: {
          first_name: adminSignUpDto.firstName,
          last_name: adminSignUpDto.lastName,
          phone: adminSignUpDto.phone,
          role: 'admin', // Siempre admin
        },
      });

      if (error) {
        adminError = error;
        console.warn('⚠️  Error con admin client:', error.message);
      } else if (data?.user) {
        adminData = data;
        userId = data.user.id;
      }
    } catch (err: any) {
      console.warn('⚠️  Excepción al usar admin client:', err.message);
      adminError = err;
    }

    // Si falla con "User not allowed" o similar, usar enfoque alternativo
    if (adminError && (adminError.message.includes('not allowed') || adminError.message.includes('User not allowed'))) {
      
      // Verificar si el usuario ya existe
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && existingUsers?.users) {
        const existingUser = (existingUsers.users as any[]).find(
          (u: any) => u.email?.toLowerCase() === adminSignUpDto.email.toLowerCase()
        );
        if (existingUser) {
          throw new ConflictException('Este email ya está registrado. Si ya tienes una cuenta de administrador, intenta iniciar sesión.');
        }
      }

      // Crear usuario con signUp normal
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminSignUpDto.email,
        password: adminSignUpDto.password,
        options: {
          data: {
            first_name: adminSignUpDto.firstName,
            last_name: adminSignUpDto.lastName,
            phone: adminSignUpDto.phone,
            role: 'admin',
          },
        },
      });

      if (signUpError) {
        console.error('❌ Error en signUp normal:', signUpError);
        
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists') || signUpError.message.includes('User already registered')) {
          throw new ConflictException('Este email ya está registrado. Si ya tienes una cuenta de administrador, intenta iniciar sesión.');
        }
        
        if (signUpError.message.includes('Password') && signUpError.message.includes('weak')) {
          throw new BadRequestException('La contraseña es demasiado débil. Por favor, usa una contraseña más segura.');
        }
        
        if (signUpError.message.includes('Email') && signUpError.message.includes('invalid')) {
          throw new BadRequestException('El formato del email no es válido. Por favor, verifica que esté escrito correctamente.');
        }
        
        throw new BadRequestException('No se pudo crear la cuenta de administrador. Por favor, verifica los datos e intenta nuevamente.');
      }

      if (!signUpData?.user) {
        throw new BadRequestException('No se pudo crear el administrador');
      }

      userId = signUpData.user.id;
      adminData = { user: signUpData.user };

      // Confirmar email usando admin client
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
      } catch (confirmError: any) {
        console.warn('⚠️  No se pudo confirmar email automáticamente:', confirmError.message);
        // Continuar de todas formas, el usuario puede confirmar manualmente
      }
    } else if (adminError) {
      // Otro tipo de error
      console.error('❌ Error en Supabase Auth:', adminError);
      
      if (adminError.message.includes('already registered') || adminError.message.includes('already exists') || adminError.message.includes('User already registered')) {
        throw new ConflictException('Este email ya está registrado. Si ya tienes una cuenta de administrador, intenta iniciar sesión.');
      }
      
      if (adminError.message.includes('Password') && adminError.message.includes('weak')) {
        throw new BadRequestException('La contraseña es demasiado débil. Por favor, usa una contraseña más segura.');
      }
      
      if (adminError.message.includes('Email') && adminError.message.includes('invalid')) {
        throw new BadRequestException('El formato del email no es válido. Por favor, verifica que esté escrito correctamente.');
      }
      
      throw new BadRequestException('No se pudo crear la cuenta de administrador. Por favor, verifica los datos e intenta nuevamente.');
    }

    if (!adminData || !adminData.user || !userId) {
      console.error('❌ ERROR: No se pudo crear el usuario');
      throw new BadRequestException('No se pudo crear el administrador');
    }


    // Crear perfil en core.user_profiles con rol 'admin'
    if (dbPool) {
      try {
        // Verificar si el teléfono ya existe antes de insertar
        let phoneToInsert = adminSignUpDto.phone || null;
        if (phoneToInsert) {
          const phoneCheck = await dbPool.query(
            'SELECT id FROM core.user_profiles WHERE phone = $1',
            [phoneToInsert]
          );
          if (phoneCheck.rows.length > 0) {
            console.warn(`⚠️  El teléfono ${phoneToInsert} ya está en uso, se creará el perfil sin teléfono`);
            phoneToInsert = null;
          }
        }

        await dbPool.query(
          `INSERT INTO core.user_profiles (id, role, first_name, last_name, phone, phone_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            'admin', // Siempre admin
            adminSignUpDto.firstName,
            adminSignUpDto.lastName,
            phoneToInsert,
            false,
            true,
          ]
        );
      } catch (profileError: any) {
        console.error('❌ Error creando perfil de administrador:', profileError);
        // Si el error es por teléfono duplicado, intentar sin teléfono
        if (profileError.code === '23505' && profileError.constraint === 'user_profiles_phone_key') {
          try {
            await dbPool.query(
              `INSERT INTO core.user_profiles (id, role, first_name, last_name, phone, phone_verified, is_active)
               VALUES ($1, $2, $3, $4, NULL, $5, $6)`,
              [
                userId,
                'admin',
                adminSignUpDto.firstName,
                adminSignUpDto.lastName,
                false,
                true,
              ]
            );
          } catch (retryError: any) {
            console.error('❌ Error en reintento de creación de perfil:', retryError);
            // No lanzamos error aquí para no bloquear el registro
          }
        }
        // No lanzamos error aquí para no bloquear el registro
      }
    } else {
      console.warn('⚠️  dbPool no está disponible, no se creará perfil en core.user_profiles');
    }

    // Crear sesión para el administrador usando el cliente normal de supabase
    let session = null;
    if (supabase) {
      try {
        // Iniciar sesión para obtener la sesión completa
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminSignUpDto.email,
          password: adminSignUpDto.password,
        });

        if (!signInError && signInData?.session) {
          session = signInData.session;
        } else {
          console.warn('⚠️  No se pudo crear sesión automática:', signInError?.message);
        }
      } catch (sessionErr: any) {
        console.warn('⚠️  No se pudo crear sesión automática, el usuario deberá iniciar sesión manualmente');
      }
    }

    return {
      user: adminData.user,
      session: session || null,
      accessToken: session?.access_token || null,
      refreshToken: session?.refresh_token || null,
      message: 'Administrador registrado exitosamente. Ya puedes iniciar sesión.',
      needsEmailConfirmation: false,
    };
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async signIn(signInDto: SignInDto) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    // No confirmar email automáticamente durante signIn

    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInDto.email,
      password: signInDto.password,
    });

    if (error) {
      console.error('❌ Error en signIn:', error);

      const supabaseError = {
        message: error.message,
        status: error.status,
        code: (error as any).code,
      };

      const withSupabaseDetail = (userMessage: string) => ({
        message: `${userMessage} (Supabase: ${error.message})`,
        supabaseError,
      });

      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        throw new UnauthorizedException(withSupabaseDetail('Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.'));
      }

      // Mensajes personalizados según el tipo de error
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid')) {
        throw new UnauthorizedException(withSupabaseDetail('Las credenciales proporcionadas son incorrectas. Por favor, verifica tu email y contraseña.'));
      }

      if (error.message.includes('User not found') || error.message.includes('user_not_found')) {
        throw new UnauthorizedException(withSupabaseDetail('No existe una cuenta asociada a este email. Por favor, verifica tu dirección de correo electrónico.'));
      }

      if (error.message.includes('Too many requests') || error.message.includes('rate_limit')) {
        throw new UnauthorizedException(withSupabaseDetail('Demasiados intentos de inicio de sesión. Por favor, espera unos minutos e intenta nuevamente.'));
      }

      // Error genérico con detalle de Supabase
      throw new UnauthorizedException(withSupabaseDetail('No se pudo iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.'));
    }

    if (!data.user || !data.session) {
      console.error('❌ No se pudo obtener usuario o sesión');
      throw new UnauthorizedException('No se pudo completar el inicio de sesión. Por favor, intenta nuevamente.');
    }


    // Obtener perfil del usuario usando conexión directa
    let profile = null;
    if (dbPool) {
      try {
        const profileResult = await dbPool.query(
          'SELECT * FROM core.user_profiles WHERE id = $1',
          [data.user.id]
        );
        profile = profileResult.rows[0] || null;
        if (!profile) {
          console.warn('⚠️  No se encontró perfil para el usuario:', data.user.id);
        }
      } catch (e) {
        console.error('Error obteniendo perfil en signIn:', e);
      }
    }

    return {
      user: {
        ...data.user,
        profile,
      },
      session: data.session,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  /**
   * Origen público del storefront (fallback cuando no hay redirectTo del navegador).
   * FRONTEND_URL primero; si falta, PASSWORD_RESET (a veces solo localhost en .env del API).
   */
  private resolveStorefrontOriginForPasswordReset(): string {
    const tryOrigin = (raw?: string | null): string | null => {
      const s = raw?.trim();
      if (!s) return null;
      try {
        return new URL(s).origin;
      } catch {
        return null;
      }
    };
    return (
      tryOrigin(process.env.FRONTEND_URL) ||
      tryOrigin(process.env.PASSWORD_RESET_REDIRECT_URL) ||
      'http://localhost:3000'
    );
  }

  /**
   * Orígenes permitidos para recovery (evita open redirect; incluye CORS y localhost típicos).
   */
  private collectTrustedRecoveryOrigins(): Set<string> {
    const out = new Set<string>();
    const addUrl = (raw?: string | null) => {
      const s = raw?.trim();
      if (!s) return;
      if (s.includes(',')) {
        s.split(',').forEach((part) => addUrl(part.trim()));
        return;
      }
      try {
        out.add(new URL(s).origin);
      } catch {
        /* ignore */
      }
    };
    addUrl(process.env.FRONTEND_URL);
    addUrl(process.env.PASSWORD_RESET_REDIRECT_URL);
    addUrl(process.env.CORS_ORIGIN);
    addUrl(process.env.STOREFRONT_PUBLIC_URL);
    [3000, 3008, 3001, 3002, 3005, 3006].forEach((port) => {
      out.add(`http://localhost:${port}`);
      out.add(`http://127.0.0.1:${port}`);
    });
    return out;
  }

  /**
   * Origen del formulario de reset: el que envía el navegador en redirectTo (p. ej. https://agoramp.mx)
   * si es de confianza; si no, fallback por env (evita localhost del API cuando el usuario está en producción).
   */
  private resolveTrustedOriginForRecovery(redirectTo?: string): string {
    const fallback = this.resolveStorefrontOriginForPasswordReset();
    const trusted = this.collectTrustedRecoveryOrigins();
    if (redirectTo?.trim()) {
      try {
        const o = new URL(redirectTo).origin;
        if (trusted.has(o)) {
          return o;
        }
      } catch {
        /* seguir */
      }
    }
    return fallback;
  }

  private canonicalStorefrontPath(pathname: string): string {
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return pathname.slice(0, -1);
    }
    return pathname;
  }

  /**
   * Pathnames permitidos para el redirect tras recovery en el mismo origen que el storefront.
   * Incluye reset global y rutas contextualizadas: sucursal, grupo o marca (brand).
   */
  private isTrustedStorefrontResetPath(pathname: string): boolean {
    const normalized = this.canonicalStorefrontPath(pathname);
    return (
      /^\/auth\/reset-password$/.test(normalized) ||
      /^\/sucursal\/[^/]+\/auth\/reset-password$/.test(normalized) ||
      /^\/grupo\/[^/]+\/auth\/reset-password$/.test(normalized) ||
      /^\/brand\/[^/]+\/auth\/reset-password$/.test(normalized)
    );
  }

  /**
   * Nunca usar solo la raíz del sitio como redirect: el usuario debe aterrizar en el formulario de nueva contraseña.
   */
  private normalizeDefaultPasswordResetLanding(siteOrigin: string): string {
    const explicit = process.env.PASSWORD_RESET_REDIRECT_URL?.trim();
    if (explicit) {
      try {
        const u = new URL(explicit);
        const p = u.pathname || '/';
        if (p === '/' || p === '') {
          return `${u.origin}/auth/reset-password`;
        }
        return explicit;
      } catch {
        /* seguir */
      }
    }
    return `${siteOrigin}/auth/reset-password`;
  }

  /**
   * Resuelve redirect_to para generateLink(recovery).
   * - Prioriza la URL completa del navegador cuando apunta a un formulario contextual (sucursal/grupo/marca).
   * - Si hay slugs de contexto pero redirectTo es solo /auth/reset-password, ignora ese redirectTo y construye la ruta dinámica.
   * - Fallback: /auth/reset-password en el origen público.
   */
  private resolvePasswordResetRedirectUrl(payload: {
    redirectTo?: string;
    branchSlug?: string;
    groupSlug?: string;
    brandSlug?: string;
  }): string {
    const { redirectTo, branchSlug, groupSlug, brandSlug } = payload;

    const siteOrigin = this.resolveStorefrontOriginForPasswordReset();
    const trustedOrigins = this.collectTrustedRecoveryOrigins();

    const allowedRedirects = (process.env.PASSWORD_RESET_ALLOWED_REDIRECTS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const branchSlugTrim = branchSlug?.trim();
    const groupSlugTrim = groupSlug?.trim();
    const brandSlugTrim = brandSlug?.trim();
    const hasStoreContextSlug = Boolean(branchSlugTrim || groupSlugTrim || brandSlugTrim);

    const matchesAllowlist = (urlString: string): boolean => {
      if (!allowedRedirects.length) return false;
      let target: URL;
      try {
        target = new URL(urlString);
      } catch {
        return false;
      }
      return allowedRedirects.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed);
          const basePath = allowedUrl.pathname || '/';
          return target.origin === allowedUrl.origin && target.pathname.startsWith(basePath);
        } catch {
          return urlString.startsWith(allowed);
        }
      });
    };

    // 1) URL completa del navegador (dinámica: /sucursal/.../auth/reset-password, /grupo/..., /brand/...)
    if (redirectTo?.trim()) {
      try {
        const u = new URL(redirectTo);
        const path = this.canonicalStorefrontPath(u.pathname);
        if (trustedOrigins.has(u.origin) && this.isTrustedStorefrontResetPath(path)) {
          const isGlobalResetOnly = path === '/auth/reset-password';
          if (!hasStoreContextSlug || !isGlobalResetOnly) {
            return `${u.origin}${path}`;
          }
        }
      } catch {
        /* seguir */
      }
    }

    // 2) Construir desde slugs (sucursal, grupo o marca)
    const origin = this.resolveTrustedOriginForRecovery(redirectTo);
    if (branchSlugTrim) {
      return `${origin}/sucursal/${encodeURIComponent(branchSlugTrim)}/auth/reset-password`;
    }
    if (groupSlugTrim) {
      return `${origin}/grupo/${encodeURIComponent(groupSlugTrim)}/auth/reset-password`;
    }
    if (brandSlugTrim) {
      return `${origin}/brand/${encodeURIComponent(brandSlugTrim)}/auth/reset-password`;
    }

    // 3) Otros clientes (admin, web-cliente)
    if (redirectTo) {
      try {
        const target = new URL(redirectTo);
        if (matchesAllowlist(redirectTo)) {
          return redirectTo;
        }
        const path = this.canonicalStorefrontPath(target.pathname);
        if (trustedOrigins.has(target.origin) && this.isTrustedStorefrontResetPath(path)) {
          return redirectTo;
        }
      } catch {
        /* default */
      }
    }

    return this.normalizeDefaultPasswordResetLanding(siteOrigin);
  }

  /**
   * El `action_link` de `generateLink({ type: 'recovery' })` a menudo trae
   * `redirect_to` = Site URL del proyecto (p. ej. https://agoramp.mx/) aunque
   * se haya pasado `options.redirectTo`. Supabase valida redirects contra el dashboard;
   * si no coinciden, fuerza la raíz. Para el correo usamos la URL resuelta por nosotros
   * (formulario de nueva contraseña, p. ej. /sucursal/.../auth/reset-password).
   */
  private applyResolvedRedirectToSupabaseVerifyLink(
    actionLink: string,
    resolvedRedirect: string,
  ): string {
    if (!actionLink?.trim() || !resolvedRedirect?.trim()) {
      return actionLink || '';
    }
    try {
      const url = new URL(actionLink);
      if (!url.pathname.includes('/verify')) {
        return actionLink;
      }
      url.searchParams.set('redirect_to', resolvedRedirect);
      return url.toString();
    } catch {
      return actionLink;
    }
  }

  /**
   * Solicita un email de recuperación de contraseña.
   * Genera el link via Supabase Admin (sin correo de Supabase) y envía con
   * nuestro sistema de templates (jerarquía sucursal > grupo > global).
   */
  async requestPasswordReset(payload: {
    email: string;
    redirectTo?: string;
    branchSlug?: string;
    groupSlug?: string;
    brandSlug?: string;
  }) {
    const { email, redirectTo, branchSlug, groupSlug, brandSlug } = payload;

    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    // 1. Validar que el usuario exista
    const perPage = 1000;
    let page = 1;
    let foundUser: { id: string; email: string } | null = null;

    while (page <= 10 && !foundUser) {
      const { data: userLookup, error: lookupError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (lookupError) {
        console.warn('⚠️  No se pudo validar email en Supabase Admin:', lookupError.message);
        break;
      }

      const users = userLookup?.users || [];
      const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) {
        foundUser = { id: match.id, email: match.email! };
      }

      if (users.length < perPage) break;
      page += 1;
    }

    if (!foundUser) {
      return {
        message: 'Si el email existe, recibirás un enlace para recuperar tu contraseña',
        success: true,
      };
    }

    // 2. Resolver redirect URL (tienda: redirectTo contextual o branchSlug / groupSlug / brandSlug)
    const resolvedRedirect = this.resolvePasswordResetRedirectUrl({
      redirectTo,
      branchSlug,
      groupSlug,
      brandSlug,
    });

    // 3. Generar link de recuperación via Supabase Admin (sin enviar email de Supabase)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: foundUser.email,
      options: { redirectTo: resolvedRedirect },
    });

    if (linkError) {
      if (linkError.message.includes('rate_limit') || linkError.message.includes('Too many requests')) {
        throw new BadRequestException('Demasiadas solicitudes de recuperación. Por favor, espera unos minutos antes de intentar nuevamente.');
      }
      throw new BadRequestException('No se pudo generar el enlace de recuperación. Por favor, intenta nuevamente.');
    }

    const rawActionLink = linkData?.properties?.action_link || '';
    const recoveryLink = this.applyResolvedRedirectToSupabaseVerifyLink(rawActionLink, resolvedRedirect);

    // 4. Resolver sucursal/grupo (slug desde storefront) o fallback staff/owner
    let templateBusinessId: string | undefined;
    let templateBusinessGroupId: string | undefined;
    let businessName = 'AGORA';
    let businessLogo = 'https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png';

    const branchSlugTrim = branchSlug?.trim();
    const groupSlugTrim = groupSlug?.trim();
    const brandSlugTrim = brandSlug?.trim();

    if (branchSlugTrim) {
      try {
        const branch = await this.businessesService.getBranchBySlug(branchSlugTrim);
        templateBusinessId = branch.id;
        templateBusinessGroupId = branch.business_group_id || undefined;
        businessName = branch.name || businessName;
        if (branch.logo_url) {
          businessLogo = branch.logo_url;
        } else if (branch.business_group_id && dbPool) {
          try {
            const gLogo = await dbPool.query(
              `SELECT logo_url FROM core.business_groups WHERE id = $1`,
              [branch.business_group_id],
            );
            if (gLogo.rows[0]?.logo_url) {
              businessLogo = gLogo.rows[0].logo_url;
            }
          } catch {
            /* ignore */
          }
        }
      } catch (err: any) {
        if (!(err instanceof NotFoundException)) {
          console.warn('Error resolviendo sucursal por slug para recovery email:', err?.message);
        }
      }
    } else if (groupSlugTrim) {
      try {
        const group = await this.businessesService.getBusinessGroupBySlug(groupSlugTrim);
        templateBusinessGroupId = group.id;
        templateBusinessId = undefined;
        businessName = group.name || businessName;
        if (group.logo_url) {
          businessLogo = group.logo_url;
        }
      } catch (err: any) {
        if (!(err instanceof NotFoundException)) {
          console.warn('Error resolviendo grupo por slug para recovery email:', err?.message);
        }
      }
    } else if (brandSlugTrim) {
      try {
        const group = await this.businessesService.getBusinessGroupBySlug(brandSlugTrim);
        templateBusinessGroupId = group.id;
        templateBusinessId = undefined;
        businessName = group.name || businessName;
        if (group.logo_url) {
          businessLogo = group.logo_url;
        }
      } catch (err: any) {
        if (!(err instanceof NotFoundException)) {
          console.warn('Error resolviendo marca (brand) por slug para recovery email:', err?.message);
        }
      }
    }

    if (!templateBusinessId && !templateBusinessGroupId && dbPool) {
      try {
        const buResult = await dbPool.query(
          `SELECT bu.business_id, b.name as business_name
           FROM core.business_users bu
           JOIN core.businesses b ON b.id = bu.business_id
           WHERE bu.user_id = $1 AND b.is_active = true
           LIMIT 1`,
          [foundUser.id],
        );

        if (buResult.rows.length > 0) {
          templateBusinessId = buResult.rows[0].business_id;
          businessName = buResult.rows[0].business_name || businessName;
        } else {
          const ownerResult = await dbPool.query(
            `SELECT id as business_id, name as business_name
             FROM core.businesses
             WHERE owner_id = $1 AND is_active = true
             LIMIT 1`,
            [foundUser.id],
          );
          if (ownerResult.rows.length > 0) {
            templateBusinessId = ownerResult.rows[0].business_id;
            businessName = ownerResult.rows[0].business_name || businessName;
          }
        }

        if (templateBusinessId) {
          const logoResult = await dbPool.query(
            `SELECT logo_url, business_group_id FROM core.businesses WHERE id = $1`,
            [templateBusinessId],
          );
          if (logoResult.rows.length > 0) {
            if (logoResult.rows[0].logo_url) {
              businessLogo = logoResult.rows[0].logo_url;
            }
            templateBusinessGroupId = templateBusinessGroupId || logoResult.rows[0].business_group_id || undefined;
          }
        }
      } catch (err) {
        console.warn('Error resolviendo business del usuario para recovery email:', err);
      }
    }

    // 5. Obtener nombre del usuario
    let userName = '';
    if (dbPool) {
      try {
        const profileResult = await dbPool.query(
          `SELECT first_name, last_name FROM core.user_profiles WHERE id = $1`,
          [foundUser.id],
        );
        if (profileResult.rows.length > 0) {
          const { first_name, last_name } = profileResult.rows[0];
          userName = [first_name, last_name].filter(Boolean).join(' ');
        }
      } catch (err) {
        console.warn('⚠️  Error obteniendo perfil de usuario para recovery email:', err);
      }
    }
    if (!userName) userName = email.split('@')[0];

    // 6. Enviar email con nuestro sistema de templates
    try {
      await this.emailService.sendEmail(
        email,
        EmailTriggerType.PASSWORD_RECOVERY,
        {
          user_name: userName,
          recovery_link: recoveryLink,
          business_name: businessName,
          business_logo: businessLogo,
        },
        templateBusinessId,
        templateBusinessGroupId,
        { userId: foundUser.id },
      );
    } catch (emailError) {
      console.error('❌ Error enviando email de recovery:', emailError);
    }

    return {
      message: 'Si el email existe, recibirás un enlace para recuperar tu contraseña',
      success: true,
    };
  }

  /**
   * Actualiza la contraseña usando el access_token de recuperación.
   * Valida el token contra Supabase para obtener el user_id y luego
   * actualiza la contraseña via supabaseAdmin.
   */
  async updatePassword(token: string, newPassword: string) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    // Validar el token de recovery para obtener el user_id
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new UnauthorizedException(
        'El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace de recuperación de contraseña.',
      );
    }

    // Actualizar la contraseña via admin (no depende de sesión del servidor)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      if (error.message.includes('Password') && error.message.includes('weak')) {
        throw new BadRequestException(
          'La nueva contraseña es demasiado débil. Por favor, usa una contraseña más segura con al menos 6 caracteres.',
        );
      }
      throw new BadRequestException(
        'No se pudo actualizar la contraseña. Por favor, verifica que el enlace sea válido e intenta nuevamente.',
      );
    }

    return {
      message: 'Contraseña actualizada exitosamente',
      success: true,
    };
  }

  /**
   * Cierra la sesión del usuario actual
   */
  async signOut(token?: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new BadRequestException(`Error al cerrar sesión: ${error.message}`);
    }

    return {
      message: 'Sesión cerrada exitosamente',
      success: true,
    };
  }

  /**
   * Refresca el token de acceso usando el refresh token
   */
  async refreshToken(refreshToken: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        throw new UnauthorizedException('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
      throw new UnauthorizedException('No se pudo renovar la sesión. Por favor, inicia sesión nuevamente.');
    }

    if (!data.session) {
      throw new UnauthorizedException('No se pudo renovar la sesión. Por favor, inicia sesión nuevamente.');
    }

    return {
      session: data.session,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  /**
   * Envía notificación de nuevo registro de cliente a los supervisores configurados.
   */
  private async sendSupervisorRegistrationNotification(
    businessId: string,
    businessGroupId: string | null,
    userName: string,
    userEmail: string,
    userPhone?: string,
    userId?: string,
  ): Promise<void> {
    try {
      const supervisorChannels = await this.businessesService.getNotificationChannels(
        businessId,
        'supervisor_notification',
      );

      if (!supervisorChannels.emailEnabled) {
        await this.integrationLogs.log({
          integration: 'email',
          eventType: 'supervisor_notification',
          channel: 'email',
          status: 'skipped',
          businessId,
          userId,
          message: 'Canal supervisor_notification deshabilitado para esta sucursal',
          metadata: { eventTitle: 'Nuevo Cliente Registrado' },
        });
        return;
      }

      let businessName = 'Sin nombre';
      if (dbPool) {
        const bizResult = await dbPool.query(
          `SELECT b.name, b.business_group_id
           FROM core.businesses b WHERE b.id = $1`,
          [businessId],
        );
        if (bizResult.rows.length > 0) {
          businessName = bizResult.rows[0].name || businessName;
        }
      }

      const { recipients } = await this.businessesService.getNotificationRecipients(businessId);

      let groupRecipients: Array<{ email: string; name?: string }> = [];
      if (businessGroupId) {
        try {
          const groupResult = await this.businessesService.getGroupNotificationRecipients(businessGroupId);
          groupRecipients = groupResult.recipients || [];
        } catch {
          // optional
        }
      }

      const allRecipients = [...recipients, ...groupRecipients];
      const seen = new Set<string>();
      const uniqueRecipients = allRecipients.filter((r) => {
        const key = r.email.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueRecipients.length === 0) {
        await this.integrationLogs.log({
          integration: 'email',
          eventType: 'supervisor_notification',
          channel: 'email',
          status: 'skipped',
          businessId,
          userId,
          message: 'Sin destinatarios (notification_recipients) configurados',
          metadata: { eventTitle: 'Nuevo Cliente Registrado' },
        });
        return;
      }

      const detailHtml = `<div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <div style="border-bottom: 0; padding-top: 0;">
          <p style="font-size: 14px; margin: 0 0 8px 0;"><strong>Nombre:</strong> ${userName}</p>
          <p style="font-size: 14px; margin: 0 0 8px 0;"><strong>Correo:</strong> ${userEmail}</p>
          ${userPhone ? `<p style="font-size: 14px; margin: 0;"><strong>Teléfono:</strong> ${userPhone}</p>` : ''}
        </div>
      </div>`;

      for (const recipient of uniqueRecipients) {
        await this.emailService.sendSupervisorNotificationEmail(
          recipient.email,
          businessName,
          'Nuevo Cliente Registrado',
          `Se registró un nuevo cliente en la plataforma.`,
          detailHtml,
          '',
          businessId,
          businessGroupId || undefined,
          { userId },
        );
      }
    } catch (error: any) {
      console.error('❌ Error enviando notificación de registro a supervisores:', error);
      await this.integrationLogs.log({
        integration: 'email',
        eventType: 'supervisor_notification',
        channel: 'email',
        status: 'failed',
        businessId,
        userId,
        message: 'Error general enviando notificación de registro a supervisores',
        errorMessage: error?.message || String(error),
      });
    }
  }
}

