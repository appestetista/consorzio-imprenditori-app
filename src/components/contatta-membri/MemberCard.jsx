import React from 'react';
import { MessageCircle, MapPin, Building2, Briefcase, Navigation } from 'lucide-react';

export default function MemberCard({ member, onContact, highlightGeo, currentUser }) {
  const initials = (member.company_name || member.full_name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const location = [member.city, member.province].filter(Boolean).join(', ');

  // Badge prossimità (solo in modalità "vicino a me")
  const proximityBadge = highlightGeo && currentUser ? getProximityBadge(member, currentUser) : null;

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
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold text-[15px] truncate leading-tight flex-1">
              {member.company_name || member.full_name}
            </h3>
            {proximityBadge && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${proximityBadge.className}`}>
                <Navigation className="w-2.5 h-2.5" />
                {proximityBadge.label}
              </span>
            )}
          </div>

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

function getProximityBadge(member, currentUser) {
  if (currentUser.city && member.city && currentUser.city === member.city) {
    return { label: 'Stessa città', className: 'bg-emerald-500/20 text-emerald-400' };
  }
  if (currentUser.province && member.province && currentUser.province === member.province) {
    return { label: 'Stessa provincia', className: 'bg-cyan-500/20 text-cyan-400' };
  }
  if (currentUser.region && member.region && currentUser.region === member.region) {
    return { label: 'Stessa regione', className: 'bg-blue-500/20 text-blue-400' };
  }
  return null;
}