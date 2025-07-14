import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, tags, blogId } = await req.json();
    
    if (!title || !blogId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title and blogId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Generating image for blog:', title);

    // Create a detailed prompt based on the blog content and tags
    let imagePrompt = `Create a professional, modern image for a legal blog article titled "${title}". `;
    
    // Add context based on tags
    if (tags && tags.length > 0) {
      const tag = tags[0].toLowerCase();
      switch (tag) {
        case 'vivienda':
        case 'arriendo':
          imagePrompt += 'The image should relate to housing, rental agreements, and residential law. Include elements like houses, keys, contracts, or family homes. ';
          break;
        case 'trabajo':
        case 'empleo':
        case 'laboral':
          imagePrompt += 'The image should relate to employment law and workplace issues. Include elements like office buildings, business professionals, handshakes, or workplace scenes. ';
          break;
        case 'finanzas':
        case 'contratos':
        case 'vehiculo':
          imagePrompt += 'The image should relate to financial agreements and contracts. Include elements like documents, handshakes, cars (if vehicle-related), or business transactions. ';
          break;
        case 'civil':
          imagePrompt += 'The image should relate to civil law matters. Include elements like courthouses, legal documents, scales of justice, or civil proceedings. ';
          break;
        case 'penal':
          imagePrompt += 'The image should relate to criminal law. Include elements like courthouses, legal books, scales of justice, or law enforcement symbols. ';
          break;
        case 'familia':
          imagePrompt += 'The image should relate to family law. Include elements like families, children, homes, or family-related legal matters. ';
          break;
        default:
          imagePrompt += 'The image should relate to general legal matters. Include elements like legal documents, scales of justice, or professional legal settings. ';
      }
    }
    
    imagePrompt += 'The style should be professional, trustworthy, and accessible. Use warm, approachable colors with clean, modern design. Avoid overly complex or intimidating imagery. The image should appeal to Colombian individuals seeking legal guidance. Include subtle Colombian cultural elements if appropriate. 16:9 aspect ratio for web use.';

    console.log('Image prompt:', imagePrompt);

    // Generate image using OpenAI
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1536x1024', // 16:9 aspect ratio
        quality: 'standard',
        output_format: 'png'
      }),
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Image generation failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const imageData = await imageResponse.json();
    console.log('Image generated successfully');

    // Get the image URL from OpenAI response
    const imageUrl = imageData.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Update the blog post with the generated image URL
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ featured_image: imageUrl })
      .eq('id', blogId);

    if (updateError) {
      console.error('Error updating blog with image:', updateError);
      // Don't throw here, still return the image URL
    }

    console.log('Blog updated with generated image');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: imageUrl,
        message: 'Image generated and blog updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-blog-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});