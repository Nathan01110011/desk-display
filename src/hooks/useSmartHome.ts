import { useState, useEffect, useCallback, useRef } from 'react';
import { SmartDevice } from '@/types';

export function useSmartHome(enabled: boolean = false) {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch('/api/home/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error('Failed to fetch smart devices', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      fetchDevices();
    });
    const timer = setInterval(fetchDevices, 1000 * 30);
    return () => clearInterval(timer);
  }, [fetchDevices, enabled]);

  const updateDevice = async (id: string, params: Partial<SmartDevice>) => {
    // 1. Instant Optimistic UI update
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, ...params } : d
    ));

    // 2. Debounce the actual API call
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, loading: true } : d));
      
      try {
        const res = await fetch('/api/home/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id, 
            targetState: params.isOn,
            brightness: params.brightness,
            colorTemp: params.colorTemp,
            color: params.color
          })
        });
        
        await res.json();
      } catch {
        fetchDevices(); // Re-sync on error
      } finally {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, loading: false } : d));
      }
    }, 100); // 100ms debounce is perfect for sliders
  };

  return { devices, loading, updateDevice };
}
