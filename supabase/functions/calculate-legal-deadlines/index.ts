import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Colombian legal terms (CGP, CPACA, etc.)
const LEGAL_TERMS = {
  // CGP - Código General del Proceso
  'cgp_contestacion_demanda': { days: 20, type: 'business', description: 'Término para contestar demanda (CGP Art. 96)' },
  'cgp_recurso_reposicion': { days: 3, type: 'business', description: 'Recurso de reposición (CGP Art. 318)' },
  'cgp_recurso_apelacion': { days: 3, type: 'business', description: 'Recurso de apelación (CGP Art. 322)' },
  'cgp_recurso_suplica': { days: 3, type: 'business', description: 'Recurso de súplica (CGP Art. 331)' },
  'cgp_recurso_queja': { days: 5, type: 'business', description: 'Recurso de queja (CGP Art. 352)' },
  'cgp_ejecutoria': { days: 3, type: 'business', description: 'Término de ejecutoria (CGP Art. 302)' },
  'cgp_alegatos_conclusion': { days: 5, type: 'business', description: 'Alegatos de conclusión (CGP Art. 372)' },
  'cgp_excepciones_previas': { days: 10, type: 'business', description: 'Traslado excepciones previas (CGP Art. 101)' },
  'cgp_objecion_dictamen': { days: 10, type: 'business', description: 'Objeción dictamen pericial (CGP Art. 228)' },
  'cgp_reforma_demanda': { days: 5, type: 'business', description: 'Traslado reforma demanda (CGP Art. 93)' },
  
  // CPACA - Código de Procedimiento Administrativo
  'cpaca_contestacion_demanda': { days: 30, type: 'business', description: 'Contestación demanda (CPACA Art. 172)' },
  'cpaca_recurso_reposicion': { days: 10, type: 'business', description: 'Recurso de reposición (CPACA Art. 76)' },
  'cpaca_recurso_apelacion': { days: 10, type: 'business', description: 'Recurso de apelación (CPACA Art. 244)' },
  'cpaca_suspension_provisional': { days: 10, type: 'business', description: 'Solicitud suspensión provisional (CPACA Art. 231)' },
  'cpaca_alegatos_conclusion': { days: 10, type: 'business', description: 'Alegatos de conclusión (CPACA Art. 181)' },
  'cpaca_tutela': { days: 10, type: 'calendar', description: 'Fallo de tutela (Decreto 2591 Art. 29)' },
  
  // Otros
  'tutela_impugnacion': { days: 3, type: 'business', description: 'Impugnación fallo tutela (Decreto 2591 Art. 31)' },
  'casacion_demanda': { days: 30, type: 'business', description: 'Demanda de casación (CGP Art. 346)' },
  'revision_demanda': { days: 60, type: 'business', description: 'Demanda de revisión (CGP Art. 358)' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, startDate, termType, customDays, customType, year } = await req.json();
    console.log(`[LegalDeadlines] Action: ${action}`);

    if (action === 'get_terms') {
      // Return available legal terms
      return new Response(JSON.stringify({ terms: LEGAL_TERMS }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get_holidays') {
      // Get Colombian holidays for a year
      const targetYear = year || new Date().getFullYear();
      
      const { data: holidays, error } = await supabase
        .from('colombian_holidays')
        .select('fecha, nombre')
        .gte('fecha', `${targetYear}-01-01`)
        .lte('fecha', `${targetYear}-12-31`)
        .order('fecha');

      if (error) throw error;

      return new Response(JSON.stringify({ holidays }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'calculate') {
      if (!startDate) {
        return new Response(JSON.stringify({ error: 'startDate es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let days: number;
      let dayType: string;
      let description: string;

      if (termType && LEGAL_TERMS[termType as keyof typeof LEGAL_TERMS]) {
        const term = LEGAL_TERMS[termType as keyof typeof LEGAL_TERMS];
        days = term.days;
        dayType = term.type;
        description = term.description;
      } else if (customDays) {
        days = parseInt(customDays);
        dayType = customType || 'business';
        description = `Término personalizado de ${days} días ${dayType === 'business' ? 'hábiles' : 'calendario'}`;
      } else {
        return new Response(JSON.stringify({ error: 'termType o customDays es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const start = new Date(startDate);
      let deadline: Date;

      if (dayType === 'business') {
        // Get holidays from database
        const startYear = start.getFullYear();
        const { data: holidays } = await supabase
          .from('colombian_holidays')
          .select('fecha')
          .gte('fecha', `${startYear}-01-01`)
          .lte('fecha', `${startYear + 1}-12-31`);

        const holidaySet = new Set((holidays || []).map(h => h.fecha));

        // Calculate business days
        let current = new Date(start);
        let daysAdded = 0;

        while (daysAdded < days) {
          current.setDate(current.getDate() + 1);
          const dayOfWeek = current.getDay();
          const dateStr = current.toISOString().split('T')[0];

          // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
            daysAdded++;
          }
        }

        deadline = current;
      } else {
        // Calendar days - just add days
        deadline = new Date(start);
        deadline.setDate(deadline.getDate() + days);
      }

      // Generate intermediate dates for calendar view
      const intermediateDates = [];
      const current = new Date(start);
      current.setDate(current.getDate() + 1);
      while (current < deadline) {
        intermediateDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      return new Response(JSON.stringify({
        startDate: start.toISOString(),
        deadline: deadline.toISOString(),
        days,
        dayType,
        description,
        termType: termType || 'custom',
        intermediateDates: intermediateDates.slice(0, 60) // Limit to 60 dates
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'is_business_day') {
      if (!startDate) {
        return new Response(JSON.stringify({ error: 'startDate es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const date = new Date(startDate);
      const dayOfWeek = date.getDay();
      const dateStr = startDate.split('T')[0];

      // Check if weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return new Response(JSON.stringify({ 
          isBusinessDay: false, 
          reason: 'weekend',
          dayName: dayOfWeek === 0 ? 'Domingo' : 'Sábado'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if holiday
      const { data: holiday } = await supabase
        .from('colombian_holidays')
        .select('nombre')
        .eq('fecha', dateStr)
        .maybeSingle();

      if (holiday) {
        return new Response(JSON.stringify({ 
          isBusinessDay: false, 
          reason: 'holiday',
          holidayName: holiday.nombre
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ isBusinessDay: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[LegalDeadlines] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
