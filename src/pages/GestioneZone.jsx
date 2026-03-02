import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { ArrowLeft, MapPin } from 'lucide-react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import ZoneManagerSimple from '../components/admin/ZoneManagerSimple';

export default function GestioneZone() {
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl('Home'));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  if (!user) return null;

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