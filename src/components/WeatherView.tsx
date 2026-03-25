import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudSun, ChevronLeft, List, Sunrise, Sunset } from 'lucide-react';
import { WeatherData } from '@/types';

interface WeatherViewProps {
  weather: WeatherData | null;
  onClose: () => void;
  isExtended: boolean;
  onToggleExtended: (val: boolean) => void;
}

export function WeatherView({ weather, onClose, isExtended, onToggleExtended }: WeatherViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topFade, setTopFade] = useState(0);
  const [bottomFade, setBottomFade] = useState(40);

  const groupedForecast = useMemo(() => {
    if (!weather) return {};
    const groups: Record<string, typeof weather.forecast> = {};
    weather.forecast.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return groups;
  }, [weather]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const newTop = Math.min(scrollTop, 40);
    const scrollBottom = scrollHeight - clientHeight - scrollTop;
    const newBottom = Math.min(scrollBottom, 40);
    setTopFade(newTop);
    setBottomFade(newBottom);
  };

  useEffect(() => {
    if (isExtended) {
      setTimeout(handleScroll, 100);
    }
  }, [isExtended]);

  if (!weather) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-20">
        <CloudSun size={80} className="animate-pulse" />
        <p className="text-xl font-bold uppercase tracking-widest mt-4">Loading Weather...</p>
      </div>
    );
  }

  const atAGlance = weather.forecast.slice(0, 4);

  const maskStyle = {
    WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent 100%)`,
    maskImage: `linear-gradient(to bottom, transparent 0%, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent 100%)`
  };

  return (
    <motion.div
      key="weather-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-full flex flex-col items-center justify-center py-8 relative"
    >
      <AnimatePresence mode="wait">
        {!isExtended ? (
          <motion.div 
            key="at-a-glance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col items-center"
          >
            <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm mb-8">
              <CloudSun size={20} /> {weather.location}
            </div>

            <div className="flex items-center gap-16 mb-12">
              <img 
                src={`http://openweathermap.org/img/wn/${weather.icon}@4x.png`} 
                alt={weather.condition}
                className="w-48 h-48 drop-shadow-2xl"
              />
              <div className="flex flex-col">
                <div className="text-[10rem] font-black tracking-tighter leading-none text-white flex">
                  {weather.temp}<span className="text-[6rem] mt-4 text-white/20">°</span>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-bold text-white/40 uppercase tracking-widest">{weather.condition}</p>
                  <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-white/30">
                      <Sunrise size={20} className="text-orange-400/60" />
                      <span className="text-lg font-bold tabular-nums">{weather.sunrise}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/30">
                      <Sunset size={20} className="text-blue-400/60" />
                      <span className="text-lg font-bold tabular-nums">{weather.sunset}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-4 gap-6 pt-8 border-t border-white/5">
              {atAGlance.map((item, i) => (
                <div key={i} className="bg-white/5 rounded-3xl p-6 flex flex-col items-center gap-3 border border-white/5">
                  <p className="text-lg font-bold text-white/30 uppercase tracking-widest">{item.time}</p>
                  <img 
                    src={`http://openweathermap.org/img/wn/${item.icon}@2x.png`} 
                    alt={item.condition}
                    className="w-16 h-16"
                  />
                  <div className="text-3xl font-black">{item.temp}°</div>
                  <p className="text-sm font-bold text-white/40 uppercase tracking-widest truncate w-full text-center">
                    {item.condition}
                  </p>
                </div>
              ))}
            </div>

            <button 
              onPointerDown={() => onToggleExtended(true)}
              className="mt-12 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
            >
              <List size={20} /> View 5-Day Forecast
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="extended"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full h-full flex flex-col p-4"
          >
            <div className="flex items-center justify-between mb-6 pr-24">
              <button 
                onPointerDown={() => onToggleExtended(false)}
                className="p-4 rounded-2xl bg-white/5 text-white/60 flex items-center gap-3 font-bold active:scale-90 transition-all"
              >
                <ChevronLeft size={24} /> Back
              </button>
              <div className="text-white/30 font-bold uppercase tracking-[0.3em] text-sm">5-Day Forecast ({weather.location})</div>
              <div />
            </div>

            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-6"
              style={maskStyle}
            >
              {Object.entries(groupedForecast).map(([date, hours]) => (
                <div key={date} className="bg-white/5 rounded-[2.5rem] border border-white/5 p-6 space-y-4">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] px-2">{date}</h3>
                  <div className="grid grid-cols-8 gap-2">
                    {hours.map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                        <span className="text-[10px] font-bold text-white/30 uppercase">{item.time}</span>
                        <img 
                          src={`http://openweathermap.org/img/wn/${item.icon}@2x.png`} 
                          alt={item.condition}
                          className="w-12 h-12"
                        />
                        <span className="text-2xl font-black">{item.temp}°</span>
                        <span className="text-[12px] font-black text-white/60 uppercase truncate w-full text-center leading-none mt-1">{item.condition}</span>
                      </div>
                    ))}
                    {Array.from({ length: 8 - hours.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
