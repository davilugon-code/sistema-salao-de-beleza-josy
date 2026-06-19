import React from 'react';
import { cn } from './Button';
import { User } from 'lucide-react';

interface AvatarProps {
  initials?: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ initials, src, className }: AvatarProps) {
  return (
    <div className={cn("w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary overflow-hidden shrink-0", className)}>
      {src ? (
        <img src={src} alt="Avatar" className="w-full h-full object-cover" />
      ) : initials ? (
        <span className="font-heading font-semibold text-lg">{initials.substring(0, 2).toUpperCase()}</span>
      ) : (
        <User size={20} />
      )}
    </div>
  );
}
