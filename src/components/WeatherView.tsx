import React from 'react';
import { motion } from 'framer-motion';
import { CloudSun, X } from 'lucide-react';
import { WeatherData } from '@/types';

interface WeatherViewProps {
  weather: WeatherData | null;
  onClose: () => void;
}

export function WeatherView({ weather, onClose }: WeatherViewProps) {
  if (!weather) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-20">
        <CloudSun size={80} className="animate-pulse" />
        <p className="text-xl font-bold uppercase tracking-widest mt-4">Loading Weather...</p>
      </div>
    );
  }

  return (
    <motion.div
      key="weather-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full flex flex-col items-center space-y-12"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
        <CloudSun size={20} /> {weather.location}
      </div>

      {/* Main Temp */}
      <div className="flex items-center gap-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={`http://openweathermap.org/img/wn/${weather.icon}@4x.png`} 
          alt={weather.condition}
          className="w-48 h-48 drop-shadow-2xl"
        />
        <div className="flex flex-col">
          <div className="text-[10rem] font-black tracking-tighter leading-none text-white flex">
            {weather.temp}<span className="text-[6rem] mt-4 text-white/20">°</span>
          </div>
          <p className="text-4xl font-bold text-white/40 uppercase tracking-widest">{weather.condition}</p>
        </div>
      </div>

      {/* Forecast Row */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-8 pt-8 border-t border-white/5">
        {weather.forecast.map((item, i) => (
          <div key={i} className="bg-white/5 rounded-3xl p-8 flex flex-col items-center gap-4 border border-white/5">
            <p className="text-lg font-bold text-white/30 uppercase tracking-widest">{item.time}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`http://openweathermap.org/img/wn/${item.icon}@2x.png`} 
              alt={item.condition}
              className="w-20 h-20"
            />
            <div className="text-4xl font-black">{item.temp}°</div>
            <p className="text-sm font-bold text-white/20 uppercase tracking-widest truncate w-full text-center">
              {item.condition}
            </p>
          </div>
        ))}
      </div>

      <button
        onPointerDown={onClose}
        className="absolute top-0 right-0 p-6 text-white/20 hover:text-white/60 active:scale-90 transition-all"
      >
        <X size={48} />
      </button>
    </motion.div>
  );
}
