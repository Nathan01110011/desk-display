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
    const timer = setInterval(fetchDevices, 1000 * 30); // Refresh every 30s
    return () => clearInterval(timer);
  }, [fetchDevices, enabled]);

  const toggleDevice = async (id: string, currentState: boolean) => {
    // Optimistic UI update
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, loading: true } : d
    ));

    try {
      const res = await fetch('/api/home/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, targetState: !currentState })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setDevices(prev => prev.map(d => 
          d.id === id ? { ...d, isOn: data.isOn, loading: false } : d
        ));
      } else {
        // Revert on failure
        setDevices(prev => prev.map(d => 
          d.id === id ? { ...d, loading: false } : d
        ));
      }
    } catch (e) {
      // Revert on error
      setDevices(prev => prev.map(d => 
        d.id === id ? { ...d, loading: false } : d
      ));
    }
  };

  return { devices, loading, toggleDevice };
}
