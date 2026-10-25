import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { BoardMessage, Partner, Seat } from './types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() as string | undefined;

export const realtimeConfigured = Boolean(url && publishableKey &&
  !url.includes('YOUR_PROJECT') && !publishableKey.includes('YOUR_KEY'));

// Separate client storage key avoids a future auth collision with Lovebug,
// even if both apps are eventually served from one origin.
const client = realtimeConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        storageKey: 'draw-date-auth-v1',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 30 } },
    })
  : null;

type Status = 'connected' | 'connecting' | 'error' | 'full' | 'expired';

export function joinChannel(
  roomId: string,
  partner: Partner,
  handlers: {
    onMessage: (message: BoardMessage) => void;
    onMembers: (members: Partner[]) => void;
    onStatus: (status: Status) => void;
    onSeat: (seat: Seat, userId: string) => void;
  },
): { send: (message: BoardMessage) => void; close: () => void } | null {
  if (!client) return null;

  let closed = false;
  let channel: RealtimeChannel | null = null;
  const handle = { 
    send(message: BoardMessage) {
      if (!closed && channel?.state === 'joined') {
        void channel.send({ type: 'broadcast', event: 'drawing', payload: message });
      }
    },
    close() {
      closed = true;
      if (channel) void client.removeChannel(channel);
    },
  };

  const connect = async () => {
    try {
      handlers.onStatus('connecting');
      const previous = await client.auth.getSession();
      if (previous.error) throw previous.error;
      let session = previous.data.session;
      if (!session) {
        const result = await client.auth.signInAnonymously();
        if (result.error) throw result.error;
        session = result.data.session;
      }
      if (!session || closed) return;

      // The database owns membership: never trust a client-side presence count.
      // Joining is atomic so a third distinct identity cannot claim a seat.
      const admission = await client.rpc('draw_date_enter_room', { p_room_id: roomId });
      if (closed) return;
      if (admission.error) {
        if (admission.error.message.includes('draw_date_room_full')) handlers.onStatus('full');
        else if (admission.error.message.includes('draw_date_expired')) handlers.onStatus('expired');
        else handlers.onStatus('error');
        return;
      }

      if (admission.data !== 'host' && admission.data !== 'guest') {
        handlers.onStatus('error');
        return;
      }
      const seat: Seat = admission.data;
      handlers.onSeat(seat, session.user.id);
      client.realtime.setAuth(session.access_token);
      channel = client.channel(`draw-date:secure:${roomId}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: session.user.id },
          private: true,
        },
      });

      channel
        .on('broadcast', { event: 'drawing' }, ({ payload }) => {
          if (!closed && payload && typeof payload === 'object') {
            handlers.onMessage(payload as BoardMessage);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          if (closed || !channel) return;
          const state = channel.presenceState() as unknown as Record<string, Partner[]>;
          const unique = new Map<string, Partner>();
          Object.values(state).flat().forEach((value) => {
            if (!value || typeof value.id !== 'string' || typeof value.name !== 'string' ||
                typeof value.joinedAt !== 'number') return;
            const identity = value.userId || value.id;
            const prior = unique.get(identity);
            if (!prior || value.joinedAt < prior.joinedAt) unique.set(identity, value);
          });
          handlers.onMembers([...unique.values()].sort((a, b) => a.joinedAt - b.joinedAt));
        });

      channel.subscribe((status) => {
        if (closed) return;
        if (status === 'SUBSCRIBED') {
          handlers.onStatus('connected');
          void channel?.track({ ...partner, userId: session.user.id, seat });
          void channel?.send({ type: 'broadcast', event: 'drawing',
            payload: { kind: 'state-request', from: partner.id } satisfies BoardMessage });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          handlers.onStatus('error');
        } else if (status === 'CLOSED') {
          handlers.onStatus('connecting');
        }
      });
    } catch (error) {
      if (!closed) {
        console.warn('Draw Date room connection failed:', error instanceof Error ? error.message : 'Unknown error');
        handlers.onStatus('error');
      }
    }
  };

  void connect();
  return handle;
}
