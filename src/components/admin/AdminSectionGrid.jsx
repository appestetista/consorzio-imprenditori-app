import React from 'react';
import { createPageUrl } from '@/utils';
import { Calendar, Video, BookOpen, Briefcase, Sparkles, User, Gift, Bell } from 'lucide-react';
import AdminPremiumCard from './AdminPremiumCard';

export default function AdminSectionGrid({ stats, pendingApprovalEventsCount, pendingVideoRequests, pendingConsultationBookings, onOpenConsulenze, onOpenVantaggi }) {
  return (
    <div className="mb-6">
      <h2 className="text-white font-semibold text-sm mb-3">Sezioni Home</h2>
      <div className="grid grid-cols-3 gap-3">
        <AdminPremiumCard
          icon={Calendar}
          label="Calendario<br/>incontri"
          href={createPageUrl('CalendarioIncontri')}
          countBadge={stats?.totalEvents || 0}
          notificationBadge={pendingApprovalEventsCount}
        />
        <AdminPremiumCard
          icon={Video}
          label="Video<br/>interviste"
          href={createPageUrl('VideoInterviste')}
          countBadge={stats?.totalVideos || 0}
          notificationBadge={pendingVideoRequests?.length || 0}
        />
        <AdminPremiumCard
          icon={BookOpen}
          label="Academy"
          href={createPageUrl('CulturaAziendale')}
        />
        <AdminPremiumCard
          icon={Briefcase}
          label="Consulenze"
          onClick={onOpenConsulenze}
          countBadge={(stats?.totalConsultants || 0) > 0 ? stats.totalConsultants : null}
          notificationBadge={pendingConsultationBookings}
        />
        <AdminPremiumCard
          icon={Sparkles}
          label="Finanziamenti<br/>agevolati"
          href={createPageUrl('FinanziamentiAgevolati')}
        />
        <AdminPremiumCard
          icon={User}
          label="Contatta<br/>Imprenditori"
          href={createPageUrl('GestioneMembri')}
        />
        <AdminPremiumCard
          icon={Gift}
          label="Vantaggi<br/>Iscritti"
          onClick={onOpenVantaggi}
          countBadge={(stats?.totalVantaggi || 0) > 0 ? stats.totalVantaggi : null}
          borderGradient="linear-gradient(145deg, #f59e0b 0%, #d97706 30%, #b45309 60%, #f59e0b 100%)"
          iconColor="text-amber-400"
          bellColor="text-amber-400/60"
        />
      </div>
    </div>
  );
}