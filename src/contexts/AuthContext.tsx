import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check mock session first
    const mockSession = localStorage.getItem('sistema_salao_mock_session');
    if (mockSession) {
      try {
        const parsed = JSON.parse(mockSession);
        setSession(parsed.session);
        setUser(parsed.user);
        setRole('admin');
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('sistema_salao_mock_session');
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (localStorage.getItem('sistema_salao_mock_session')) return; // keep mock if active
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (session.user.email === 'josysalao@gmail.com') {
          setRole('admin');
          setLoading(false);
        } else {
          fetchRole(session.user.id);
        }
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('sistema_salao_mock_session');
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      
      if (localStorage.getItem('sistema_salao_mock_session')) return; // keep mock if active
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (session.user.email === 'josysalao@gmail.com') {
          setRole('admin');
          setLoading(false);
        } else {
          fetchRole(session.user.id);
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setRole(data.role as 'admin' | 'user');
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('sistema_salao_mock_session');
    setSession(null);
    setUser(null);
    setRole(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
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
