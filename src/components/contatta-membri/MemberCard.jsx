import React from 'react';
import { MessageCircle, MapPin, Building2, Users, Briefcase } from 'lucide-react';

export default function MemberCard({ member, onContact }) {
  const initials = (member.company_name || member.full_name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const location = [member.city, member.province].filter(Boolean).join(', ');

  return (
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600 transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar / Logo */}
        {member.logo_url ? (
          <img
            src={member.logo_url}
            alt={member.company_name}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-slate-700"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400/20 to-emerald-400/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lime-400 font-bold text-sm">{initials}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-[15px] truncate leading-tight">
            {member.company_name || member.full_name}
          </h3>

          {member.specializzazione && (
            <p className="text-lime-400/80 text-xs mt-0.5 truncate">{member.specializzazione}</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {location && (
              <span className="flex items-center gap-1 text-slate-400 text-xs">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            )}
            {(member.settore || member.sector) && (
              <span className="flex items-center gap-1 text-slate-400 text-xs">
                <Briefcase className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{member.settore || member.sector}</span>
              </span>
            )}
            {member.company_size && (
              <span className="flex items-center gap-1 text-slate-400 text-xs">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                {member.company_size}
              </span>
            )}
          </div>
        </div>

        {/* Bottone contatta */}
        <button
          onClick={() => onContact(member.email)}
          className="w-10 h-10 rounded-xl bg-lime-400 hover:bg-lime-500 flex items-center justify-center flex-shrink-0 transition-colors active:scale-95"
        >
          <MessageCircle className="w-5 h-5 text-slate-900" />
        </button>
      </div>
    </div>
  );
}