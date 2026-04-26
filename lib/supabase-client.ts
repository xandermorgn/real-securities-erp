// Client-side Supabase client for Realtime subscriptions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Subscribe to realtime table changes. This is called inside React effects.
export function subscribeToRealtime(
  table: string,
  callback: () => void,
  enabled = true
) {
  if (!enabled) return;

  const channel = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      (payload) => {
        console.log(`[Realtime] ${table} change:`, payload.eventType);
        callback();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
