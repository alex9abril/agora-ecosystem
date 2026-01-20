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

/**
 * Servicio de autenticación usando Supabase
 */
@Injectable()
export class AuthService {
  constructor(private readonly emailService: EmailService) {}

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

          // Crear usuario con signUp normal
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: signUpDto.email,
            password: signUpDto.password,
            options: {
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
      // Para otros roles, usar signUp normal
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
        options: {
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

    // Enviar correo de bienvenida (no bloquea el flujo si falla)
    if (authData.user && authData.user.email) {
      const userName = `${signUpDto.firstName} ${signUpDto.lastName}`.trim() || signUpDto.email;
      const fallbackUrl = `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/dashboard`;
      const dashboardUrl = signUpDto.appUrl || confirmationLink || fallbackUrl;

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[AuthService.signUp] Enviando welcome email:', {
          email: authData.user.email,
          userName,
          dashboardUrl,
          requiresEmailConfirmation,
          hasConfirmationLink: Boolean(confirmationLink),
          appUrl: signUpDto.appUrl,
        });
      }
      
      this.emailService.sendWelcomeEmail(
        authData.user.email,
        userName,
        dashboardUrl,
        signUpDto.businessId,
        signUpDto.businessGroupId
      ).catch((error) => {
        console.error('❌ Error enviando correo de bienvenida (no crítico):', error);
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
   * Solicita un email de recuperación de contraseña
   */
  async requestPasswordReset(email: string, redirectTo?: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    if (supabaseAdmin) {
      const perPage = 1000;
      let page = 1;
      let userExists = false;
      let canValidate = true;

      while (page <= 10 && !userExists) {
        const { data: userLookup, error: lookupError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

        if (lookupError) {
          console.warn('⚠️  No se pudo validar email en Supabase Admin:', lookupError.message);
          canValidate = false;
          break;
        }

        const users = userLookup?.users || [];
        userExists = users.some((user) => user.email?.toLowerCase() === email.toLowerCase());

        if (users.length < perPage) {
          break;
        }

        page += 1;
      }

      if (canValidate && !userExists) {
        throw new BadRequestException('No existe una cuenta asociada a este email.');
      }
    }

    // Obtener la URL base desde las variables de entorno o usar una por defecto
    const defaultRedirect =
      process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3000/auth/reset-password';

    const allowedRedirects = (process.env.PASSWORD_RESET_ALLOWED_REDIRECTS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const resolvedRedirect = (() => {
      if (!redirectTo) {
        return defaultRedirect;
      }

      try {
        const target = new URL(redirectTo);

        if (!allowedRedirects.length) {
          return defaultRedirect;
        }

        const isAllowed = allowedRedirects.some((allowed) => {
          try {
            const allowedUrl = new URL(allowed);
            return (
              target.origin === allowedUrl.origin &&
              target.pathname.startsWith(allowedUrl.pathname || '/')
            );
          } catch {
            return redirectTo.startsWith(allowed);
          }
        });

        return isAllowed ? redirectTo : defaultRedirect;
      } catch {
        return defaultRedirect;
      }
    })();

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resolvedRedirect,
    });

    if (error) {
      if (error.message.includes('rate_limit') || error.message.includes('Too many requests')) {
        throw new BadRequestException('Demasiadas solicitudes de recuperación. Por favor, espera unos minutos antes de intentar nuevamente.');
      }
      
      throw new BadRequestException('No se pudo enviar el email de recuperación. Por favor, verifica el email proporcionado e intenta nuevamente.');
    }

    // Supabase siempre retorna éxito por seguridad (no revela si el email existe)
    return {
      message: 'Si el email existe, recibirás un enlace para recuperar tu contraseña',
      success: true,
    };
  }

  /**
   * Actualiza la contraseña usando el token de recuperación
   * Nota: En Supabase, el token viene en el hash de la URL de recuperación
   * El usuario debe hacer clic en el enlace del email, y luego Supabase
   * maneja la sesión automáticamente. Este endpoint actualiza la contraseña
   * para el usuario autenticado en la sesión actual.
   */
  async updatePassword(token: string, newPassword: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    // Nota: En Supabase, cuando el usuario hace clic en el enlace de recuperación,
    // Supabase establece una sesión temporal. Aquí asumimos que el usuario
    // ya está autenticado con esa sesión temporal.
    // Alternativamente, podríamos usar supabaseAdmin para forzar el cambio,
    // pero requiere el user_id.
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (error.message.includes('token') || error.message.includes('expired') || error.message.includes('session')) {
        throw new UnauthorizedException('El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace de recuperación de contraseña.');
      }
      
      if (error.message.includes('Password') && error.message.includes('weak')) {
        throw new BadRequestException('La nueva contraseña es demasiado débil. Por favor, usa una contraseña más segura con al menos 6 caracteres.');
      }
      
      throw new BadRequestException('No se pudo actualizar la contraseña. Por favor, verifica que el enlace sea válido e intenta nuevamente.');
    }

    if (!data.user) {
      throw new BadRequestException('No se pudo actualizar la contraseña');
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
}

