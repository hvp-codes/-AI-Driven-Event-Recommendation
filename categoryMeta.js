// Shared category -> color/icon/gradient mapping so cards, badges, and
// hero media all agree on what "tech" or "music" looks like.
const META = {
  tech: { emoji: '💻', gradient: 'linear-gradient(135deg,#4c50d6,#8b5cf6)' },
  music: { emoji: '🎵', gradient: 'linear-gradient(135deg,#c2278f,#f472b6)' },
  business: { emoji: '📈', gradient: 'linear-gradient(135deg,#b3720a,#f59e0b)' },
  art: { emoji: '🎨', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
  sports: { emoji: '🏃', gradient: 'linear-gradient(135deg,#0f9d58,#34d399)' },
  food: { emoji: '🍽️', gradient: 'linear-gradient(135deg,#d1590f,#fb923c)' },
};
const DEFAULT = { emoji: '✨', gradient: 'linear-gradient(135deg,#4c5fd5,#8b5cf6)' };

export function categoryMeta(category) {
  return META[(category || '').toLowerCase()] || DEFAULT;
}

export function categoryBadgeStyle(category) {
  const key = (category || '').toLowerCase();
  const known = ['tech', 'music', 'business', 'art', 'sports', 'food'];
  const prefix = known.includes(key) ? key : 'default';
  return {
    background: `var(--cat-${prefix}-bg)`,
    color: `var(--cat-${prefix}-fg)`,
  };
}

export function daysUntil(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Past event';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 30) return `In ${days} days`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
