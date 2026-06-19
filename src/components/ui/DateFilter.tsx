import { useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../ui/Button';
import { Input } from '../ui/Input';

export interface DateRange {
  from: Date;
  to: Date;
  preset: string | null;
}

interface DateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7dias', label: 'Últimos 7 dias' },
  { key: '14semanas', label: 'Últimas 14 semanas' },
  { key: 'mes', label: 'Este mês' },
  { key: 'ano', label: 'Este ano' },
];

export function getPresetRange(key: string): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case 'hoje':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'ontem': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7dias':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '14semanas':
      return { from: startOfDay(subWeeks(now, 14)), to: endOfDay(now) };
    case 'mes':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'ano':
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const handlePreset = (key: string) => {
    const { from, to } = getPresetRange(key);
    onChange({ from, to, preset: key });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const from = startOfDay(new Date(e.target.value + 'T12:00:00'));
    onChange({ from, to: value.to, preset: null });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const to = endOfDay(new Date(e.target.value + 'T12:00:00'));
    onChange({ from: value.from, to, preset: null });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-card rounded-card border border-border-card shadow-card mb-6">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-button font-medium transition-colors',
              value.preset === p.key
                ? 'bg-primary text-white'
                : 'text-text-muted hover:bg-primary-light hover:text-primary border border-border-card'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-text-muted text-sm">De</span>
        <Input
          type="date"
          className="w-36"
          value={format(value.from, 'yyyy-MM-dd')}
          max={today}
          onChange={handleFromChange}
        />
        <span className="text-text-muted text-sm">até</span>
        <Input
          type="date"
          className="w-36"
          value={format(value.to, 'yyyy-MM-dd')}
          max={today}
          onChange={handleToChange}
        />
      </div>
    </div>
  );
}
