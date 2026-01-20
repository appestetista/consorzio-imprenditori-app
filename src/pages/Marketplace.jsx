import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, ShoppingBag, Tag, User, X, Upload, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const CATEGORIES = [
  "Ricerca Personale",
  "Acquisto",
  "Vendo",
  "Affitto",
  "Ricerca Immobile",
  "Ricerca Collaborazione",
  "Ricerca Materiale",
  "Ricerca Mezzo per Logistica"
];

export default function Marketplace() {
  const [user, setUser] = useState(null);
  const [showAddAd, setShowAddAd] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newAd, setNewAd] = useState({ title: '', description: '', category: '', price: '', contact_phone: '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [deleteAdId, setDeleteAdId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['marketplace-ads'],
    queryFn: () => base44.entities.MarketplaceAd.filter({ is_active: true }, '-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const handleImageUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (isEdit) {
        setEditingAd({ ...editingAd, image_url: file_url });
      } else {
        setNewAd({ ...newAd, image_url: file_url });
      }
    } catch (error) {
      console.error('Errore upload immagine:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const createAdMutation = useMutation({
    mutationFn: async (adData) => {
      return base44.entities.MarketplaceAd.create({
        ...adData,
        contact_email: user.email,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-ads'] });
      setShowAddAd(false);
      setNewAd({ title: '', description: '', category: '', price: '', contact_phone: '', image_url: '' });
    }
  });

  const updateAdMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.MarketplaceAd.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-ads'] });
      setEditingAd(null);
    }
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.MarketplaceAd.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-ads'] });
      setDeleteAdId(null);
    }
  });

  const filteredAds = selectedCategory === 'all' 
    ? ads 
    : ads.filter(ad => ad.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-white text-xl font-bold">Marketplace</h1>
          </div>
          
          <Dialog open={showAddAd} onOpenChange={setShowAddAd}>
            <DialogTrigger asChild>
              <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                <Plus className="w-5 h-5 mr-1" />
                Inserisci
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Nuovo Annuncio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Prima scegli la categoria */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo di annuncio *</Label>
                  <Select
                    value={newAd.category}
                    onValueChange={(value) => setNewAd({...newAd, category: value, image_url: '', price: ''})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Form dinamico in base alla categoria */}
                {newAd.category && (
                  <>
                    {/* RICERCA PERSONALE */}
                    {newAd.category === 'Ricerca Personale' && (
                      <>
                        <Input
                          placeholder="Figura ricercata (es. Magazziniere, Segretaria...) *"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Select
                          value={newAd.tipo_contratto || ''}
                          onValueChange={(value) => setNewAd({...newAd, tipo_contratto: value})}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                            <SelectValue placeholder="Tipo di contratto *" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tempo_indeterminato">Tempo indeterminato</SelectItem>
                            <SelectItem value="tempo_determinato">Tempo determinato</SelectItem>
                            <SelectItem value="apprendistato">Apprendistato</SelectItem>
                            <SelectItem value="stage">Stage / Tirocinio</SelectItem>
                            <SelectItem value="partita_iva">Partita IVA</SelectItem>
                            <SelectItem value="collaborazione">Collaborazione occasionale</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={newAd.orario_lavoro || ''}
                          onValueChange={(value) => setNewAd({...newAd, orario_lavoro: value})}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                            <SelectValue placeholder="Orario di lavoro *" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">Full-time</SelectItem>
                            <SelectItem value="part_time_mattina">Part-time mattina</SelectItem>
                            <SelectItem value="part_time_pomeriggio">Part-time pomeriggio</SelectItem>
                            <SelectItem value="turni">Su turni</SelectItem>
                            <SelectItem value="flessibile">Orario flessibile</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Sede di lavoro (città/zona) *"
                          value={newAd.sede_lavoro || ''}
                          onChange={(e) => setNewAd({...newAd, sede_lavoro: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione del ruolo e mansioni principali *"
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Textarea
                          placeholder="Requisiti richiesti (es. esperienza, titolo di studio...)"
                          value={newAd.requisiti || ''}
                          onChange={(e) => setNewAd({...newAd, requisiti: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={2}
                        />
                        <div className="border-t border-slate-700 pt-3 mt-2">
                          <p className="text-slate-400 text-xs mb-2">Campi opzionali (riservati)</p>
                          <Input
                            placeholder="RAL offerta (€) - opzionale"
                            type="number"
                            value={newAd.ral || ''}
                            onChange={(e) => setNewAd({...newAd, ral: e.target.value})}
                            className="bg-slate-900 border-slate-700 text-white"
                          />
                        </div>
                        <Input
                          placeholder="Benefit offerti (es. auto, buoni pasto...) - opzionale"
                          value={newAd.benefit || ''}
                          onChange={(e) => setNewAd({...newAd, benefit: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* VENDO */}
                    {newAd.category === 'Vendo' && (
                      <>
                        <Input
                          placeholder="Cosa vendi? (es. Macchinario, Attrezzatura...)"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione, condizioni, anno, caratteristiche..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Input
                          placeholder="Prezzo di vendita (€)"
                          type="number"
                          value={newAd.price}
                          onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* ACQUISTO */}
                    {newAd.category === 'Acquisto' && (
                      <>
                        <Input
                          placeholder="Cosa cerchi di acquistare?"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione, caratteristiche richieste..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Input
                          placeholder="Budget massimo (€) - opzionale"
                          type="number"
                          value={newAd.price}
                          onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* AFFITTO */}
                    {newAd.category === 'Affitto' && (
                      <>
                        <Input
                          placeholder="Cosa offri in affitto? (es. Capannone, Ufficio...)"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione, metratura, posizione, caratteristiche..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Input
                          placeholder="Canone mensile (€)"
                          type="number"
                          value={newAd.price}
                          onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* RICERCA IMMOBILE */}
                    {newAd.category === 'Ricerca Immobile' && (
                      <>
                        <Input
                          placeholder="Tipo di immobile cercato (es. Capannone, Ufficio...)"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione, zona preferita, metratura richiesta..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Input
                          placeholder="Budget massimo (€/mese) - opzionale"
                          type="number"
                          value={newAd.price}
                          onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* RICERCA COLLABORAZIONE */}
                    {newAd.category === 'Ricerca Collaborazione' && (
                      <>
                        <Input
                          placeholder="Tipo di collaborazione cercata"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione della collaborazione, settore, obiettivi..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={4}
                        />
                      </>
                    )}

                    {/* RICERCA MATERIALE */}
                    {newAd.category === 'Ricerca Materiale' && (
                      <>
                        <Input
                          placeholder="Materiale ricercato"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione, quantità, specifiche tecniche..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Input
                          placeholder="Budget disponibile (€) - opzionale"
                          type="number"
                          value={newAd.price}
                          onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* RICERCA MEZZO PER LOGISTICA */}
                    {newAd.category === 'Ricerca Mezzo per Logistica' && (
                      <>
                        <Input
                          placeholder="Tipo di mezzo cercato (es. Furgone, Camion...)"
                          value={newAd.title}
                          onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrizione, tratte, frequenza, capacità richiesta..."
                          value={newAd.description}
                          onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                          rows={3}
                        />
                        <Input
                          placeholder="Budget disponibile (€) - opzionale"
                          type="number"
                          value={newAd.price}
                          onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </>
                    )}

                    {/* Image Upload - Per tutte le categorie */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Foto (opzionale)</Label>
                      <div className="flex flex-col gap-3">
                        {newAd.image_url ? (
                          <div className="relative rounded-lg overflow-hidden border border-slate-700">
                            <img 
                              src={newAd.image_url} 
                              alt="Prodotto" 
                              className="w-full h-48 object-cover"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={() => setNewAd({...newAd, image_url: ''})}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Label 
                            htmlFor="ad-image" 
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                          >
                            {uploadingImage ? (
                              <div className="text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-sm text-slate-400">Caricamento...</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-300">Carica foto</p>
                                <p className="text-xs text-slate-500">PNG, JPG (max 5MB)</p>
                              </>
                            )}
                            <Input
                              id="ad-image"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, false)}
                              disabled={uploadingImage}
                            />
                          </Label>
                        )}
                      </div>
                    </div>

                    {/* Telefono - Sempre visibile */}
                    <Input
                      placeholder="Telefono di contatto"
                      value={newAd.contact_phone}
                      onChange={(e) => setNewAd({...newAd, contact_phone: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />

                    <Button 
                      onClick={() => createAdMutation.mutate(newAd)}
                      disabled={createAdMutation.isPending || uploadingImage || !newAd.title || !newAd.category}
                      className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                    >
                      {createAdMutation.isPending ? 'Pubblicazione...' : 'Pubblica Annuncio'}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filter */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className={selectedCategory === 'all' 
                ? 'bg-lime-400 text-slate-900' 
                : 'border-slate-600 text-slate-300'}
            >
              Tutti
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat 
                  ? 'bg-lime-400 text-slate-900' 
                  : 'border-slate-600 text-slate-300'}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessun annuncio disponibile</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAds.map((ad) => (
              <Card key={ad.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                {ad.image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={ad.image_url} 
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-lg">{ad.title}</CardTitle>
                    {ad.price && (
                      <Badge className="bg-lime-400 text-slate-900">
                        €{ad.price}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="w-fit border-lime-400/30 text-lime-400">
                    <Tag className="w-3 h-3 mr-1" />
                    {ad.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {ad.description && (
                    <p className="text-slate-400 text-sm mb-3">{ad.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <User className="w-4 h-4 text-lime-400" />
                    <span>{ad.contact_email}</span>
                  </div>
                  {ad.contact_phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 bg-lime-400 hover:bg-lime-500 text-slate-900 border-0"
                      onClick={() => window.open(`tel:${ad.contact_phone}`)}
                    >
                      Chiama: {ad.contact_phone}
                    </Button>
                  )}
                  
                  {/* Azioni per il proprietario dell'annuncio */}
                  {ad.contact_email === user?.email && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => setEditingAd(ad)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Modifica
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                        onClick={() => setDeleteAdId(ad.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Elimina
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog Modifica Annuncio */}
        <Dialog open={!!editingAd} onOpenChange={(open) => !open && setEditingAd(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Modifica Annuncio</DialogTitle>
            </DialogHeader>
            {editingAd && (
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Titolo"
                  value={editingAd.title}
                  onChange={(e) => setEditingAd({...editingAd, title: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Textarea
                  placeholder="Descrizione"
                  value={editingAd.description || ''}
                  onChange={(e) => setEditingAd({...editingAd, description: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={3}
                />
                <Input
                  placeholder="Prezzo (€) - opzionale"
                  type="number"
                  value={editingAd.price || ''}
                  onChange={(e) => setEditingAd({...editingAd, price: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Input
                  placeholder="Telefono di contatto"
                  value={editingAd.contact_phone || ''}
                  onChange={(e) => setEditingAd({...editingAd, contact_phone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                
                {/* Foto */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Foto (opzionale)</Label>
                  <div className="flex flex-col gap-3">
                    {editingAd.image_url ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-700">
                        <img 
                          src={editingAd.image_url} 
                          alt="Prodotto" 
                          className="w-full h-48 object-cover"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setEditingAd({...editingAd, image_url: ''})}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Label 
                        htmlFor="edit-ad-image" 
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                      >
                        {uploadingImage ? (
                          <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm text-slate-400">Caricamento...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-300">Carica foto</p>
                            <p className="text-xs text-slate-500">PNG, JPG (max 5MB)</p>
                          </>
                        )}
                        <Input
                          id="edit-ad-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, true)}
                          disabled={uploadingImage}
                        />
                      </Label>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300"
                    onClick={() => setEditingAd(null)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={() => updateAdMutation.mutate({ id: editingAd.id, data: editingAd })}
                    disabled={updateAdMutation.isPending || uploadingImage || !editingAd.title}
                    className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    {updateAdMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Alert Dialog Elimina */}
        <AlertDialog open={!!deleteAdId} onOpenChange={(open) => !open && setDeleteAdId(null)}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Eliminare l'annuncio?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Questa azione non può essere annullata. L'annuncio verrà rimosso definitivamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deleteAdMutation.mutate(deleteAdId)}
              >
                {deleteAdMutation.isPending ? 'Eliminazione...' : 'Elimina'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <BottomNav currentPage="Marketplace" unreadMessages={messages.length} />
    </div>
  );
}