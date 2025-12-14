import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    );
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// Helper to get the current user's firm_id from the session
export async function getCurrentFirmId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('users')
        .select('firm_id')
        .eq('id', user.id)
        .single();

    return data?.firm_id ?? null;
}

// Helper to get the current user with firm info
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('users')
        .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      firm_id,
      firms:firm_id (
        id,
        name,
        province,
        settings
      )
    `)
        .eq('id', user.id)
        .single();

    return data;
}
