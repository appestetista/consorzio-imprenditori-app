import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function KnowledgeBaseGenerator() {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: kbRecords = [] } = useQuery({
    queryKey: ['kb-count'],
    queryFn: () => base44.entities.KnowledgeBase.list()
  });

  const hasExisting = kbRecords.length >= 10;

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('populateKnowledgeBase', {});
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['kb-count'] });
    } catch (err) {
      setResult({ error: err?.message || 'Errore sconosciuto' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-[#d4af37]" />
        <h3 className="text-white font-semibold text-sm">Knowledge Base Normativa</h3>
      </div>

      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
        <p className="text-slate-400 text-xs mb-2">
          Record attuali: <span className="text-white font-semibold">{kbRecords.length}</span>
        </p>

        {generating ? (
          <div className="flex items-center gap-3 py-3">
            <Loader2 className="w-5 h-5 text-[#d4af37] animate-spin" />
            <div>
              <p className="text-[#d4af37] text-sm font-medium">Generazione in corso...</p>
              <p className="text-slate-500 text-xs">15 schede normative. Circa 3-5 minuti.</p>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-2">
            {result.error ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">{result.error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Creati {result.created}/{result.total} record</span>
              </div>
            )}
            {result.results?.filter(r => r.status === 'error').length > 0 && (
              <div className="text-xs text-red-400 space-y-1">
                {result.results.filter(r => r.status === 'error').map((r, i) => (
                  <p key={i}>❌ {r.tema}: {r.error}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full bg-[#d4af37] hover:bg-[#b8860b] text-slate-900 font-semibold">
                <BookOpen className="w-4 h-4 mr-2" />
                Genera Knowledge Base
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  {hasExisting ? `KB esistente (${kbRecords.length} record). Rigenerare?` : 'Genera Knowledge Base'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Genero 15 schede normative verificate con dati cercati su internet da fonti istituzionali. Circa 3-5 minuti.
                  {hasExisting && ' I nuovi record si aggiungeranno a quelli esistenti.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                <AlertDialogAction className="bg-[#d4af37] hover:bg-[#b8860b] text-slate-900" onClick={handleGenerate}>
                  Genera
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}