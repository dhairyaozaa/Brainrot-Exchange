export function formatCash(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '₹0.00';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
  return `₹${n.toFixed(2)}`;
}

export function formatVolume(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(2)}%`;
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'Low': return 'text-brainrot-accent';
    case 'Medium': return 'text-brainrot-yellow';
    case 'High': return 'text-brainrot-orange';
    case 'Extreme': return 'text-brainrot-red';
    case 'Financial Suicide': return 'text-brainrot-pink';
    default: return 'text-brainrot-muted';
  }
}

export function getRiskBg(risk: string): string {
  switch (risk) {
    case 'Low': return 'bg-green-900/50 text-brainrot-accent';
    case 'Medium': return 'bg-yellow-900/50 text-brainrot-yellow';
    case 'High': return 'bg-orange-900/50 text-brainrot-orange';
    case 'Extreme': return 'bg-red-900/50 text-brainrot-red';
    case 'Financial Suicide': return 'bg-purple-900/50 text-brainrot-pink';
    default: return 'bg-brainrot-dark text-brainrot-muted';
  }
}

export function getFollowerCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
