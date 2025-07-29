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

    // Check if it's a lawyer token or admin token
    let isLawyer = false
    let lawyerData = null
    
    // Check if it's a lawyer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: lawyer, error: lawyerError } = await supabase
        .from('lawyer_profiles')
        .select('*')
        .eq('access_token', token)
        .eq('active', true)
        .eq('is_active', true)
        .single()
      
      if (lawyer && !lawyerError) {
        isLawyer = true
        lawyerData = lawyer
        console.log('Lawyer authenticated:', lawyer.full_name)
      }
    }

    // Handle GET requests for listing blogs
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const action = url.searchParams.get('action') || 'list'
      
      if (action === 'list') {
        console.log('Fetching blog list')
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
    }

    // Handle POST requests for all operations
    if (req.method === 'POST') {
      const requestBody = await req.json()
      const { action, id, ...data } = requestBody

      console.log('Manage blog posts request:', { action, id, hasData: !!data })

      switch (action) {
        case 'create':
          console.log('Creating new blog post')
          
          // If it's a lawyer creating the blog, set them as author and force draft status
          if (isLawyer && lawyerData) {
            // Create admin account entry for lawyer if it doesn't exist
            const { data: existingAdmin, error: adminCheckError } = await supabase
              .from('admin_accounts')
              .select('*')
              .eq('email', lawyerData.email)
              .single()
            
            let authorId = existingAdmin?.id
            
            if (!existingAdmin || adminCheckError) {
              // Create admin account for the lawyer
              const { data: newAdmin, error: createAdminError } = await supabase
                .from('admin_accounts')
                .insert({
                  email: lawyerData.email,
                  full_name: lawyerData.full_name,
                  active: true,
                  is_super_admin: false
                })
                .select()
                .single()
              
              if (createAdminError) {
                console.error('Error creating admin account for lawyer:', createAdminError)
                return new Response(JSON.stringify({ 
                  error: 'Failed to create author account',
                  message: createAdminError.message 
                }), {
                  status: 500,
                  headers: securityHeaders
                })
              }
              
              authorId = newAdmin.id
            }
            
            data.author_id = authorId
            // New blogs from lawyers go to revision, unless it's an edit
            if (!data.status || data.status === 'draft') {
              data.status = 'en_revision'
            }
            console.log('Lawyer creating/updating blog with author_id:', authorId, 'status:', data.status)
          }
          
          // Generate slug from title if not provided
          if (!data.slug && data.title) {
            data.slug = data.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          }

          // Calculate reading time (average 200 words per minute)
          if (data.content) {
            const wordCount = data.content.split(/\s+/).length
            data.reading_time = Math.ceil(wordCount / 200)
          }

          // Set published_at if status is published (only for admins)
          if (data.status === 'published' && !data.published_at && !isLawyer) {
            data.published_at = new Date().toISOString()
          }

          const { data: newBlog, error: createError } = await supabase
            .from('blog_posts')
            .insert([data])
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

        case 'update':
          if (!id) {
            return new Response(JSON.stringify({ error: 'Blog ID required for update' }), {
              status: 400,
              headers: securityHeaders
            })
          }

          console.log('Updating blog post:', id)
          
          // If it's a lawyer, check they can only edit their own drafts
          if (isLawyer && lawyerData) {
            const { data: existingBlog, error: blogCheckError } = await supabase
              .from('blog_posts')
              .select('*, author:admin_accounts(email)')
              .eq('id', id)
              .single()
            
            if (blogCheckError || !existingBlog) {
              return new Response(JSON.stringify({ error: 'Blog not found' }), {
                status: 404,
                headers: securityHeaders
              })
            }
            
            // Check if lawyer owns this blog
            if (existingBlog.author?.email !== lawyerData.email) {
              return new Response(JSON.stringify({ error: 'You can only edit your own blogs' }), {
                status: 403,
                headers: securityHeaders
              })
            }
            
            // Check if blog is still editable (draft or en_revision)
            if (existingBlog.status !== 'draft' && existingBlog.status !== 'en_revision') {
              return new Response(JSON.stringify({ error: 'You can only edit draft or in-review blogs' }), {
                status: 403,
                headers: securityHeaders
              })
            }
            
            // Don't force status change - let lawyers update in revision state
            console.log('Lawyer updating their blog:', id, 'current status:', existingBlog.status)
          }
          
          // Generate slug from title if not provided
          if (!data.slug && data.title) {
            data.slug = data.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          }

          // Calculate reading time if content is updated
          if (data.content) {
            const wordCount = data.content.split(/\s+/).length
            data.reading_time = Math.ceil(wordCount / 200)
          }

          // Set published_at if status is changed to published (only for admins)
          if (data.status === 'published' && !data.published_at && !isLawyer) {
            data.published_at = new Date().toISOString()
          }

          const { data: updatedBlog, error: updateError } = await supabase
            .from('blog_posts')
            .update(data)
            .eq('id', id)
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

        case 'delete':
          if (!id) {
            return new Response(JSON.stringify({ error: 'Blog ID required for delete' }), {
              status: 400,
              headers: securityHeaders
            })
          }

          console.log('Deleting blog post:', id)
          
          // If it's a lawyer, check they can only delete their own drafts
          if (isLawyer && lawyerData) {
            const { data: existingBlog, error: blogCheckError } = await supabase
              .from('blog_posts')
              .select('*, author:admin_accounts(email)')
              .eq('id', id)
              .single()
            
            if (blogCheckError || !existingBlog) {
              return new Response(JSON.stringify({ error: 'Blog not found' }), {
                status: 404,
                headers: securityHeaders
              })
            }
            
            // Check if lawyer owns this blog
            if (existingBlog.author?.email !== lawyerData.email) {
              return new Response(JSON.stringify({ error: 'You can only delete your own blogs' }), {
                status: 403,
                headers: securityHeaders
              })
            }
            
            // Check if blog is still editable (draft or en_revision)
            if (existingBlog.status !== 'draft' && existingBlog.status !== 'en_revision') {
              return new Response(JSON.stringify({ error: 'You can only delete draft or in-review blogs' }), {
                status: 403,
                headers: securityHeaders
              })
            }
            
            console.log('Lawyer deleting their blog:', id, 'status:', existingBlog.status)
          }

          const { error: deleteError } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id)

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
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: securityHeaders
          })
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Error in manage-blog-posts function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})