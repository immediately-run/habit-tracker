import { useEffect, useState } from 'react';
import { today, type Ymd } from '../lib/dates';

/** Today's local date, re-evaluated every minute so an open tab rolls over at midnight. */
export function useToday(): Ymd {
  const [now, setNow] = useState<Ymd>(() => today());
  useEffect(() => {
    const t = setInterval(() => {
      const next = today();
      setNow((cur) => (cur === next ? cur : next));
    }, 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
