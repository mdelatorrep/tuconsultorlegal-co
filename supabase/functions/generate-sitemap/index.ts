import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    console.log('[GENERATE-SITEMAP] Function started');
    
    const baseUrl = 'https://tuconsultorlegal.co';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Define all pages with their SEO priority and change frequency
    const pages = [
      {
        url: `${baseUrl}/`,
        lastmod: currentDate,
        priority: '1.0',
        changefreq: 'daily'
      },
      {
        url: `${baseUrl}/#personas`,
        lastmod: currentDate,
        priority: '0.9',
        changefreq: 'weekly'
      },
      {
        url: `${baseUrl}/#empresas`,
        lastmod: currentDate,
        priority: '0.9',
        changefreq: 'weekly'
      },
      {
        url: `${baseUrl}/#precios`,
        lastmod: currentDate,
        priority: '0.8',
        changefreq: 'weekly'
      },
      {
        url: `${baseUrl}/#blog`,
        lastmod: currentDate,
        priority: '0.7',
        changefreq: 'daily'
      },
      {
        url: `${baseUrl}/#blog-articulo-arriendo`,
        lastmod: currentDate,
        priority: '0.6',
        changefreq: 'monthly'
      },
      {
        url: `${baseUrl}/#blog-articulo-despido`,
        lastmod: currentDate,
        priority: '0.6',
        changefreq: 'monthly'
      },
      {
        url: `${baseUrl}/#blog-articulo-vehiculo`,
        lastmod: currentDate,
        priority: '0.6',
        changefreq: 'monthly'
      },
      {
        url: `${baseUrl}/#contacto`,
        lastmod: currentDate,
        priority: '0.5',
        changefreq: 'monthly'
      },
      {
        url: `${baseUrl}/#terminos`,
        lastmod: currentDate,
        priority: '0.3',
        changefreq: 'yearly'
      },
      {
        url: `${baseUrl}/#privacidad`,
        lastmod: currentDate,
        priority: '0.3',
        changefreq: 'yearly'
      }
    ];

    // Generate XML sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    pages.forEach(page => {
      sitemap += `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    console.log('[GENERATE-SITEMAP] Sitemap generated successfully');

    return new Response(sitemap, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600" // Cache for 1 hour
      },
      status: 200,
    });

  } catch (error) {
    console.error('[GENERATE-SITEMAP] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error generating sitemap' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});