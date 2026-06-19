import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useClinic } from '../../contexts/ClinicContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

type DiaSemana = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';

interface ClinicHour {
  dia: DiaSemana;
  aberto: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
}

export function AbaGeral() {
  const { config, refreshConfig } = useClinic();
  const [nome, setNome] = useState(config.nome);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingGeral, setSavingGeral] = useState(false);
  const [message, setMessage] = useState('');

  const [hours, setHours] = useState<Record<DiaSemana, ClinicHour>>({} as any);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursMessage, setHoursMessage] = useState('');

  const diasOrdenados: DiaSemana[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    const { data } = await supabase.from('clinic_hours').select('*');
    if (data) {
      const hoursMap = {} as Record<DiaSemana, ClinicHour>;
      diasOrdenados.forEach(dia => {
        const h = data.find(d => d.dia === dia);
        hoursMap[dia] = h || { dia, aberto: false, hora_inicio: '08:00', hora_fim: '18:00' };
      });
      setHours(hoursMap);
    }
  };

  const handleSaveGeral = async () => {
    setSavingGeral(true);
    setMessage('');
    try {
      let logoUrl = config.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('clinic-assets').upload(fileName, logoFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('clinic-assets').getPublicUrl(fileName);
          logoUrl = data.publicUrl;
        }
      }

      await supabase.from('clinic_config').update({ nome, logo_url: logoUrl }).eq('id', 1);
      await refreshConfig();
      setMessage('Identidade atualizada com sucesso!');
    } catch (err) {
      setMessage('Erro ao salvar identidade.');
    } finally {
      setSavingGeral(false);
    }
  };

  const handleRemoveLogo = async () => {
    await supabase.from('clinic_config').update({ logo_url: null }).eq('id', 1);
    await refreshConfig();
  }

  const handleSaveHours = async () => {
    setSavingHours(true);
    setHoursMessage('');
    try {
      for (const dia of diasOrdenados) {
        const h = hours[dia];
        if (h.aberto && h.hora_inicio && h.hora_fim && h.hora_inicio >= h.hora_fim) {
          setHoursMessage(`Erro: Hora fim menor ou igual a hora início na ${dia}`);
          setSavingHours(false);
          return;
        }
      }
      const upserts = Object.values(hours);
      await supabase.from('clinic_hours').upsert(upserts, { onConflict: 'dia' });
      setHoursMessage('Horários salvos com sucesso!');
    } catch (err) {
      setHoursMessage('Erro ao salvar horários.');
    } finally {
      setSavingHours(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade do Salão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do salão</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Logo do salão</label>
            <div className="flex items-center gap-4">
              {config.logo_url && (
                <img src={config.logo_url} alt="Logo Atual" className="h-16 w-16 object-contain rounded border border-border-card bg-base p-1" />
              )}
              <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
              {config.logo_url && (
                <Button variant="secondary" onClick={handleRemoveLogo}>Remover Atual</Button>
              )}
            </div>
          </div>
          {message && <p className="text-sm text-success">{message}</p>}
          <Button onClick={handleSaveGeral} isLoading={savingGeral}>Salvar alterações</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {diasOrdenados.map(dia => (
            <div key={dia} className="flex items-center gap-4 border-b border-border-card pb-3 last:border-0 last:pb-0">
              <div className="w-32 capitalize font-medium">{dia}</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hours[dia]?.aberto || false} 
                  onChange={(e) => setHours({ ...hours, [dia]: { ...hours[dia], aberto: e.target.checked }})}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                />
                <span className="text-sm">Aberto</span>
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  type="time" 
                  value={hours[dia]?.hora_inicio || ''} 
                  disabled={!hours[dia]?.aberto}
                  onChange={(e) => setHours({ ...hours, [dia]: { ...hours[dia], hora_inicio: e.target.value }})}
                  className="w-32"
                />
                <span>até</span>
                <Input 
                  type="time" 
                  value={hours[dia]?.hora_fim || ''} 
                  disabled={!hours[dia]?.aberto}
                  onChange={(e) => setHours({ ...hours, [dia]: { ...hours[dia], hora_fim: e.target.value }})}
                  className="w-32"
                />
              </div>
            </div>
          ))}
          {hoursMessage && <p className="text-sm text-primary">{hoursMessage}</p>}
          <Button onClick={handleSaveHours} isLoading={savingHours}>Salvar horários</Button>
        </CardContent>
      </Card>
    </div>
  );
}
