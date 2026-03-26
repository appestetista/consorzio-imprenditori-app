import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { ArrowLeft, MapPin } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import ZoneManagerSimple from '../components/admin/ZoneManagerSimple';
import AdminGuard from '../components/admin/AdminGuard';

export default function GestioneZone() {
  return (
    <AdminGuard>
      {(user) => <GestioneZoneContent user={user} />}
    </AdminGuard>
  );
}

function GestioneZoneContent({ user }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(createPageUrl('AdminPanel'))} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Gestione Zone</h1>
            <p className="text-slate-400 text-xs">Zone, consulenti e utenti</p>
          </div>
        </div>

        <ZoneManagerSimple />
      </main>

      <BottomNav currentPage="AdminPanel" />
    </div>
  );
}