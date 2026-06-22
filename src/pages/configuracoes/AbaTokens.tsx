import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AbaTokens() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  
  const [label, setLabel] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [tokenToDisable, setTokenToDisable] = useState<string | null>(null);
  
  const { user } = useAuth();

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    const { data } = await supabase.from('api_tokens').select('*').order('created_at', { ascending: false });
    setTokens(data || []);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;

    const rawToken = crypto.randomUUID();
    
    // Gerar hash SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('api_tokens').insert({
      label,
      token_hash: tokenHash,
      ativo: true,
      created_by: user?.id
    });

    if (!error) {
      setIsNewModalOpen(false);
      setLabel('');
      setCreatedToken(rawToken);
      setIsTokenModalOpen(true);
      fetchTokens();
    } else {
      console.error('Erro ao criar token de API:', error);
      alert(`Erro ao criar token de API: ${error.message}`);
    }
  };

  const handleDisableToken = async () => {
    if (!tokenToDisable) return;
    await supabase.from('api_tokens').update({ ativo: false }).eq('id', tokenToDisable);
    setIsDisableModalOpen(false);
    setTokenToDisable(null);
    fetchTokens();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(createdToken);
    alert('Copiado!');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-warning/10 border-b border-warning/20">
        <div>
          <CardTitle className="text-warning">Tokens de API</CardTitle>
          <p className="text-sm text-text-muted mt-1">Os tokens são necessários para todas as chamadas de API. Guarde-os em local seguro.</p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)}>Novo token</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted uppercase bg-base border-b border-border-card">
              <tr>
                <th className="px-6 py-3">Label</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Criado em</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id} className="border-b border-border-card hover:bg-base/50">
                  <td className="px-6 py-4 font-medium">{t.label}</td>
                  <td className="px-6 py-4">
                    <Badge variant={t.ativo ? 'confirmado' : 'faltou'}>
                      {t.ativo ? 'Ativo' : 'Desabilitado'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">{new Date(t.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-right">
                    {t.ativo && (
                      <Button 
                        variant="secondary" 
                        className="text-error hover:bg-red-50 border-error/20 py-1.5 px-3 text-xs"
                        onClick={() => { setTokenToDisable(t.id); setIsDisableModalOpen(true); }}
                      >
                        Desabilitar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-muted">Nenhum token gerado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Novo Token de API">
          <form onSubmit={handleCreateToken} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Label do token</label>
              <Input placeholder="Ex: N8N Produção" value={label} onChange={e => setLabel(e.target.value)} required />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Gerar Token</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isTokenModalOpen} onClose={() => setIsTokenModalOpen(false)} title="Token Gerado com Sucesso">
          <div className="space-y-4 text-center">
            <p className="text-warning text-sm font-medium">Copie agora — este token não será exibido novamente.</p>
            <div className="bg-base border border-border-card p-4 rounded-md flex items-center justify-between gap-4">
              <code className="text-primary font-medium truncate flex-1">{createdToken}</code>
              <button onClick={copyToClipboard} className="text-text-muted hover:text-primary p-2">
                <Copy size={20} />
              </button>
            </div>
            <Button onClick={() => setIsTokenModalOpen(false)} className="w-full">Entendi e copiei</Button>
          </div>
        </Modal>

        <Modal isOpen={isDisableModalOpen} onClose={() => setIsDisableModalOpen(false)} title="Desabilitar Token">
          <div className="space-y-4">
            <p className="text-text-main">Tem certeza? Esta ação é permanente e não pode ser desfeita. O token será desabilitado imediatamente.</p>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsDisableModalOpen(false)}>Cancelar</Button>
              <Button type="button" variant="danger" onClick={handleDisableToken}>Desabilitar permanentemente</Button>
            </div>
          </div>
        </Modal>

      </CardContent>
    </Card>
  );
}
