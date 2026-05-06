interface CachedRate {
  uyuPerUsd: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
const TTL_MS = 60 * 60 * 1000;  // 1 hora

export async function getUyuPerUsd(): Promise<number | null> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.uyuPerUsd;
  }

  try {
    const res = await fetch('https://uy.dolarapi.com/v1/cotizaciones/usd', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return cache?.uyuPerUsd ?? null;

    const data = await res.json();
    const avg = (Number(data.compra) + Number(data.venta)) / 2;
    if (!Number.isFinite(avg) || avg <= 0) return cache?.uyuPerUsd ?? null;

    cache = { uyuPerUsd: avg, fetchedAt: Date.now() };
    return avg;
  } catch {
    return cache?.uyuPerUsd ?? null;
  }
}
