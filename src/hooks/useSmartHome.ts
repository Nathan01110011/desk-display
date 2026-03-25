import { useState, useEffect, useCallback } from 'react';
import { SmartDevice } from '@/types';

export function useSmartHome(enabled: boolean = false) {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
      return;
    }
    fetchDevices();
    const timer = setInterval(fetchDevices, 1000 * 30);
    return () => clearInterval(timer);
  }, [fetchDevices, enabled]);

  const updateDevice = async (id: string, params: Partial<SmartDevice>) => {
    // Optimistic UI update
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, ...params, loading: true } : d
    ));

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
      
      const data = await res.json();
      if (!data.success) throw new Error('Update failed');
      
      setDevices(prev => prev.map(d => 
        d.id === id ? { ...d, loading: false } : d
      ));
    } catch (e) {
      fetchDevices(); // Re-sync on error
    }
  };

  return { devices, loading, updateDevice };
}
