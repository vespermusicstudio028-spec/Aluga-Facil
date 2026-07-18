import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole, UserPlan } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (authUser: any) => {
    try {
      const uid = authUser.id;
      const email = authUser.email || '';
      const metadata = authUser.user_metadata || {};
      const googlePhoto = metadata.avatar_url || metadata.picture;
      const googleName = metadata.full_name || metadata.name || email.split('@')[0];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      let profileData = data;

      if (profileData) {
        // Se tem foto no Google mas não no banco, salva silenciosamente
        if (googlePhoto && !profileData.photo_url) {
          supabase.from('profiles').update({ photo_url: googlePhoto }).eq('id', uid).then();
          profileData.photo_url = googlePhoto;
        }

        setUser({
          uid: profileData.id,
          email: profileData.email,
          name: profileData.name || googleName,
          phone: profileData.phone || undefined,
          photoURL: profileData.photo_url || undefined,
          role: profileData.role as UserRole,
          plan: profileData.plan as UserPlan,
          status: profileData.status,
          createdAt: profileData.created_at,
        });
      } else {
        // Fallback: perfil ainda não existe, cria objeto básico
        setUser({
          uid,
          email,
          name: googleName,
          photoURL: googlePhoto,
          role: 'owner',
          plan: 'basic',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name: name,
        }
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
