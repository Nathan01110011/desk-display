import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback((seconds: number) => {
    setTimeLeft(seconds);
    setDuration(seconds);
    setIsActive(true);
    setIsFinished(false);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (timeLeft > 0) setIsActive(true);
  }, [timeLeft]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
    setDuration(0);
    setIsFinished(false);
  }, []);

  const dismissAlert = useCallback(() => {
    setIsFinished(false);
    setTimeLeft(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          queueMicrotask(() => {
            setIsActive(false);
            setIsFinished(true);
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (timeLeft <= 0) {
      queueMicrotask(() => {
        setIsActive(false);
        setIsFinished(true);
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  return {
    timeLeft,
    duration,
    isActive,
    isFinished,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    dismissAlert
  };
}
