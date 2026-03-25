import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '@/types';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(async () => {
    try {
      const location = localStorage.getItem('weatherLocation');
      const url = location ? `/api/weather?location=${encodeURIComponent(location)}` : '/api/weather';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (e) {
      console.error('Failed to fetch weather', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const timer = setInterval(fetchWeather, 1000 * 60 * 15); // Refresh every 15 mins
    return () => clearInterval(timer);
  }, [fetchWeather]);

  return { weather, loading, refresh: fetchWeather };
}
