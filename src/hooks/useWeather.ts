import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '@/types';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

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
      console.error("Weather Fetch Error:", e);
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchWeather();
    });
    
    // Poll every 30 mins
    const timer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchWeather]);

  return { weather, refreshWeather: fetchWeather };
}
