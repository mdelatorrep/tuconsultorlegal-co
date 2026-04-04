import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://praxis-hub.co'
const DEFAULT_OG_IMAGE = 'https://praxis-hub.co/og-image.png'

const CRAWLER_USER_AGENTS = [
  'linkedinbot',
  'whatsapp',
  'facebookexternalhit',
  'twitterbot',
  'telegrambot',
  'slackbot',
  'discordbot',
  'googlebot',
  'bingbot',
]

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot))
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response('Missing slug parameter', { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: blog, error } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, featured_image, published_at, content, tags')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !blog) {
      // Redirect to main site if blog not found
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': SITE_URL }
      })
    }

    const canonicalUrl = `${SITE_URL}/#blog-articulo-${blog.slug}`
    const title = escapeHtml(blog.title)
    const description = escapeHtml(blog.excerpt || blog.content?.substring(0, 160) || 'Artículo legal en Praxis Hub')
    const image = blog.featured_image || DEFAULT_OG_IMAGE
    const publishedAt = blog.published_at || ''
    const tags = blog.tags?.join(', ') || 'derecho, legal, Colombia'

    const userAgent = req.headers.get('user-agent') || ''

    // For crawlers: return HTML with OG meta tags
    // For users: redirect to the actual blog page
    if (!isCrawler(userAgent)) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': canonicalUrl }
      })
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title} | Praxis Hub</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="Praxis Hub" />
  <meta property="og:locale" content="es_CO" />
  ${publishedAt ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}" />` : ''}
  <meta property="article:tag" content="${escapeHtml(tags)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- LinkedIn specific -->
  <meta name="author" content="Praxis Hub" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${escapeHtml(canonicalUrl)}">Leer artículo completo en Praxis Hub</a>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error in share-blog-meta:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
