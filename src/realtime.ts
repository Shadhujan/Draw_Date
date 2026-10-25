import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { BoardMessage, Partner } from './types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() as string | undefined;

export const realtimeConfigured = Boolean(url && publishableKey && !url.includes('YOUR_PROJECT') && !publishableKey.includes('YOUR_KEY'));

const client = realtimeConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 30 } },
    })
  : null;

export function joinChannel(
  roomId: string,
  partner: Partner,
  handlers: {
    onMessage: (message: BoardMessage) => void;
    onMembers: (members: Partner[]) => void;
    onStatus: (status: 'connected' | 'connecting' | 'error') => void;
  },
): { send: (message: BoardMessage) => void; close: () => void } | null {
  if (!client) return null;
  let closed = false;
  const channel: RealtimeChannel = client.channel(`doodle-date:v1:${roomId}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: partner.id },
      private: false,
    },
  });

  channel
    .on('broadcast', { event: 'drawing' }, ({ payload }) => {
      if (!closed && payload && typeof payload === 'object') {
        handlers.onMessage(payload as BoardMessage);
      }
    })
    .on('presence', { event: 'sync' }, () => {
      if (closed) return;
      const state = channel.presenceState() as unknown as Record<string, Partner[]>;
      const members = Object.values(state)
        .flat()
        .filter((value): value is Partner => Boolean(value && typeof value.id === 'string' &&
          typeof value.name === 'string' && typeof value.joinedAt === 'number'))
        .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
      handlers.onMembers(members);
    });

  channel.subscribe((status) => {
    if (closed) return;
    if (status === 'SUBSCRIBED') {
      handlers.onStatus('connected');
      void channel.track(partner);
      void channel.send({ type: 'broadcast', event: 'drawing', payload: { kind: 'state-request', from: partner.id } satisfies BoardMessage });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      handlers.onStatus('error');
    } else if (status === 'CLOSED') {
      handlers.onStatus('connecting');
    }
  });

  return {
    send(message) {
      if (!closed && channel.state === 'joined') {
        void channel.send({ type: 'broadcast', event: 'drawing', payload: message });
      }
    },
    close() {
      closed = true;
      void client.removeChannel(channel);
    },
  };
}
