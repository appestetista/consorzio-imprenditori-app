import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, FileText, Users, Scale, Save, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const REGIONI_ITALIA = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
];

const FORME_GIURIDICHE = [
  'Ditta individuale',
  'S.r.l.',
  'S.r.l.s.',
  'S.p.A.',
  'S.n.c.',
  'S.a.s.',
  'Cooperativa',
  'Consorzio',
  'Associazione',
  'Altro'
];

const SETTORI = [
  'Agricoltura e Agroalimentare',
  'Artigianato',
  'Commercio',
  'Costruzioni ed Edilizia',
  'Cultura e Turismo',
  'Energia e Ambiente',
  'Industria Manifatturiera',
  'Logistica e Trasporti',
  'Servizi alle Imprese',
  'Servizi alla Persona',
  'Tecnologia e Innovazione',
  'Altro'
];

export default function ProfiloBandi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    company_size: '',
    region: '',
    ateco_code: '',
    legal_form: '',
    sector: '',
    years_activity: '',
    has_export: false,
    interested_in_digital: false,
    interested_in_sustainability: false,
    interested_in_innovation: false
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData({
          company_size: currentUser.company_size || '',
          region: currentUser.region || '',
          ateco_code: currentUser.ateco_code || '',
          legal_form: currentUser.legal_form || '',
          sector: currentUser.sector || '',
          years_activity: currentUser.years_activity || '',
          has_export: currentUser.has_export || false,
          interested_in_digital: currentUser.interested_in_digital || false,
          interested_in_sustainability: currentUser.interested_in_sustainability || false,
          interested_in_innovation: currentUser.interested_in_innovation || false
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return base44.auth.updateMe(data);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => {
        navigate(createPageUrl('FinanziamentiAgevolati'));
      }, 1500);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('FinanziamentiAgevolati')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-white text-xl font-bold">Profilo Bandi</h1>
            <p className="text-slate-400 text-sm">Configura per ricevere bandi mirati</p>
          </div>
        </div>

        {saved && (
          <Alert className="mb-6 bg-green-500/20 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              Profilo salvato! Reindirizzamento ai bandi...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dati Aziendali */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dati Aziendali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">Dimensione Azienda *</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => setFormData({...formData, company_size: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona dimensione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Micro">Micro (fino a 10 dipendenti)</SelectItem>
                    <SelectItem value="Piccola">Piccola (10-50 dipendenti)</SelectItem>
                    <SelectItem value="Media">Media (50-250 dipendenti)</SelectItem>
                    <SelectItem value="Grande">Grande (oltre 250 dipendenti)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Forma Giuridica</Label>
                <Select
                  value={formData.legal_form}
                  onValueChange={(value) => setFormData({...formData, legal_form: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona forma giuridica" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORME_GIURIDICHE.map((forma) => (
                      <SelectItem key={forma} value={forma}>{forma}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Anni di Attività</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.years_activity}
                  onChange={(e) => setFormData({...formData, years_activity: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Localizzazione */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localizzazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-slate-300 text-sm">Regione Sede Legale *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({...formData, region: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona regione" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONI_ITALIA.map((regione) => (
                      <SelectItem key={regione} value={regione}>{regione}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Settore e Codice ATECO */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Settore di Attività
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">Settore Principale</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => setFormData({...formData, sector: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona settore" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTORI.map((settore) => (
                      <SelectItem key={settore} value={settore}>{settore}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Codice ATECO</Label>
                <Input
                  value={formData.ateco_code}
                  onChange={(e) => setFormData({...formData, ateco_code: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 62.01.00"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Codice di classificazione attività economica
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interessi */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Aree di Interesse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-400 text-sm mb-3">
                Seleziona le aree per cui cerchi finanziamenti:
              </p>
              
              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_digital}
                  onChange={(e) => setFormData({...formData, interested_in_digital: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Digitalizzazione</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_innovation}
                  onChange={(e) => setFormData({...formData, interested_in_innovation: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Innovazione e R&S</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_sustainability}
                  onChange={(e) => setFormData({...formData, interested_in_sustainability: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Sostenibilità e Ambiente</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_export}
                  onChange={(e) => setFormData({...formData, has_export: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Export e Internazionalizzazione</span>
              </label>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saveMutation.isPending || !formData.company_size || !formData.region}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 py-6 text-lg font-bold"
          >
            {saveMutation.isPending ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salva Profilo Bandi
              </>
            )}
          </Button>
        </form>
      </main>

      <BottomNav currentPage="FinanziamentiAgevolati" />
    </div>
  );
}