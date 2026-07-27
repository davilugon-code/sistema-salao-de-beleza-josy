export function calcularDuracaoProcedimento(procedimento: string | null | undefined): number {
  if (!procedimento) {
    return 30; // 30 minutes (padrão)
  }

  const parts = procedimento.split(/[,;+]|\s+e\s+/gi);
  let totalMinutes = 0;

  for (const part of parts) {
    const trimmed = part.trim().toLowerCase();
    if (!trimmed) continue;

    if (trimmed.includes('selagem') || trimmed.includes('selamento') || trimmed.includes('progressiva')) {
      totalMinutes += 240; // 4 hours
    } else {
      totalMinutes += 30; // 30 minutes
    }
  }

  return totalMinutes > 0 ? totalMinutes : 30;
}

export function adicionarMinutos(dataHoraStr: string, minutos: number): string {
  // Extrai apenas a parte "YYYY-MM-DDTHH:mm:ss" ou "YYYY-MM-DDTHH:mm" ignorando timezone
  // para operar puramente como horário local sem conversão de fuso
  const localPart = dataHoraStr.replace(/([+-]\d{2}:\d{2}|Z)$/, '');

  // Converte para Date tratando como UTC (sem offset) para fazer aritmética pura
  const [datePart, timePart] = localPart.split('T');
  if (!datePart || !timePart) return dataHoraStr;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  // Cria data sem conversão de timezone, usando Date.UTC
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  const newMs = utcMs + minutos * 60 * 1000;

  const newDate = new Date(newMs);
  const ny = newDate.getUTCFullYear();
  const nm = String(newDate.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(newDate.getUTCDate()).padStart(2, '0');
  const nh = String(newDate.getUTCHours()).padStart(2, '0');
  const nmin = String(newDate.getUTCMinutes()).padStart(2, '0');
  const nsec = String(newDate.getUTCSeconds()).padStart(2, '0');

  return `${ny}-${nm}-${nd}T${nh}:${nmin}:${nsec}`;
}

export function obterHoraMinuto(dataHoraStr: string): string {
  const tIndex = dataHoraStr.indexOf('T');
  if (tIndex !== -1 && dataHoraStr.length >= tIndex + 6) {
    return dataHoraStr.substring(tIndex + 1, tIndex + 6);
  }
  try {
    const date = new Date(dataHoraStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
}

export function atualizarObservacoesComHorario(
  observacoes: string | null | undefined,
  inicioStr: string,
  fimStr: string,
  countProcedimentos: number
): string {
  let cleanObs = (observacoes || '').trim();
  const regex = /\s*\(\s*Horário:\s*\d{2}:\d{2}\s*às\s*\d{2}:\d{2}\s*\)/gi;
  cleanObs = cleanObs.replace(regex, '').trim();

  if (countProcedimentos > 1) {
    const rangeText = `(Horário: ${obterHoraMinuto(inicioStr)} às ${obterHoraMinuto(fimStr)})`;
    cleanObs = cleanObs ? `${cleanObs} ${rangeText}` : rangeText;
  }

  return cleanObs;
}
