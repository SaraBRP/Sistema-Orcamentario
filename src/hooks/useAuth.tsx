import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession) {
          setSession(supaSession);
          setUser(supaSession.user);
          setLoading(false);
          return;
        }
      } catch {}

      // Fallback: se houver perfil ativo no localStorage de um usuário aprovado
      try {
        const saved = localStorage.getItem('orcabrp_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            const mockUser: any = {
              id: parsed.email,
              email: parsed.email,
              user_metadata: { full_name: parsed.nome }
            };
            const mockSession: any = {
              user: mockUser,
              access_token: 'local-approved-token'
            };
            setUser(mockUser);
            setSession(mockSession);
            setLoading(false);
            return;
          }
        }
      } catch {}

      setUser(null);
      setSession(null);
      setLoading(false);
    };

    checkAuthStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      if (supaSession) {
        setSession(supaSession);
        setUser(supaSession.user);
      } else {
        try {
          const saved = localStorage.getItem('orcabrp_user_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.email) {
              const mockUser: any = {
                id: parsed.email,
                email: parsed.email,
                user_metadata: { full_name: parsed.nome }
              };
              const mockSession: any = {
                user: mockUser,
                access_token: 'local-approved-token'
              };
              setUser(mockUser);
              setSession(mockSession);
              return;
            }
          }
        } catch {}

        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem('orcabrp_user_profile');
    } catch {}
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
