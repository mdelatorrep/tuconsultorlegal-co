-- Enable REPLICA IDENTITY FULL for lawyer_credits table
ALTER TABLE public.lawyer_credits REPLICA IDENTITY FULL;

-- Add lawyer_credits to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.lawyer_credits;

-- Also enable for credit_transactions to track new transactions in real-time
ALTER TABLE public.credit_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;