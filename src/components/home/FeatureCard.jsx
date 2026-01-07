import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NotificationBell from '../ui/NotificationBell';
import { cn } from '@/lib/utils';

export default function FeatureCard({ title, icon: Icon, pageName, notificationCount = 0, disabled = false }) {
  const content = (
    <div className={cn(
      "relative bg-slate-800/90 rounded-xl p-6 flex flex-col items-center justify-center min-h-[120px] transition-all duration-300",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700/90 hover:scale-105 cursor-pointer",
      "border border-slate-700/50"
    )}>
      <div className="absolute top-3 right-3">
        <NotificationBell count={notificationCount} />
      </div>
      {Icon && <Icon className="w-8 h-8 text-lime-400 mb-3" />}
      <span className="text-white text-sm font-medium text-center leading-tight">{title}</span>
    </div>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link to={createPageUrl(pageName)}>
      {content}
    </Link>
  );
}