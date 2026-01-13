import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Building2, Phone, FileText, MapPin } from 'lucide-react';
import { useImpersonation } from '../components/admin/ImpersonationContext';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { impersonation, setCurrentUserRole } = useImpersonation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    email: '',
    vat_number: '',
    codice_sdi: '',
    referente: '',
    cellulare_referente: '',
    whatsapp_referente: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    company_size: 'Piccola'
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setCurrentUserRole(currentUser.role);
        let effectiveUser = currentUser;

        // Se appMode === 'user-preview', carica l'utente impersonato via previewUserId
        if (impersonation.active && impersonation.previewUserId && impersonation.role === 'user') {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          if (users.length > 0) {
            effectiveUser = users[0];
          }
        }

        setUser(effectiveUser);
        
        // Pre-compila con dati esistenti
        setFormData({
          company_name: effectiveUser.company_name || '',
          phone: effectiveUser.phone || '',
          email: effectiveUser.email || '',
          vat_number: effectiveUser.vat_number || '',
          codice_sdi: effectiveUser.codice_sdi || '',
          referente: effectiveUser.referente || '',
          cellulare_referente: effectiveUser.cellulare_referente || '',
          whatsapp_referente: effectiveUser.whatsapp_referente || '',
          address: effectiveUser.address || '',
          city: effectiveUser.city || '',
          province: effectiveUser.province || '',
          postal_code: effectiveUser.postal_code || '',
          company_size: effectiveUser.company_size || 'Piccola'
        });
        
        setLoading(false);
      } catch (e) {
        console.error(e);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [impersonation.active, impersonation.previewUserId, impersonation.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Se appMode === 'user-preview', aggiorna l'utente impersonato
      if (impersonation.active && impersonation.previewUserId && impersonation.role === 'user') {
        await base44.entities.User.update(impersonation.previewUserId, {
          ...formData,
          profile_completed: true
        });
      } else {
        // Altrimenti aggiorna l'utente corrente
        await base44.auth.updateMe({
          ...formData,
          profile_completed: true
        });
      }
      
      navigate(createPageUrl('Home'));
    } catch (error) {
      alert('Errore durante il salvataggio del profilo');
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-lime-400 rounded-t-lg">
            <CardTitle className="text-slate-900 text-xl flex items-center gap-2">
              <User className="w-6 h-6" />
              Completa il tuo Profilo
            </CardTitle>
            <p className="text-slate-700 text-sm mt-2">
              Per accedere alla piattaforma, completa i dati richiesti
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dati Azienda */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-lime-400" />
                  Dati Azienda
                </h3>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Nome Azienda *"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  
                  <Input
                    placeholder="Partita IVA *"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  
                  <Input
                    placeholder="Codice SDI"
                    value={formData.codice_sdi}
                    onChange={(e) => setFormData({...formData, codice_sdi: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  
                  <Select
                    value={formData.company_size}
                    onValueChange={(value) => setFormData({...formData, company_size: value})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Dimensione Azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Micro">Micro (0-9 dipendenti)</SelectItem>
                      <SelectItem value="Piccola">Piccola (10-49 dipendenti)</SelectItem>
                      <SelectItem value="Media">Media (50-249 dipendenti)</SelectItem>
                      <SelectItem value="Grande">Grande (250+ dipendenti)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contatti */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Phone className="w-5 h-5 text-lime-400" />
                  Contatti
                </h3>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Telefono Aziendale *"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  
                  <Input
                    placeholder="Email Aziendale *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  
                  <Input
                    placeholder="Nome Referente *"
                    value={formData.referente}
                    onChange={(e) => setFormData({...formData, referente: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  
                  <Input
                    placeholder="Cellulare Referente *"
                    value={formData.cellulare_referente}
                    onChange={(e) => setFormData({...formData, cellulare_referente: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  
                  <Input
                    placeholder="WhatsApp Referente *"
                    value={formData.whatsapp_referente}
                    onChange={(e) => setFormData({...formData, whatsapp_referente: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              {/* Sede */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-lime-400" />
                  Sede Legale
                </h3>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Indirizzo"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Città *"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      required
                    />
                    
                    <Input
                      placeholder="Provincia"
                      value={formData.province}
                      onChange={(e) => setFormData({...formData, province: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      maxLength={2}
                    />
                  </div>
                  
                  <Input
                    placeholder="CAP"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>

              <Button 
                type="submit"
                disabled={saving}
                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 text-lg py-6"
              >
                {saving ? 'Salvataggio...' : 'Completa Profilo'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}