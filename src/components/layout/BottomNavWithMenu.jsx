import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { X, User, Phone, LogOut, Settings, XCircle, Crown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImpersonation } from '../admin/ImpersonationContext';
import { isUserConsultant } from '../utils/normalizeUser';
import BottomNav from './BottomNav';

export default function BottomNavWithMenu({ currentPage, activeTab = null, unreadMessages = 0 }) {
  return (
    <BottomNav 
      currentPage={currentPage} 
      activeTab={activeTab}
      unreadMessages={unreadMessages} 
      onMenuOpen={() => window.location.href = createPageUrl('MyProfile')} 
      menuOpen={false}
      hideBackground={currentPage === 'Home'}
    />
  );
}