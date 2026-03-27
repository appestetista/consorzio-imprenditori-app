import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Limiti per tipo di azione (mensili di default, settimanali se specificato)
export const AI_LIMITS = {
  contract_analysis: 5,
  contract_comparison: 2,
  export_analysis: 5,
  import_analysis: 5,
  grant_match: 5
};

// Tipi con limite settimanale invece che mensile
export const WEEKLY_LIMITS = [];

export const AI_LIMIT_LABELS = {
  contract_analysis: 'Analisi Contratti',
  contract_comparison: 'Confronto Contratti',
  export_analysis: 'Analisi Export',
  import_analysis: 'Analisi Import',
  grant_match: 'Match Bandi Profilo'
};

export function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export function useAILimits(userEmail, actionType, userData = null) {
  const isWeekly = WEEKLY_LIMITS.includes(actionType);
  const periodKey = isWeekly ? getCurrentWeekKey() : getCurrentMonthYear();

  const { data: usageCount = 0, refetch } = useQuery({
    queryKey: ['ai-usage', userEmail, actionType, periodKey],
    queryFn: async () => {
      if (!userEmail) return 0;
      const logs = await base44.entities.UsageLog.filter({
        user_email: userEmail,
        action_type: actionType,
        month_year: periodKey
      });
      return logs.length;
    },
    enabled: !!userEmail && !!actionType,
  });

  // Limiti personalizzati dall'entity User (gestiti da admin in GestioneMembri)
  const customLimit = userData?.ai_limits_override?.[actionType];
  const limit = customLimit ?? AI_LIMITS[actionType] ?? 0;
  const remaining = Math.max(0, limit - usageCount);
  const isLimitReached = usageCount >= limit;

  const trackUsage = async (meta) => {
    if (!userEmail || isLimitReached) return null;
    
    const record = {
      user_email: userEmail,
      action_type: actionType,
      month_year: periodKey
    };
    if (meta?.search_label) record.search_label = meta.search_label;
    if (meta?.search_meta) record.search_meta = meta.search_meta;
    
    const created = await base44.entities.UsageLog.create(record);
    
    refetch();
    return created?.id || true;
  };

  return {
    usageCount,
    limit,
    remaining,
    isLimitReached,
    isWeekly,
    trackUsage,
    refetch
  };
}