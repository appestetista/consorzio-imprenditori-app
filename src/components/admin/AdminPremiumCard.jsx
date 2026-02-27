import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

export default function AdminPremiumCard({ 
  icon: Icon, 
  label, 
  href, 
  onClick, 
  countBadge, 
  notificationBadge, 
  borderGradient = 'linear-gradient(145deg, #d4af37 0%, #b8860b 30%, #8b7355 60%, #d4af37 100%)',
  bgGradient = 'linear-gradient(160deg, #1a1a1a 0%, #0c1730 50%, #0a1225 100%)',
  iconColor = 'text-[#d4af37]',
  bellColor = 'text-[#d4af37]/60'
}) {
  const content = (
    <div 
      className="relative h-20 transition-transform duration-100 active:scale-[0.97] cursor-pointer"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)', borderRadius: '16px' }}
      onClick={!href ? onClick : undefined}
    >
      <div className="absolute inset-0 rounded-[16px] p-[2px]" style={{ background: borderGradient }}>
        <div 
          className="relative w-full h-full rounded-[14px] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: bgGradient, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
        >
          <div className="absolute top-0 left-0 w-full h-[45%] pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '14px 14px 50% 50%' }} />
          <Icon className={`w-5 h-5 ${iconColor} mb-1 relative z-10`} />
          <p className="text-white text-[10px] text-center leading-tight relative z-10" dangerouslySetInnerHTML={{ __html: label }} />
          {countBadge !== undefined && countBadge !== null && (
            <span className="absolute top-1 left-1 bg-[#d4af37] text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold z-20">
              {countBadge}
            </span>
          )}
          {notificationBadge > 0 ? (
            <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold z-20">
              {notificationBadge}
            </span>
          ) : (
            <span className={`absolute top-1 right-1 ${bellColor} z-20`}>
              <Bell className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}