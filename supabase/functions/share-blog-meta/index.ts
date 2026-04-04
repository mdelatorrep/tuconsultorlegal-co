import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://praxis-hub.co'
const SUPABASE_URL = 'https://tkaezookvtpulfpaffes.supabase.co'
const DEFAULT_OG_IMAGE = 'https://praxis-hub.co/og-image.png'

function htmlResponse(html: string, status = 200) {
  const headers = new Headers(corsHeaders)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=3600, s-maxage=3600')
  headers.set('x-content-type-options', 'nosniff')

  return new Response(new Blob([html], { type: 'text/html; charset=utf-8' }), {
    status,
    headers
  })
}

function redirectResponse(location: string, status = 302) {
  const headers = new Headers(corsHeaders)
  headers.set('location', location)
  headers.set('cache-control', 'no-store')
  return new Response(null, { status, headers })
}

function isSocialCrawler(userAgent: string): boolean {
  return /(LinkedInBot|WhatsApp|facebookexternalhit|Facebot|Twitterbot|Slackbot|Discordbot|TelegramBot|SkypeUriPreview|bot|crawler|spider)/i.test(userAgent)
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
    const userAgent = req.headers.get('user-agent') || ''
    const crawlerRequest = isSocialCrawler(userAgent)
    console.log(`[share-blog-meta] slug=${slug}, ua=${userAgent.substring(0, 100)}`)

    if (!slug) {
      return htmlResponse('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /><title>Praxis Hub</title></head><body>Missing slug parameter</body></html>', 400)
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
      console.log(`[share-blog-meta] Blog not found for slug: ${slug}`)
      return redirectResponse(SITE_URL, 302)
    }

    // The share URL is this edge function itself — crawlers will hit this URL
    const shareUrl = `${SUPABASE_URL}/functions/v1/share-blog-meta?slug=${encodeURIComponent(blog.slug)}`
    const blogUrl = `${SITE_URL}/blog/${encodeURIComponent(blog.slug)}`
    const title = escapeHtml(blog.title)
    const description = escapeHtml(blog.excerpt || blog.content?.substring(0, 160) || 'Artículo legal en Praxis Hub')
    
    // Ensure OG image is large enough for LinkedIn (min 1200x627)
    let image = blog.featured_image || DEFAULT_OG_IMAGE
    if (image.includes('unsplash.com') && image.includes('w=')) {
      image = image.replace(/w=\d+/, 'w=1200').replace(/h=\d+/, 'h=630')
    }
    const publishedAt = blog.published_at || ''
    const tags = blog.tags?.join(', ') || 'derecho, legal, Colombia'

    console.log(`[share-blog-meta] crawler=${crawlerRequest} title="${blog.title}" image=${image.substring(0, 80)}`)

    if (!crawlerRequest) {
      return redirectResponse(blogUrl, 302)
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
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(blogUrl)}" />
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

  <link rel="canonical" href="${escapeHtml(blogUrl)}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${escapeHtml(blogUrl)}">Leer artículo completo en Praxis Hub</a></p>
</body>
</html>`

    return htmlResponse(html)
  } catch (error) {
    console.error('Error in share-blog-meta:', error)
    return htmlResponse('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /><title>Error</title></head><body>Internal server error</body></html>', 500)
  }
})
