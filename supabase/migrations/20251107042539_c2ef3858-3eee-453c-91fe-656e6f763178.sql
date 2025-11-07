-- Add DELETE policy for lawyers to delete their own analysis results
CREATE POLICY "Lawyers can delete their own results"
ON public.legal_tools_results
FOR DELETE
USING (auth.uid() = lawyer_id);