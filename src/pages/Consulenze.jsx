import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import MemberView from '../components/consulenze/MemberView';
import ConsultantView from '../components/consulenze/ConsultantView';
import AdminView from '../components/consulenze/AdminView';
import { useImpersonation } from '../components/admin/ImpersonationContext';

export default function Consulenze() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const { impersonation } = useImpersonation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (impersonation.active && impersonation.role === 'user') {
          const impersonatedUser = await base44.entities.User.filter({ id: impersonation.targetId });
          if (impersonatedUser.length > 0) {
            setEffectiveUser(impersonatedUser[0]);
          } else {
            setEffectiveUser(currentUser);
          }
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, [impersonation.active, impersonation.targetId]);

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['my-bookings', effectiveUser?.email],
    queryFn: () => base44.entities.ConsultationBooking.filter({ user_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const bookConsultationMutation = useMutation({
    mutationFn: async ({ consultantId, message }) => {
      const consultant = consultants.find(c => c.id === consultantId);
      
      // Create booking
      await base44.entities.ConsultationBooking.create({
        consultant_id: consultantId,
        user_email: effectiveUser.email,
        subject: message,
        status: 'pending'
      });
      
      // Decrement available slots
      await base44.entities.Consultant.update(consultantId, {
        available_slots: (consultant.available_slots || 100) - 1
      });
      
      // Update user's used consultations
      const usedConsultations = effectiveUser.consulenze_usate || [];
      await base44.auth.updateMe({
        consulenze_usate: [...usedConsultations, consultantId]
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      
      // Clear the message field
      setConsultationMessages(prev => ({
        ...prev,
        [variables.consultantId]: ''
      }));
      
      // Reload user data
      base44.auth.me().then((updatedUser) => {
        setUser(updatedUser);
        setEffectiveUser(updatedUser);
      });
    }
  });

  const hasUsedConsultant = (consultantId) => {
    return effectiveUser?.consulenze_usate?.includes(consultantId) || false;
  };

  const usedCount = effectiveUser?.consulenze_usate?.length || 0;
  const totalConsultants = CONSULTANT_CATEGORIES.length;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">
            {isAdmin ? 'GESTIONE CONSULENZE' : isConsultant ? 'LE MIE RICHIESTE' : 'CONSULENZE e PREVENTIVI'}
          </h1>
        </div>

        {isAdmin && <AdminView consultants={consultants} />}
        {isConsultant && <ConsultantView user={effectiveUser} />}
        {isMember && <MemberView user={effectiveUser} consultants={consultants} isLoading={isLoading} />}
      </main>

      <BottomNav currentPage="Consulenze" unreadMessages={messages.length} />
    </div>
  );
}