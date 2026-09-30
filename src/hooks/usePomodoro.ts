import { useState, useEffect } from 'react';
import { PomodoroMode } from '@/types';

export function usePomodoro() {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<PomodoroMode>('work');

  useEffect(() => {
    const pomoTimer = setInterval(() => {
      if (pomoActive) {
        setPomoTime(prev => {
          if (prev <= 0) {
            setPomoActive(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(pomoTimer);
  }, [pomoActive]);

  const togglePomo = () => setPomoActive(!pomoActive);
  
  const resetPomo = () => {
    setPomoActive(false);
    setPomoTime(pomoMode === 'work' ? workDuration * 60 : breakDuration * 60);
  };

  const updateDurations = (work: number, brk: number) => {
    setWorkDuration(work);
    setBreakDuration(brk);
    if (!pomoActive) {
      setPomoTime(pomoMode === 'work' ? work * 60 : brk * 60);
    }
  };

  const switchMode = (mode?: PomodoroMode) => {
    const nextMode = mode || (pomoMode === 'work' ? 'break' : 'work');
    setPomoMode(nextMode);
    setPomoTime(nextMode === 'work' ? workDuration * 60 : breakDuration * 60);
    setPomoActive(false);
  };

  return { 
    pomoTime, 
    pomoActive, 
    pomoMode, 
    workDuration, 
    breakDuration, 
    togglePomo, 
    resetPomo, 
    switchMode, 
    updateDurations 
  };
}
