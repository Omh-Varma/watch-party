import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function useReconnectionBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setReconnecting(true);
      setTimeout(() => {
        setOnline(true);
        setReconnecting(false);
      }, 1500);
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Also monitor Supabase realtime connection health
    const healthChannel = supabase.channel('connection-health');
    let lastPong = Date.now();
    healthChannel
      .on('system', { event: 'disconnected' }, () => {
        setOnline(false);
        setReconnecting(true);
      })
      .on('system', { event: 'reconnected' }, () => {
        setReconnecting(true);
        setTimeout(() => {
          setOnline(true);
          setReconnecting(false);
        }, 1500);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setOnline(false);
          setReconnecting(true);
        }
        if (status === 'SUBSCRIBED') {
          lastPong = Date.now();
        }
      });

    // Periodic health check
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastPong > 15000) {
        setOnline(false);
        setReconnecting(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      supabase.removeChannel(healthChannel);
      clearInterval(interval);
    };
  }, []);

  if (online && !reconnecting) return null;

  return (
    <div className="px-4 py-2 bg-amber-950/90 border-b border-amber-800/50 backdrop-blur-xl flex items-center justify-center gap-2 text-amber-300 text-xs animate-slide-down">
      <WifiOff className="w-3.5 h-3.5" />
      <span>
        {reconnecting ? (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Reconnecting...
          </span>
        ) : (
          'Connection lost — trying to reconnect'
        )}
      </span>
    </div>
  );
}
