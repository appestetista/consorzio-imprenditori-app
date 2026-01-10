import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Building2, Phone, MapPin, Save } from 'lucide-react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData({
          full_name: currentUser.full_name || '',
          company_name: currentUser.company_name || '',
          phone: currentUser.phone || '',
          referente: currentUser.referente || '',
          cellulare_referente: currentUser.cellulare_referente || '',
          vat_number: currentUser.vat_number || '',
          address: currentUser.address || '',
          city: currentUser.city || '',
          province: currentUser.province || '',
          postal_code: currentUser.postal_code || '',
          ateco_code: currentUser.ateco_code || '',
          company_size: currentUser.company_size || 'Piccola'
        });
        setLoading(false);
      } catch (e) {
        console.error(e);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

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
            <Input
              placeholder="Nome Azienda"
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
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
                <SelectValue />
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
              placeholder="Telefono"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Nome Referente"
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
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-6">
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