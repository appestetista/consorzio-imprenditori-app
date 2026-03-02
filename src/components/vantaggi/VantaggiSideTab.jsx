import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function VantaggiSideTab() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(createPageUrl('VantaggiIscritti'))}
      className={cn(
        "fixed left-0 z-40",
        "bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-slate-900",
        "rounded-r-xl shadow-lg shadow-[#d4af37]/20",
        "flex items-center justify-center",
        "hover:pl-2 active:scale-95",
        "transition-all duration-300"
      )}
      style={{
        width: '42px',
        height: '140px',
        writingMode: 'vertical-lr',
        textOrientation: 'mixed',
        bottom: '0px',
        top: 'auto',
        transform: 'rotate(180deg)'
      }}
    >
      <span className="text-[13px] font-bold tracking-wider leading-none whitespace-nowrap">VANTAGGI</span>
    </button>
  );
}