import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Limiti mensili per tipo di azione
export const AI_LIMITS = {
  contract_analysis: 50,
  export_analysis: 20,
  import_analysis: 20,
  grant_recommendations: 10
};

export const AI_LIMIT_LABELS = {
  contract_analysis: 'Analisi Contratti',
  export_analysis: 'Analisi Export',
  import_analysis: 'Analisi Import',
  grant_recommendations: 'Raccomandazioni Bandi'
};

export function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useAILimits(userEmail, actionType) {
  const monthYear = getCurrentMonthYear();

  const { data: usageCount = 0, refetch } = useQuery({
    queryKey: ['ai-usage', userEmail, actionType, monthYear],
    queryFn: async () => {
      const logs = await base44.entities.UsageLog.filter({
        user_email: userEmail,
        action_type: actionType,
        month_year: monthYear
      });
      return logs.length;
    },
    enabled: !!userEmail && !!actionType,
  });

  const limit = AI_LIMITS[actionType] || 0;
  const remaining = Math.max(0, limit - usageCount);
  const isLimitReached = usageCount >= limit;

  const trackUsage = async () => {
    if (isLimitReached) return false;
    
    await base44.entities.UsageLog.create({
      user_email: userEmail,
      action_type: actionType,
      month_year: monthYear
    });
    
    refetch();
    return true;
  };

  return {
    usageCount,
    limit,
    remaining,
    isLimitReached,
    trackUsage,
    refetch
  };
}