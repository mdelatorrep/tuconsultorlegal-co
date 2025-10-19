// Email templates for Supabase Auth email flows

export const getConfirmSignupTemplate = (confirmationUrl: string, userType: 'user' | 'lawyer') => {
  const platformName = userType === 'lawyer' ? 'Portal del Abogado' : 'Tu Consultor Legal';
  const greeting = userType === 'lawyer' ? 'Estimado colega' : 'Hola';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirma tu registro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #172554 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    ${platformName}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #172554; margin: 0 0 20px 0; font-size: 24px;">
                    ¡Bienvenido! 🎉
                  </h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    ${greeting}, gracias por registrarte en ${platformName}. Estás a un paso de comenzar.
                  </p>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Por favor, confirma tu correo electrónico haciendo clic en el botón de abajo:
                  </p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${confirmationUrl}" style="background-color: #172554; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                          Confirmar mi correo
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                    ${confirmationUrl}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                    Si no creaste esta cuenta, puedes ignorar este mensaje.
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Tu Consultor Legal. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const getMagicLinkTemplate = (magicLink: string, userType: 'user' | 'lawyer') => {
  const platformName = userType === 'lawyer' ? 'Portal del Abogado' : 'Tu Consultor Legal';
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu enlace mágico de acceso</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #172554 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    ${platformName}
                  </h1>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #172554; margin: 0 0 20px 0; font-size: 24px;">
                    🔗 Tu enlace mágico de acceso
                  </h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Haz clic en el botón de abajo para iniciar sesión sin contraseña:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${magicLink}" style="background-color: #172554; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                          Iniciar Sesión
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                    ⚠️ Este enlace expira en 1 hora y solo puede usarse una vez.
                  </p>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                    ${magicLink}
                  </p>
                </td>
              </tr>
              
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                    Si no solicitaste este enlace, puedes ignorar este mensaje de forma segura.
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Tu Consultor Legal. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const getResetPasswordTemplate = (resetLink: string, userType: 'user' | 'lawyer') => {
  const platformName = userType === 'lawyer' ? 'Portal del Abogado' : 'Tu Consultor Legal';
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablece tu contraseña</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #172554 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    ${platformName}
                  </h1>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #172554; margin: 0 0 20px 0; font-size: 24px;">
                    🔐 Restablece tu contraseña
                  </h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${resetLink}" style="background-color: #172554; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                          Restablecer Contraseña
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                    ⚠️ Este enlace expira en 1 hora.
                  </p>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                    ${resetLink}
                  </p>
                </td>
              </tr>
              
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                    Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje de forma segura.
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Tu Consultor Legal. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const getChangeEmailTemplate = (confirmationUrl: string, newEmail: string, userType: 'user' | 'lawyer') => {
  const platformName = userType === 'lawyer' ? 'Portal del Abogado' : 'Tu Consultor Legal';
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirma el cambio de correo</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #172554 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    ${platformName}
                  </h1>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #172554; margin: 0 0 20px 0; font-size: 24px;">
                    🔄 Confirma tu nuevo correo electrónico
                  </h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Has solicitado cambiar tu correo electrónico a:
                  </p>
                  <p style="color: #172554; font-size: 18px; font-weight: bold; margin: 0 0 30px 0;">
                    ${newEmail}
                  </p>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Por favor, confirma este cambio haciendo clic en el botón de abajo:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${confirmationUrl}" style="background-color: #172554; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                          Confirmar Cambio de Correo
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                    ${confirmationUrl}
                  </p>
                </td>
              </tr>
              
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                    Si no solicitaste este cambio, contacta inmediatamente a nuestro soporte.
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Tu Consultor Legal. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const getInvitationTemplate = (invitationUrl: string, userType: 'user' | 'lawyer', invitedBy: string) => {
  const platformName = userType === 'lawyer' ? 'Portal del Abogado' : 'Tu Consultor Legal';
  const welcome = userType === 'lawyer' 
    ? 'Has sido invitado a unirte a nuestro equipo de abogados en' 
    : 'Has sido invitado a unirte a';
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitación a la plataforma</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #172554 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    ${platformName}
                  </h1>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #172554; margin: 0 0 20px 0; font-size: 24px;">
                    📧 ¡Has sido invitado!
                  </h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    ${welcome} <strong>${platformName}</strong>.
                  </p>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Invitado por: <strong>${invitedBy}</strong>
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${invitationUrl}" style="background-color: #172554; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                          Aceptar Invitación
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                    ${invitationUrl}
                  </p>
                </td>
              </tr>
              
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                    Si no esperabas esta invitación, puedes ignorar este mensaje.
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Tu Consultor Legal. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
