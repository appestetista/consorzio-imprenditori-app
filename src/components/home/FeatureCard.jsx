import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NotificationBell from '../ui/NotificationBell';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeatureCard({ title, icon: Icon, pageName, notificationCount = 0, disabled = false, variant = 'default' }) {
  const isPink = variant === 'pink';
  const content = (
    <div className={cn(
      "relative bg-slate-800/90 rounded-xl p-6 flex flex-col items-center justify-center min-h-[120px] transition-all duration-300",
      disabled ? "opacity-50 cursor-not-allowed border-red-500/50" : "hover:bg-slate-700/90 hover:scale-105 cursor-pointer border-slate-700/50",
      "border"
    )}>
      {disabled ? (
        <div className="absolute top-3 right-3">
          <Lock className="w-4 h-4 text-red-400" />
        </div>
      ) : (
        <div className="absolute top-3 right-3">
          <NotificationBell count={notificationCount} />
        </div>
      )}
      {Icon && <Icon className={cn("w-8 h-8 mb-3", disabled ? "text-red-400" : isPink ? "text-pink-400" : "text-lime-400")} />}
      <span className={cn("text-sm font-medium text-center leading-tight", disabled ? "text-red-300" : isPink ? "text-pink-400" : "text-white")}>{title}</span>
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