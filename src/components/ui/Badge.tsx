import React from 'react';
import { cn } from './Button';

type BadgeVariant = 'agendado' | 'confirmado' | 'compareceu' | 'faltou' | 'cancelado' | 'follow_up' | 'cancelou_agendamento' | 'abandonou_conversa';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: BadgeVariant | string;
}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium uppercase tracking-wider";
  
  const variants: Record<string, string> = {
    agendado: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    confirmado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    compareceu: "bg-[#E6F0EA] text-success dark:bg-[#2A3A31] dark:text-[#A0C4B0]",
    faltou: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    cancelado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    follow_up: "bg-[#FDF2EA] text-warning dark:bg-[#4A3424] dark:text-[#F2C09E]",
    cancelou_agendamento: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    abandonou_conversa: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };

  const defaultVariant = "bg-primary-light text-primary dark:bg-primary-light dark:text-primary";

  return (
    <div className={cn(baseStyles, variants[variant as string] || defaultVariant, className)} {...props}>
      {children}
    </div>
  );
}
