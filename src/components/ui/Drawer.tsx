import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../ui/Button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border-card shadow-modal z-50 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-card shrink-0">
          <h2 className="font-heading text-xl font-medium text-text-main">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-primary-light rounded-md text-text-muted">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}
