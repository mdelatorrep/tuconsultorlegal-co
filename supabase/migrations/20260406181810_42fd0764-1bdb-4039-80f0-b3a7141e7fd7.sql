
INSERT INTO public.email_templates (template_key, template_name, subject, html_body, is_active)
VALUES 
(
  'lawyer_reengagement_at_risk',
  'Re-engagement: Usuario en Riesgo (7-14 días)',
  '⚠️ {{lawyer_name}}, te extrañamos en Praxis Hub',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#f59e0b;">⚠️ ¡Hola {{lawyer_name}}!</h2><p>Hemos notado que llevas <strong>{{days_inactive}} días</strong> sin usar nuestras herramientas de IA.</p><p>Para que no pierdas el ritmo, te hemos otorgado <strong>5 créditos de reactivación</strong>.</p><p>Las herramientas de IA te ayudan a:</p><ul><li>Analizar documentos legales en segundos</li><li>Predecir resultados de casos</li><li>Automatizar tareas repetitivas</li></ul><p><a href="{{dashboard_url}}" style="background:#6366f1;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Volver a Praxis Hub</a></p><p style="color:#888;font-size:12px;">© {{current_year}} Praxis Hub. Todos los derechos reservados.</p></body></html>',
  true
),
(
  'lawyer_reengagement_critical',
  'Re-engagement: Usuario Crítico (15-29 días)',
  '🚨 {{lawyer_name}}, tu cuenta necesita atención',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#ef4444;">🚨 {{lawyer_name}}, te necesitamos de vuelta</h2><p>Han pasado <strong>{{days_inactive}} días</strong> desde tu última actividad en Praxis Hub.</p><p>Sabemos que tu tiempo es valioso, por eso te hemos otorgado <strong>10 créditos de reactivación</strong> para que pruebes las últimas mejoras.</p><p>Novedades que te estás perdiendo:</p><ul><li>Mejoras en el análisis de documentos con IA</li><li>Nuevas herramientas de productividad legal</li><li>Panel CRM mejorado para gestión de clientes</li></ul><p><a href="{{dashboard_url}}" style="background:#ef4444;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Reactivar mi cuenta</a></p><p style="color:#888;font-size:12px;">© {{current_year}} Praxis Hub. Todos los derechos reservados.</p></body></html>',
  true
),
(
  'lawyer_reengagement_churned',
  'Re-engagement: Usuario Churned (30+ días)',
  '💎 {{lawyer_name}}, última oportunidad - 15 créditos gratis',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#8b5cf6;">💎 {{lawyer_name}}, no queremos perderte</h2><p>Han pasado más de <strong>{{days_inactive}} días</strong> sin actividad en tu cuenta.</p><p>Como última bonificación especial, te hemos otorgado <strong>15 créditos gratuitos</strong>.</p><p>Estos créditos te permiten:</p><ul><li>Realizar hasta 5 análisis legales con IA</li><li>Generar documentos automatizados</li><li>Consultar jurisprudencia inteligente</li></ul><p><strong>Esta es una bonificación especial que se repite de forma limitada.</strong></p><p><a href="{{dashboard_url}}" style="background:#8b5cf6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Usar mis créditos ahora</a></p><p style="color:#888;font-size:12px;">© {{current_year}} Praxis Hub. Todos los derechos reservados.</p></body></html>',
  true
)
ON CONFLICT (template_key) DO NOTHING;
