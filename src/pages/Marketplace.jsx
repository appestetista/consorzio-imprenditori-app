import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, ShoppingBag, Tag, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [newAd, setNewAd] = useState({ title: '', description: '', category: '', price: '', contact_phone: '' });
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
      setNewAd({ title: '', description: '', category: '', price: '', contact_phone: '' });
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
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Nuovo Annuncio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Titolo annuncio"
                  value={newAd.title}
                  onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Select
                  value={newAd.category}
                  onValueChange={(value) => setNewAd({...newAd, category: value})}
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
                <Textarea
                  placeholder="Descrizione"
                  value={newAd.description}
                  onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Input
                  placeholder="Prezzo (opzionale)"
                  type="number"
                  value={newAd.price}
                  onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Input
                  placeholder="Telefono di contatto"
                  value={newAd.contact_phone}
                  onChange={(e) => setNewAd({...newAd, contact_phone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Button 
                  onClick={() => createAdMutation.mutate(newAd)}
                  disabled={createAdMutation.isPending || !newAd.title || !newAd.category}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                >
                  {createAdMutation.isPending ? 'Pubblicazione...' : 'Pubblica Annuncio'}
                </Button>
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
              <Card key={ad.id} className="bg-slate-800 border-slate-700">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav currentPage="Marketplace" unreadMessages={messages.length} />
    </div>
  );
}