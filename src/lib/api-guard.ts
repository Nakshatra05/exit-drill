// Per-instance backpressure for the CPU-bound sandbox. Deploy a shared limiter
// or Vercel Firewall rule before opening the service to high-volume traffic.
const requests = new Map<string, { count: number; reset: number }>();
let active = 0;
export function acquire(request: Request) {
  const key =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "local";
  const now = Date.now();
  if (requests.size > 1000)
    for (const [k, v] of requests) if (v.reset < now) requests.delete(k);
  const current = requests.get(key);
  const state =
    current && current.reset > now ? current : { count: 0, reset: now + 60000 };
  if (state.count >= 8 || active >= 2)
    throw new Error("The rehearsal engine is busy. Wait a minute and retry.");
  state.count++;
  requests.set(key, state);
  active++;
  let released = false;
  return () => {
    if (!released) {
      active--;
      released = true;
    }
  };
}
