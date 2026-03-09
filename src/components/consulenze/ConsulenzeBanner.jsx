import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CONSULTANT_CATEGORIES = [
  "Stampa Digitale e Cataloghi",
  "Assicurazioni Aziendali",
  "Agenzia di Comunicazione",
  "Commercialista",
  "Igiene e Sicurezza",
  "Internazionalizzazione/Export",
  "Broker Energetico",
  "Avvocato",
  "Bandi Europei",
  "Affitto Stampanti/Cyber Sicurezza",
  "Efficientamento Energetico/Centralini"
];

export default function ConsulenzeBanner({ user, consultants }) {
  const userZona = user?.zona?.toLowerCase();

  const { data: assignments = [] } = useQuery({
    queryKey: ['banner-assignments', user?.email],
    queryFn: () => base44.entities.ConsultantAssignment.filter({ user_email: user.email, is_assigned: true }),
    enabled: !!user?.email,
  });

  const { data: completedBookings = [] } = useQuery({
    queryKey: ['banner-completed-bookings', user?.email],
    queryFn: () => base44.entities.ConsultationBooking.filter({ user_email: user.email, status: 'completed' }),
    enabled: !!user?.email,
  });

  const filteredConsultants = consultants.filter(c => {
    const consultantZones = c.zone_assegnate?.map(z => z.toLowerCase()) || [];
    const hasZona = c.zona?.toLowerCase();
    return consultantZones.includes(userZona) || hasZona === userZona;
  });

  const visibleConsultantIds = CONSULTANT_CATEGORIES
    .map(category => filteredConsultants.find(c => c.category === category)?.id)
    .filter(Boolean);

  const totalConsultations = assignments
    .filter(a => visibleConsultantIds.includes(a.consultant_id))
    .reduce((sum, a) => sum + (a.available_consultations || 0), 0);

  const completedCount = completedBookings.length;

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-lime-400/30 mb-4">
      <CardContent className="p-5">
        <p className="text-slate-400 text-sm mb-3">
          Hai {totalConsultations} consulenze gratuite assegnate dai consulenti del consorzio
        </p>
        <div className="flex items-center gap-4">
          <div className="bg-lime-400/20 rounded-xl p-4 text-center">
            <span className="text-3xl font-bold text-lime-400">{totalConsultations}</span>
            <p className="text-xs text-slate-400">disponibili</p>
          </div>
          <div>
            <p className="text-slate-300 text-sm">Consulenze Completate</p>
            <p className="text-lime-400 font-bold">{completedCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}