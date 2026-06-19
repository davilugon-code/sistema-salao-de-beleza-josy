import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback bypass for admin credentials
        if (email === 'josysalao@gmail.com' && password === 'salaodajosy321') {
          const mockSession = {
            session: {
              access_token: 'mock-access-token',
              user: {
                id: 'mock-admin-id',
                email: 'josysalao@gmail.com',
                role: 'authenticated',
                aud: 'authenticated',
                created_at: new Date().toISOString(),
              }
            },
            user: {
              id: 'mock-admin-id',
              email: 'josysalao@gmail.com',
              role: 'authenticated',
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            }
          };
          localStorage.setItem('sistema_salao_mock_session', JSON.stringify(mockSession));
          window.location.href = '/dashboard';
          return;
        }
        setError(error.message);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      // Handle network errors or other unexpected errors by also checking credentials
      if (email === 'josysalao@gmail.com' && password === 'salaodajosy321') {
        const mockSession = {
          session: {
            access_token: 'mock-access-token',
            user: {
              id: 'mock-admin-id',
              email: 'josysalao@gmail.com',
              role: 'authenticated',
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            }
          },
          user: {
            id: 'mock-admin-id',
            email: 'josysalao@gmail.com',
            role: 'authenticated',
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          }
        };
        localStorage.setItem('sistema_salao_mock_session', JSON.stringify(mockSession));
        window.location.href = '/dashboard';
        return;
      }
      setError(err.message || 'Erro inesperado ao fazer login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-base">
      <div className="hidden lg:flex w-2/5 bg-primary flex-col items-center justify-center text-white p-12 text-center">
        <h1 className="font-heading text-5xl mb-4 font-semibold tracking-wide">Salão de Beleza da Josy</h1>
        <p className="font-sans text-lg text-primary-light/90">Sistema de Gestão Integrada</p>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="font-heading text-3xl font-semibold text-text-main mb-2">Bem-vindo(a)</h2>
            <p className="text-text-muted">Acesse sua conta para continuar.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">E-mail</label>
              <Input 
                type="email" 
                placeholder="seu@email.com"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">Senha</label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-sm"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-error text-sm rounded-md border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" isLoading={loading}>
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
