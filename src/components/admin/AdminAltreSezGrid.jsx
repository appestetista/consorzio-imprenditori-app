import React from 'react';
import { createPageUrl } from '@/utils';
import { ShoppingBag, Handshake, Truck, Heart, FileSearch, Globe, Shield, Calculator, Star, Database, Gavel, MessageSquare, Bell } from 'lucide-react';
import AdminPremiumCard from './AdminPremiumCard';

export default function AdminAltreSezGrid({ 
  allAdminMessages, 
  unreadAdminMessages, 
  onOpenImportExport, 
  onOpenSimulatore, 
  onOpenVideoRecensioni, 
  onOpenCostoPersonale, 
  onOpenImportAste, 
  onOpenAdminMessages 
}) {
  return (
    <div className="mb-6">
      <h2 className="text-white font-semibold text-sm mb-3">Altre Sezioni</h2>
      <div className="grid grid-cols-3 gap-3">
        <AdminPremiumCard icon={ShoppingBag} label="Market<br/>place" href={createPageUrl('Marketplace')} />
        <AdminPremiumCard icon={Handshake} label="Consigli da<br/>Imprenditori" href={createPageUrl('Imprenditori')} />
        <AdminPremiumCard icon={Truck} label="Ricerca<br/>Fornitori" href={createPageUrl('Fornitori')} />
        <AdminPremiumCard icon={Heart} label="Welfare<br/>Aziendale" href={createPageUrl('WelfareAziendale')} iconColor="text-pink-400" />
        <AdminPremiumCard icon={FileSearch} label="Analisi<br/>Contratti" href={createPageUrl('AnalisiContratti')} />
        <AdminPremiumCard icon={Globe} label="Import /<br/>Export" onClick={onOpenImportExport} />
        <AdminPremiumCard icon={Shield} label="Compliance<br/>Aziendale" href={createPageUrl('ComplianceAziendale')} iconColor="text-blue-400" />
        <AdminPremiumCard icon={Calculator} label="Simulatore<br/>Fiscale" onClick={onOpenSimulatore} />
        <AdminPremiumCard icon={Star} label="Video<br/>Recensioni" onClick={onOpenVideoRecensioni} />
        <AdminPremiumCard 
          icon={Database} 
          label="Costo<br/>Personale" 
          onClick={onOpenCostoPersonale}
          borderGradient="linear-gradient(145deg, #8b5cf6 0%, #7c3aed 30%, #6d28d9 60%, #8b5cf6 100%)"
          iconColor="text-violet-400"
          bellColor="text-violet-400/60"
        />
        <AdminPremiumCard icon={Gavel} label="Aste<br/>Immobiliari" onClick={onOpenImportAste} />
        <AdminPremiumCard 
          icon={MessageSquare} 
          label="Gestione<br/>Messaggi" 
          onClick={onOpenAdminMessages}
          countBadge={allAdminMessages?.length || 0}
          notificationBadge={unreadAdminMessages?.length || 0}
        />
      </div>
    </div>
  );
}