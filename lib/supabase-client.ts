import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type Canvas = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  nodes: any[];
  edges: any[];
};
