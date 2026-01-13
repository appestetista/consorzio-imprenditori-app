import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Building2, Phone, MapPin, Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({});
  const { impersonation } = useImpersonation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        let effectiveUser = currentUser;

        // Se impersonation attiva, carica l'utente impersonato
        if (impersonation.active && impersonation.targetEmail) {
          const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
          if (users.length > 0) {
            effectiveUser = users[0];
          }
        }

        setUser(effectiveUser);
        setFormData({
          full_name: currentUser.full_name || '',
          company_name: currentUser.company_name || '',
          phone: currentUser.phone || '',
          website: currentUser.website || '',
          logo_url: currentUser.logo_url || '',
          referente: currentUser.referente || '',
          cellulare_referente: currentUser.cellulare_referente || '',
          referente_email: currentUser.referente_email || '',
          vat_number: currentUser.vat_number || '',
          address: currentUser.address || '',
          city: currentUser.city || '',
          province: currentUser.province || '',
          postal_code: currentUser.postal_code || '',
          ateco_code: currentUser.ateco_code || '',
          company_size: currentUser.company_size || 'Piccola',
          ragione_sociale_fatturazione: currentUser.ragione_sociale_fatturazione || '',
          partita_iva: currentUser.partita_iva || '',
          codice_fiscale: currentUser.codice_fiscale || '',
          codice_sdi: currentUser.codice_sdi || '',
          indirizzo: currentUser.indirizzo || '',
          citta: currentUser.citta || '',
          regione: currentUser.regione || '',
          cap: currentUser.cap || '',
          paese: currentUser.paese || ''
        });
        setLoading(false);
      } catch (e) {
        console.error(e);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
    } catch (error) {
      alert('Errore durante il caricamento del logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      alert('Profilo aggiornato con successo!');
    } catch (error) {
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Il Mio Profilo</h1>
        </div>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-lime-400" />
              Dati Personali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-slate-400 text-sm">Email</label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-slate-900 border-slate-700 text-slate-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm">Nome Completo</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm">Ruolo</label>
              <Input
                value={user?.role === 'admin' ? 'Amministratore' : 'Utente'}
                disabled
                className="bg-slate-900 border-slate-700 text-slate-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-lime-400" />
              Dati Azienda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-slate-400 text-sm">Logo Aziendale</label>
              <div className="mt-2 space-y-3">
                {formData.logo_url && (
                  <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({...formData, logo_url: ''})}
                      className="border-red-600 text-red-400"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rimuovi
                    </Button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 cursor-pointer hover:border-lime-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full"></div>
                      <span className="text-slate-400">Caricamento...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-lime-400" />
                      <span className="text-slate-300">Carica logo</span>
                    </>
                  )}
                </label>
              </div>
            </div>
            <Input
              placeholder="Nome Azienda"
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Sito Web"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Partita IVA"
              value={formData.vat_number}
              onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Codice ATECO"
              value={formData.ateco_code}
              onChange={(e) => setFormData({...formData, ateco_code: e.target.value})}
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
                <SelectItem value="Micro">Micro</SelectItem>
                <SelectItem value="Piccola">Piccola</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Grande">Grande</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-lime-400" />
              Contatti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Telefono Aziendale"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Nome Referente (se diverso)"
              value={formData.referente}
              onChange={(e) => setFormData({...formData, referente: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Cellulare Referente"
              value={formData.cellulare_referente}
              onChange={(e) => setFormData({...formData, cellulare_referente: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Email Referente"
              value={formData.referente_email}
              onChange={(e) => setFormData({...formData, referente_email: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-400" />
              Sede
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Indirizzo"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Città"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
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
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center justify-between">
              <span>Dati di Fatturazione (Opzionali)</span>
              <span className="text-slate-500 text-xs font-normal">Tutti i campi opzionali</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Ragione Sociale Fatturazione (se diversa)"
              value={formData.ragione_sociale_fatturazione}
              onChange={(e) => setFormData({...formData, ragione_sociale_fatturazione: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Partita IVA"
                value={formData.partita_iva}
                onChange={(e) => setFormData({...formData, partita_iva: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Input
                placeholder="Codice Fiscale"
                value={formData.codice_fiscale}
                onChange={(e) => setFormData({...formData, codice_fiscale: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Input
              placeholder="Codice SDI (Sistema Interscambio)"
              value={formData.codice_sdi}
              onChange={(e) => setFormData({...formData, codice_sdi: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Indirizzo Fatturazione"
              value={formData.indirizzo}
              onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Città"
                value={formData.citta}
                onChange={(e) => setFormData({...formData, citta: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Input
                placeholder="Provincia"
                value={formData.provincia}
                onChange={(e) => setFormData({...formData, provincia: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                maxLength={2}
              />
              <Input
                placeholder="CAP"
                value={formData.cap}
                onChange={(e) => setFormData({...formData, cap: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Regione"
                value={formData.regione}
                onChange={(e) => setFormData({...formData, regione: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Input
                placeholder="Paese"
                value={formData.paese}
                onChange={(e) => setFormData({...formData, paese: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 text-lg py-6"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Salvataggio...' : 'Salva Modifiche'}
        </Button>
      </main>

      <BottomNav currentPage="MyProfile" />
    </div>
  );
}