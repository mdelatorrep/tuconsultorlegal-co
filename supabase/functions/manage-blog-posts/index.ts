import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const blogId = url.searchParams.get('id')

    switch (req.method) {
      case 'GET':
        if (action === 'list') {
          // Get all blog posts for admin
          const { data: blogs, error } = await supabase
            .from('blog_posts')
            .select(`
              *,
              author:admin_accounts(full_name, email)
            `)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Error fetching blogs:', error)
            return new Response(JSON.stringify({ error: 'Failed to fetch blogs' }), {
              status: 500,
              headers: securityHeaders
            })
          }

          return new Response(JSON.stringify({ success: true, blogs }), {
            headers: securityHeaders
          })
        }

        if (blogId) {
          // Get specific blog post
          const { data: blog, error } = await supabase
            .from('blog_posts')
            .select(`
              *,
              author:admin_accounts(full_name, email)
            `)
            .eq('id', blogId)
            .single()

          if (error) {
            console.error('Error fetching blog:', error)
            return new Response(JSON.stringify({ error: 'Blog not found' }), {
              status: 404,
              headers: securityHeaders
            })
          }

          return new Response(JSON.stringify({ success: true, blog }), {
            headers: securityHeaders
          })
        }

        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: securityHeaders
        })

      case 'POST':
        const createData = await req.json()
        
        // Generate slug from title if not provided
        if (!createData.slug && createData.title) {
          createData.slug = createData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }

        // Calculate reading time (average 200 words per minute)
        if (createData.content) {
          const wordCount = createData.content.split(/\s+/).length
          createData.reading_time = Math.ceil(wordCount / 200)
        }

        // Set published_at if status is published
        if (createData.status === 'published' && !createData.published_at) {
          createData.published_at = new Date().toISOString()
        }

        const { data: newBlog, error: createError } = await supabase
          .from('blog_posts')
          .insert([createData])
          .select()
          .single()

        if (createError) {
          console.error('Error creating blog:', createError)
          return new Response(JSON.stringify({ 
            error: 'Failed to create blog',
            message: createError.message 
          }), {
            status: 500,
            headers: securityHeaders
          })
        }

        return new Response(JSON.stringify({ 
          success: true, 
          blog: newBlog,
          message: 'Blog created successfully' 
        }), {
          headers: securityHeaders
        })

      case 'PUT':
        if (!blogId) {
          return new Response(JSON.stringify({ error: 'Blog ID required' }), {
            status: 400,
            headers: securityHeaders
          })
        }

        const updateData = await req.json()
        
        // Generate slug from title if not provided
        if (!updateData.slug && updateData.title) {
          updateData.slug = updateData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }

        // Calculate reading time if content is updated
        if (updateData.content) {
          const wordCount = updateData.content.split(/\s+/).length
          updateData.reading_time = Math.ceil(wordCount / 200)
        }

        // Set published_at if status is changed to published
        if (updateData.status === 'published' && !updateData.published_at) {
          updateData.published_at = new Date().toISOString()
        }

        const { data: updatedBlog, error: updateError } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', blogId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating blog:', updateError)
          return new Response(JSON.stringify({ 
            error: 'Failed to update blog',
            message: updateError.message 
          }), {
            status: 500,
            headers: securityHeaders
          })
        }

        return new Response(JSON.stringify({ 
          success: true, 
          blog: updatedBlog,
          message: 'Blog updated successfully' 
        }), {
          headers: securityHeaders
        })

      case 'DELETE':
        if (!blogId) {
          return new Response(JSON.stringify({ error: 'Blog ID required' }), {
            status: 400,
            headers: securityHeaders
          })
        }

        const { error: deleteError } = await supabase
          .from('blog_posts')
          .delete()
          .eq('id', blogId)

        if (deleteError) {
          console.error('Error deleting blog:', deleteError)
          return new Response(JSON.stringify({ 
            error: 'Failed to delete blog',
            message: deleteError.message 
          }), {
            status: 500,
            headers: securityHeaders
          })
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Blog deleted successfully' 
        }), {
          headers: securityHeaders
        })

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: securityHeaders
        })
    }

  } catch (error) {
    console.error('Error in manage-blog-posts function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})