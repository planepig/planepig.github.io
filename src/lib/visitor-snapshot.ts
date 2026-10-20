import type { VisitorLocation } from '@/components/visitors/VisitorGlobe';

export const VISITOR_API = 'https://junyi-visitor-statistics.planepig.chatgpt.site/visitor-stats.json';

export interface VisitorSnapshot {
  since: string;
  updatedAt: string | null;
  total: number;
  locations: VisitorLocation[];
  stale?: boolean;
}

export function isVisitorSnapshot(value: unknown): value is VisitorSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as VisitorSnapshot;
  const validCount = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
  const validLocation = (item: VisitorLocation, nested = false): boolean => !!item &&
    typeof item.code === 'string' && typeof item.name === 'string' && validCount(item.count) &&
    (item.coordinates === null || (Array.isArray(item.coordinates) && item.coordinates.length === 2 &&
      item.coordinates.every(Number.isFinite) && Math.abs(item.coordinates[0]) <= 90 && Math.abs(item.coordinates[1]) <= 180)) &&
    (item.regions === undefined || (!nested && Array.isArray(item.regions) && item.regions.every(region => validLocation(region, true))));
  return typeof data.since === 'string' && typeof data.updatedAt === 'string' &&
    Number.isFinite(Date.parse(data.updatedAt)) && Date.parse(data.updatedAt) <= Date.now() + 5 * 60 * 1000 &&
    (data.stale === undefined || typeof data.stale === 'boolean') &&
    validCount(data.total) && Array.isArray(data.locations) && data.locations.every(item => validLocation(item)) &&
    data.locations.reduce((sum, item) => sum + item.count, 0) === data.total;
}
