-- Update all email templates: replace "Tu Consultor Legal" and "tuconsultorlegal.co" with Praxis Hub branding

-- Update subjects
UPDATE public.email_templates 
SET subject = REPLACE(subject, 'Tu Consultor Legal', 'Praxis Hub'),
    updated_at = now()
WHERE subject LIKE '%Tu Consultor Legal%';

-- Update html_body: brand name
UPDATE public.email_templates 
SET html_body = REPLACE(html_body, 'Tu Consultor Legal', 'Praxis Hub'),
    updated_at = now()
WHERE html_body LIKE '%Tu Consultor Legal%';

-- Update html_body: domain URLs
UPDATE public.email_templates 
SET html_body = REPLACE(html_body, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE html_body LIKE '%tuconsultorlegal.co%';

-- Update subjects: domain URLs
UPDATE public.email_templates 
SET subject = REPLACE(subject, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE subject LIKE '%tuconsultorlegal.co%';

-- Update template_name references
UPDATE public.email_templates 
SET template_name = REPLACE(template_name, 'Tu Consultor Legal', 'Praxis Hub'),
    updated_at = now()
WHERE template_name LIKE '%Tu Consultor Legal%';

-- Update html_body: old logo references to use Praxis Hub branding colors
-- Replace old brand gradient colors (#1a365d, #2d5a8a) with Praxis Hub charcoal/slate (#1c1c1e, #2d2d30)
UPDATE public.email_templates
SET html_body = REPLACE(
      REPLACE(html_body, '#1a365d', '#1c1c1e'),
      '#2d5a8a', '#2d2d30'
    ),
    updated_at = now()
WHERE html_body LIKE '%#1a365d%' OR html_body LIKE '%#2d5a8a%';

-- Update soporte email references
UPDATE public.email_templates
SET html_body = REPLACE(html_body, 'soporte@tuconsultorlegal.co', 'contacto@praxis-hub.co'),
    updated_at = now()
WHERE html_body LIKE '%soporte@tuconsultorlegal.co%';

-- Update any remaining email references
UPDATE public.email_templates
SET html_body = REPLACE(html_body, 'info@tuconsultorlegal.co', 'contacto@praxis-hub.co'),
    updated_at = now()
WHERE html_body LIKE '%info@tuconsultorlegal.co%';

-- Update system_config if there are remaining tuconsultorlegal references
UPDATE public.system_config
SET config_value = REPLACE(config_value, 'Tu Consultor Legal', 'Praxis Hub'),
    updated_at = now()
WHERE config_value LIKE '%Tu Consultor Legal%';

UPDATE public.system_config
SET config_value = REPLACE(config_value, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE config_value LIKE '%tuconsultorlegal.co%';

-- Update email_configuration table
UPDATE public.email_configuration
SET smtp_from_name = REPLACE(smtp_from_name, 'Tu Consultor Legal', 'Praxis Hub'),
    updated_at = now()
WHERE smtp_from_name LIKE '%Tu Consultor Legal%';