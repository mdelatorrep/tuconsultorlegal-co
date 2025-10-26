import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Tu Consultor Legal <onboarding@resend.dev>",
      to: [email],
      subject: "¡Bienvenido a Tu Consultor Legal!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a Tu Consultor Legal</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #0372e8, #0563c9); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">⚖️ Tu Consultor Legal</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #0372e8; font-size: 24px;">¡Bienvenido, ${fullName}!</h2>
                        
                        <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                          Nos complace darte la bienvenida a <strong>Tu Consultor Legal</strong>, la plataforma de inteligencia artificial diseñada específicamente para abogados en Colombia.
                        </p>
                        
                        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                          Tu cuenta ha sido creada exitosamente y ya puedes comenzar a disfrutar de todas nuestras funcionalidades.
                        </p>
                        
                        <!-- Features Box -->
                        <div style="background-color: #f8f9fa; border-left: 4px solid #0372e8; padding: 20px; margin: 24px 0; border-radius: 4px;">
                          <h3 style="margin: 0 0 12px 0; color: #0372e8; font-size: 18px;">¿Qué puedes hacer ahora?</h3>
                          <ul style="margin: 0; padding-left: 20px; color: #555555; line-height: 1.8;">
                            <li>Analizar documentos legales con IA</li>
                            <li>Redactar contratos y demandas</li>
                            <li>Investigar jurisprudencia colombiana</li>
                            <li>Desarrollar estrategias legales</li>
                            <li>Gestionar tu CRM de clientes</li>
                          </ul>
                        </div>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="https://tuconsultorlegal.co/#abogados" style="display: inline-block; padding: 14px 32px; background-color: #0372e8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                Acceder a mi Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 24px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          Si tienes alguna pregunta o necesitas ayuda, nuestro equipo de soporte está disponible 24/7 para asistirte.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0 0 8px 0; color: #999999; font-size: 12px;">
                          © 2025 Tu Consultor Legal. Todos los derechos reservados.
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 12px;">
                          <a href="https://tuconsultorlegal.co/#privacidad" style="color: #0372e8; text-decoration: none;">Política de Privacidad</a> | 
                          <a href="https://tuconsultorlegal.co/#terminos" style="color: #0372e8; text-decoration: none;">Términos y Condiciones</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-lawyer-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
