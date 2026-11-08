import { useEffect, useRef } from 'react';

export const useGameLoop = (callback: (dt: number) => void, isPaused: boolean) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      // Cap dt to avoid huge jumps if tab was inactive
      const cappedDt = Math.min(deltaTime, 50); 
      // Convert to seconds for easier physics or keep ms depending on engine
      // Here we pass Seconds to update loop usually, but our engine might expect 1 = 1 frame.
      // Let's pass normalized time (1.0 = 60fps)
      const normalizedDt = cappedDt / (1000 / 60); 
      
      callback(normalizedDt);
    }
    previousTimeRef.current = time;
    
    if (!isPaused) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (!isPaused) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
        previousTimeRef.current = undefined; // Reset time so we don't jump on resume
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPaused, callback]);
};