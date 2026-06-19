import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface ClinicConfig {
  nome: string;
  logo_url: string | null;
}

interface ClinicContextType {
  config: ClinicConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClinicConfig>({ nome: 'Salão de Beleza da Josy', logo_url: null });
  const [loading, setLoading] = useState(true);

  const refreshConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_config')
        .select('nome, logo_url')
        .eq('id', 1)
        .single();

      if (error) throw error;
      if (data) {
        setConfig({ nome: data.nome, logo_url: data.logo_url });
      }
    } catch (err) {
      console.error('Error fetching clinic config', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  return (
    <ClinicContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}
