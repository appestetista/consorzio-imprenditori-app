import React from 'react';
import { cn } from '@/lib/utils';

export default function GoldPremiumButton({ onClick, disabled, className, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-10 cursor-pointer transition-all duration-150",
        "hover:brightness-110 active:scale-[0.98]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
        borderRadius: '16px',
        boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.6), inset 0 -6px 8px rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.6)',
        border: 'none'
      }}
    >
      {children}
    </button>
  );
}