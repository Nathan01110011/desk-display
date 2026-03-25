import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback((seconds: number) => {
    setTimeLeft(seconds);
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
    setIsFinished(false);
  }, []);

  const dismissAlert = useCallback(() => {
    setIsFinished(false);
    setTimeLeft(0);
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  return {
    timeLeft,
    isActive,
    isFinished,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    dismissAlert
  };
}
