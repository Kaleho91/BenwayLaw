// ============================================================================
// Authentication Hook
// ============================================================================

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser, RegisterData, LoginData, Firm, UserRole } from '@/types';

interface AuthContextType {
    user: AuthUser | null;
    firm: Firm | null;
    loading: boolean;
    signIn: (data: LoginData) => Promise<{ error: Error | null }>;
    signUp: (data: RegisterData) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [firm, setFirm] = useState<Firm | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = useCallback(async (authUserId: string) => {
        const { data, error } = await supabase
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
            .eq('id', authUserId)
            .single();

        if (error || !data) {
            console.error('Error fetching user data:', error);
            return;
        }

        const firmData = Array.isArray(data.firms) ? data.firms[0] : data.firms;

        setUser({
            id: data.id,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            role: data.role as UserRole,
            firm_id: data.firm_id,
        });

        if (firmData) {
            setFirm({
                id: firmData.id,
                name: firmData.name,
                province: firmData.province,
                settings: firmData.settings || {},
                created_at: '',
            });
        }
    }, []);

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchUserData(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    await fetchUserData(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setFirm(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchUserData]);

    const signIn = async (data: LoginData) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });
            return { error: error ? new Error(error.message) : null };
        } catch (err) {
            return { error: err as Error };
        }
    };

    const signUp = async (data: RegisterData) => {
        try {
            // 1. Create the auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
            });

            if (authError || !authData.user) {
                return { error: authError ? new Error(authError.message) : new Error('Registration failed') };
            }

            // 2. Create the firm
            const { data: firmData, error: firmError } = await supabase
                .from('firms')
                .insert({
                    name: data.firm_name,
                    province: data.province,
                    settings: {},
                })
                .select()
                .single();

            if (firmError || !firmData) {
                return { error: new Error('Failed to create firm: ' + firmError?.message) };
            }

            // 3. Create the user record linked to firm
            const { error: userError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    firm_id: firmData.id,
                    email: data.email,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    role: 'admin', // First user is always admin
                });

            if (userError) {
                return { error: new Error('Failed to create user profile: ' + userError.message) };
            }

            // 4. Optionally seed demo data
            const { error: seedError } = await supabase.rpc('seed_demo_data', {
                p_firm_id: firmData.id,
                p_user_id: authData.user.id,
            });

            if (seedError) {
                console.warn('Demo data seeding failed:', seedError);
                // Non-fatal error, continue
            }

            return { error: null };
        } catch (err) {
            return { error: err as Error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setFirm(null);
    };

    const refreshUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            await fetchUserData(authUser.id);
        }
    };

    return (
        <AuthContext.Provider value={{ user, firm, loading, signIn, signUp, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
