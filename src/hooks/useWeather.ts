import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '@/types';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const savedLocation = localStorage.getItem('weatherLocation');
      const url = savedLocation ? `/api/weather?location=${encodeURIComponent(savedLocation)}` : '/api/weather';
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (e) {
      console.error("Weather Fetch Error:", e);
    }
  }, []);

  // Expose a way to update the location state
  const updateLocation = (newLoc: string) => {
    localStorage.setItem('weatherLocation', newLoc);
    setLocation(newLoc);
    fetchWeather(); // Immediate refresh
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchWeather();
    });
    
    const timer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchWeather, location]); // Re-run if location state changes

  return { weather, refreshWeather: fetchWeather, updateLocation };
}
