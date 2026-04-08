import { useState, useEffect, useRef } from "react";

export default function useBackendWakeup(url) {
  const [isReady, setIsReady] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;
    
    // Start timing
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const checkHealth = async () => {
      if (!active) return;
      
      setAttempts((a) => a + 1);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          if (active) {
            setIsReady(true);
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return;
        }
      } catch (err) {
        // Network error, timeout, or abort
      }

      if (active) {
        setTimeout(checkHealth, 4000);
      }
    };

    checkHealth();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [url]);

  return { isReady, elapsedSeconds, attempts };
}
