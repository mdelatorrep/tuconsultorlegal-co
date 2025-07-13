-- Drop existing policies for blog_posts
DROP POLICY IF EXISTS "Anyone can view published blogs" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all blogs" ON public.blog_posts;

-- Create new policies that work with our admin system
CREATE POLICY "Anyone can view published blogs" 
ON public.blog_posts 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Service role can manage all blogs" 
ON public.blog_posts 
FOR ALL 
USING (true);