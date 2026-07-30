export function determineActualPlan(plan: string, createdAt?: string, planExpiresAt?: string): string {
  if (plan === 'basic' && createdAt) {
    const created = new Date(createdAt).getTime();
    if (planExpiresAt) {
      const expires = new Date(planExpiresAt).getTime();
      const diffDays = Math.round((expires - created) / (1000 * 60 * 60 * 24));
      if (diffDays <= 5) return 'trial';
    } else {
      const diffToNow = Math.round((Date.now() - created) / (1000 * 60 * 60 * 24));
      if (diffToNow <= 5) return 'trial';
    }
  }
  return plan || 'trial';
}