import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, MapPin, Building2, Users, Search, MessageCircle, User, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MembersDirectory() {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['members-directory'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      // Filtra admin e utenti di test
      return users.filter(u => 
        u.role !== 'admin' && 
        !u.full_name?.toLowerCase().includes('pinko pallino') &&
        !u.company_name?.toLowerCase().includes('pinko pallino')
      );
    }
  });

  // Raggruppa utenti per città/provincia
  const groupedMembers = useMemo(() => {
    const filtered = allUsers.filter(user => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        user.company_name?.toLowerCase().includes(search) ||
        user.full_name?.toLowerCase().includes(search) ||
        user.city?.toLowerCase().includes(search) ||
        user.province?.toLowerCase().includes(search)
      );
    });

    // Prima raggruppa per città
    const byCity = {};
    const byProvince = {};

    filtered.forEach(user => {
      const city = user.city?.trim() || 'Non specificata';
      const province = user.province?.trim()?.toUpperCase() || 'N/A';

      if (!byCity[city]) {
        byCity[city] = { users: [], province };
      }
      byCity[city].users.push(user);

      if (!byProvince[province]) {
        byProvince[province] = { users: [], cities: {} };
      }
      byProvince[province].users.push(user);
      if (!byProvince[province].cities[city]) {
        byProvince[province].cities[city] = [];
      }
      byProvince[province].cities[city].push(user);
    });

    // Determina quali mostrare per città (>=10) e quali per provincia (<10)
    const result = {
      byCities: {}, // Città con 10+ membri
      byProvinces: {} // Province che raggruppano città con <10 membri
    };

    // Controlla ogni città
    Object.entries(byCity).forEach(([city, data]) => {
      if (data.users.length >= 10) {
        // Mostra per città
        result.byCities[city] = data;
      }
    });

    // Per le città con meno di 10, raggruppa per provincia
    Object.entries(byProvince).forEach(([province, data]) => {
      // Filtra solo utenti di città con meno di 10 membri
      const usersInSmallCities = data.users.filter(user => {
        const city = user.city?.trim() || 'Non specificata';
        return !result.byCities[city]; // Non è già mostrata come città grande
      });

      if (usersInSmallCities.length > 0) {
        result.byProvinces[province] = {
          users: usersInSmallCities,
          cities: {}
        };
        // Organizza per sotto-città
        usersInSmallCities.forEach(user => {
          const city = user.city?.trim() || 'Non specificata';
          if (!result.byProvinces[province].cities[city]) {
            result.byProvinces[province].cities[city] = [];
          }
          result.byProvinces[province].cities[city].push(user);
        });
      }
    });

    return result;
  }, [allUsers, searchTerm]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const totalMembers = allUsers.length;
  const totalCities = Object.keys(groupedMembers.byCities).length;
  const totalProvinces = Object.keys(groupedMembers.byProvinces).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-lime-400" />
          Membri del Consorzio ({totalMembers})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Ricerca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cerca per nome, azienda, città..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white pl-10 text-sm"
          />
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {totalCities} città (10+ membri)
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {totalProvinces} province
          </Badge>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {/* Città con 10+ membri */}
          {Object.entries(groupedMembers.byCities)
            .sort((a, b) => b[1].users.length - a[1].users.length)
            .map(([city, data]) => (
              <div key={`city-${city}`} className="bg-slate-900 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(`city-${city}`)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedGroups[`city-${city}`] ? (
                      <ChevronDown className="w-4 h-4 text-lime-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <MapPin className="w-4 h-4 text-lime-400" />
                    <span className="text-white font-medium text-sm">{city}</span>
                    {data.province && (
                      <span className="text-slate-500 text-xs">({data.province})</span>
                    )}
                  </div>
                  <Badge className="bg-lime-400/20 text-lime-400 text-xs">
                    {data.users.length}
                  </Badge>
                </button>
                
                {expandedGroups[`city-${city}`] && (
                  <div className="px-3 pb-3 space-y-2">
                    {data.users.map(user => (
                      <MemberCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* Province (città con <10 membri) */}
          {Object.entries(groupedMembers.byProvinces)
            .sort((a, b) => b[1].users.length - a[1].users.length)
            .map(([province, data]) => (
              <div key={`province-${province}`} className="bg-slate-900 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(`province-${province}`)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedGroups[`province-${province}`] ? (
                      <ChevronDown className="w-4 h-4 text-lime-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-white font-medium text-sm">Provincia di {province}</span>
                  </div>
                  <Badge className="bg-amber-400/20 text-amber-400 text-xs">
                    {data.users.length}
                  </Badge>
                </button>
                
                {expandedGroups[`province-${province}`] && (
                  <div className="px-3 pb-3 space-y-3">
                    {Object.entries(data.cities)
                      .sort((a, b) => b[1].length - a[1].length)
                      .map(([city, users]) => (
                        <div key={city} className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <MapPin className="w-3 h-3" />
                            {city} ({users.length})
                          </div>
                          {users.map(user => (
                            <MemberCard key={user.id} user={user} compact />
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}

          {Object.keys(groupedMembers.byCities).length === 0 && 
           Object.keys(groupedMembers.byProvinces).length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">
              Nessun membro trovato
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MemberCard({ user, compact = false }) {
  return (
    <div className={`bg-slate-800 rounded-lg ${compact ? 'p-2' : 'p-3'} flex items-center gap-3`}>
      {user.logo_url ? (
        <img 
          src={user.logo_url} 
          alt={user.company_name} 
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded object-cover flex-shrink-0`}
        />
      ) : (
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded bg-slate-700 flex items-center justify-center flex-shrink-0`}>
          <Building2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-slate-500`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-white font-medium ${compact ? 'text-xs' : 'text-sm'} truncate`}>
          {user.company_name || user.full_name || 'N/A'}
        </p>
        {!compact && user.full_name && user.company_name && (
          <p className="text-slate-400 text-xs truncate">{user.full_name}</p>
        )}
      </div>
    </div>
  );
}