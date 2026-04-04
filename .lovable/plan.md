

# Plan: Compartir Blogs en Redes Sociales desde el Admin Portal

## Resumen
Agregar botones de compartir en redes sociales (LinkedIn y WhatsApp) para cada blog publicado en el panel de administración, con URLs pre-construidas y mejores prácticas de OG meta tags para maximizar la visibilidad del contenido compartido.

## Contexto
- Los blogs ya tienen compartir en LinkedIn y WhatsApp en `BlogArticlePage.tsx` (vista pública)
- El admin NO tiene botones de compartir en `AdminBlogManager.tsx`
- La app usa hash-based routing: `/#blog-articulo-{slug}`
- Solo LinkedIn es red social activa (marca profesional)
- Ya existe `useSEO.ts` que actualiza OG tags dinámicamente

## Problema con Hash Routing y OG Tags
Los crawlers de redes sociales (LinkedIn, WhatsApp) NO ejecutan JavaScript, por lo que no leen meta tags dinámicos actualizados por React. Con hash routing (`/#blog-articulo-slug`), los crawlers solo ven los meta tags estáticos del `index.html`. Esto significa que al compartir un blog, se mostrará el título/imagen genérico de Praxis Hub.

**Solución**: Crear un edge function que actúe como proxy para generar HTML con OG tags correctos cuando un crawler accede a la URL de compartir.

## Cambios a implementar

### 1. Edge Function: `share-blog-meta` (nuevo)
- Endpoint: `GET /functions/v1/share-blog-meta?slug={slug}`
- Consulta el blog por slug en `blog_posts`
- Retorna HTML mínimo con OG meta tags correctos (og:title, og:description, og:image, og:url, twitter:card) y un redirect JavaScript al blog real
- User agents de crawlers (LinkedInBot, WhatsApp, facebookexternalhit) reciben HTML con meta tags
- Usuarios normales son redirigidos a `https://praxis-hub.co/#blog-articulo-{slug}`

### 2. Componente: `BlogShareButtons.tsx` (nuevo)
- Componente reutilizable con botones de compartir
- Redes: LinkedIn, WhatsApp, Copiar enlace
- Genera URLs de compartir usando la URL del edge function como share URL (para que los crawlers lean los OG tags)
- Incluye tooltip con preview del texto que se compartirá
- Acepta props: `blog` (title, slug, excerpt, featured_image)

### 3. Actualizar `AdminBlogManager.tsx`
- Importar `BlogShareButtons`
- Agregar columna "Compartir" en la tabla de blogs
- Mostrar botones de compartir solo para blogs con status `published`
- Agregar ícono Share2 de lucide-react

### 4. Actualizar `BlogArticlePage.tsx`
- Reemplazar las funciones de compartir inline por el componente `BlogShareButtons`
- Usar la misma URL del edge function para compartir

## Mejores prácticas aplicadas
- **LinkedIn**: URL de compartir con OG tags server-side (og:title, og:description, og:image, og:type=article)
- **WhatsApp**: Incluir texto + URL en el mensaje pre-armado
- **OG Image**: Usar `featured_image` del blog o fallback a imagen genérica de Praxis Hub
- **URL canónica**: Apuntar al blog real en praxis-hub.co

## Archivos modificados/creados
| Archivo | Cambio |
|---------|--------|
| `supabase/functions/share-blog-meta/index.ts` | **Nuevo** - OG meta proxy |
| `src/components/BlogShareButtons.tsx` | **Nuevo** - Componente reutilizable |
| `src/components/AdminBlogManager.tsx` | Agregar columna de compartir |
| `src/components/BlogArticlePage.tsx` | Usar BlogShareButtons |

