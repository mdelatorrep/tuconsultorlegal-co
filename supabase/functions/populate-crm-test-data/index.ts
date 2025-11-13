import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lawyer_id } = await req.json();

    if (!lawyer_id) {
      return new Response(
        JSON.stringify({ error: 'lawyer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Populating test data for lawyer:', lawyer_id);

    // Sample clients data
    const sampleClients = [
      {
        lawyer_id,
        name: 'María García López',
        email: 'maria.garcia@email.com',
        phone: '+57 300 123 4567',
        company: 'García Inversiones S.A.S',
        client_type: 'company',
        status: 'active',
        address: 'Carrera 15 #93-47, Bogotá',
        tags: ['corporativo', 'inmobiliario'],
        notes: 'Cliente corporativo importante con múltiples propiedades.'
      },
      {
        lawyer_id,
        name: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@email.com',
        phone: '+57 310 987 6543',
        client_type: 'individual',
        status: 'active',
        address: 'Calle 72 #10-34, Bogotá',
        tags: ['laboral', 'persona natural'],
        notes: 'Caso de terminación laboral, requiere seguimiento cercano.'
      },
      {
        lawyer_id,
        name: 'Ana Martínez',
        email: 'ana.martinez@email.com',
        phone: '+57 320 555 7890',
        client_type: 'individual',
        status: 'active',
        address: 'Avenida 68 #45-67, Bogotá',
        tags: ['civil', 'familia'],
        notes: 'Proceso de divorcio con custodia de menores.'
      },
      {
        lawyer_id,
        name: 'Tecnología Global Ltda',
        email: 'contacto@tecnologiaglobal.com',
        phone: '+57 601 234 5678',
        company: 'Tecnología Global Ltda',
        client_type: 'company',
        status: 'prospect',
        address: 'Zona Rosa, Bogotá',
        tags: ['tecnología', 'propiedad intelectual'],
        notes: 'Prospecto para registro de marcas y patentes.'
      }
    ];

    const { data: createdClients, error: clientsError } = await supabase
      .from('crm_clients')
      .insert(sampleClients)
      .select();

    if (clientsError) {
      console.error('Error creating clients:', clientsError);
      throw clientsError;
    }

    console.log('Created clients:', createdClients.length);

    // Sample cases data
    const sampleCases = [
      {
        lawyer_id,
        client_id: createdClients[0].id,
        case_number: 'CASO-2024-001',
        title: 'Compraventa de inmueble comercial',
        description: 'Asesoría legal para la adquisición de un inmueble comercial en zona norte de Bogotá.',
        case_type: 'Inmobiliario',
        status: 'active',
        priority: 'high',
        start_date: new Date().toISOString().split('T')[0],
        billing_rate: 150000,
        estimated_hours: 40
      },
      {
        lawyer_id,
        client_id: createdClients[1].id,
        case_number: 'CASO-2024-002',
        title: 'Terminación de contrato laboral',
        description: 'Representación en proceso de terminación laboral sin justa causa.',
        case_type: 'Laboral',
        status: 'active',
        priority: 'medium',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        billing_rate: 120000,
        estimated_hours: 25
      },
      {
        lawyer_id,
        client_id: createdClients[2].id,
        case_number: 'CASO-2024-003',
        title: 'Proceso de divorcio consensual',
        description: 'Trámite de divorcio de mutuo acuerdo con custodia compartida.',
        case_type: 'Familia',
        status: 'on_hold',
        priority: 'medium',
        start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        billing_rate: 100000,
        estimated_hours: 30
      }
    ];

    const { data: createdCases, error: casesError } = await supabase
      .from('crm_cases')
      .insert(sampleCases)
      .select();

    if (casesError) {
      console.error('Error creating cases:', casesError);
      throw casesError;
    }

    console.log('Created cases:', createdCases.length);

    // Sample communications data
    const sampleCommunications = [
      {
        lawyer_id,
        client_id: createdClients[0].id,
        case_id: createdCases[0].id,
        type: 'email',
        subject: 'Seguimiento del caso inmobiliario',
        content: 'Estimada Sra. García, me comunico para informarle sobre el progreso de su caso de compraventa. Hemos recibido la documentación del vendedor y procederemos con la revisión.',
        direction: 'outbound',
        status: 'sent',
        sent_at: new Date().toISOString()
      },
      {
        lawyer_id,
        client_id: createdClients[1].id,
        case_id: createdCases[1].id,
        type: 'call',
        subject: 'Consulta sobre liquidación',
        content: 'Llamada telefónica para discutir los detalles de la liquidación laboral y próximos pasos en el proceso.',
        direction: 'inbound',
        status: 'completed'
      },
      {
        lawyer_id,
        client_id: createdClients[2].id,
        type: 'meeting',
        subject: 'Reunión presencial',
        content: 'Reunión programada para revisar los documentos del proceso de divorcio y discutir la custodia.',
        direction: 'outbound',
        status: 'scheduled',
        scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { data: createdCommunications, error: commError } = await supabase
      .from('crm_communications')
      .insert(sampleCommunications)
      .select();

    if (commError) {
      console.error('Error creating communications:', commError);
      throw commError;
    }

    console.log('Created communications:', createdCommunications.length);

    // Sample tasks data
    const sampleTasks = [
      {
        lawyer_id,
        client_id: createdClients[0].id,
        case_id: createdCases[0].id,
        title: 'Revisar título de propiedad',
        description: 'Análisis detallado del título de propiedad del inmueble a adquirir.',
        type: 'document_review',
        status: 'in_progress',
        priority: 'high',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        lawyer_id,
        client_id: createdClients[1].id,
        case_id: createdCases[1].id,
        title: 'Calcular liquidación laboral',
        description: 'Cálculo de prestaciones sociales y indemnización correspondiente.',
        type: 'general',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        lawyer_id,
        client_id: createdClients[2].id,
        case_id: createdCases[2].id,
        title: 'Audiencia de conciliación',
        description: 'Preparación para la audiencia de conciliación en el proceso de divorcio.',
        type: 'court_date',
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        lawyer_id,
        title: 'Actualizar base de datos de jurisprudencia',
        description: 'Revisión y actualización de la base de datos con nueva jurisprudencia.',
        type: 'general',
        status: 'pending',
        priority: 'low',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { data: createdTasks, error: tasksError } = await supabase
      .from('crm_tasks')
      .insert(sampleTasks)
      .select();

    if (tasksError) {
      console.error('Error creating tasks:', tasksError);
      throw tasksError;
    }

    console.log('Created tasks:', createdTasks.length);

    // Sample documents data
    const sampleDocuments = [
      {
        lawyer_id,
        client_id: createdClients[0].id,
        case_id: createdCases[0].id,
        name: 'Contrato de compraventa',
        description: 'Minuta del contrato de compraventa del inmueble comercial.',
        document_type: 'Contrato',
        tags: ['inmobiliario', 'compraventa'],
        is_confidential: true
      },
      {
        lawyer_id,
        client_id: createdClients[1].id,
        case_id: createdCases[1].id,
        name: 'Carta de despido',
        description: 'Carta de terminación del contrato laboral recibida por el cliente.',
        document_type: 'Comunicación',
        tags: ['laboral', 'terminación'],
        is_confidential: true
      },
      {
        lawyer_id,
        client_id: createdClients[2].id,
        case_id: createdCases[2].id,
        name: 'Acuerdo de custodia',
        description: 'Propuesta de acuerdo para la custodia compartida de menores.',
        document_type: 'Acuerdo',
        tags: ['familia', 'custodia'],
        is_confidential: true
      },
      {
        lawyer_id,
        client_id: createdClients[3].id,
        name: 'Solicitud de registro de marca',
        description: 'Documentos para el registro de marca comercial.',
        document_type: 'Solicitud',
        tags: ['propiedad intelectual', 'marca'],
        is_confidential: false
      }
    ];

    const { data: createdDocuments, error: docsError } = await supabase
      .from('crm_documents')
      .insert(sampleDocuments)
      .select();

    if (docsError) {
      console.error('Error creating documents:', docsError);
      throw docsError;
    }

    console.log('Created documents:', createdDocuments.length);

    // Sample automation rules data
    const sampleRules = [
      {
        lawyer_id,
        name: 'Seguimiento automático de nuevos clientes',
        description: 'Enviar email de seguimiento 3 días después de crear un nuevo cliente.',
        trigger_event: 'client_created',
        trigger_conditions: { status: 'active' },
        actions: [
          {
            type: 'send_email',
            config: {
              template: 'welcome_client',
              delay_days: 3
            }
          }
        ],
        is_active: true
      },
      {
        lawyer_id,
        name: 'Alerta de vencimiento de tareas',
        description: 'Notificar cuando una tarea está próxima a vencer (2 días antes).',
        trigger_event: 'task_due_soon',
        trigger_conditions: { priority: 'high' },
        actions: [
          {
            type: 'create_notification',
            config: {
              message: 'Tarea de alta prioridad próxima a vencer',
              advance_days: 2
            }
          }
        ],
        is_active: true
      }
    ];

    const { data: createdRules, error: rulesError } = await supabase
      .from('crm_automation_rules')
      .insert(sampleRules)
      .select();

    if (rulesError) {
      console.error('Error creating automation rules:', rulesError);
      throw rulesError;
    }

    console.log('Created automation rules:', createdRules.length);

    return new Response(JSON.stringify({
      success: true,
      message: 'Test data populated successfully',
      data: {
        clients: createdClients.length,
        cases: createdCases.length,
        communications: createdCommunications.length,
        tasks: createdTasks.length,
        documents: createdDocuments.length,
        automationRules: createdRules.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in populate-crm-test-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});