/**
 * Timer para órdenes de cocina
 * Muestra tiempo transcurrido desde la aceptación
 */

import { useState, useEffect } from 'react';

interface KitchenTimerProps {
  startTime: string;
  isActive: boolean;
}

export default function KitchenTimer({ startTime, isActive }: KitchenTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000); // segundos
      setElapsed(diff);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColor = () => {
    if (elapsed < 300) return 'text-green-600'; // Menos de 5 min
    if (elapsed < 600) return 'text-yellow-600'; // Menos de 10 min
    return 'text-red-600'; // Más de 10 min
  };

  return (
    <div className={`text-right ${getColor()}`}>
      <div className="text-2xl font-bold">
        {formatTime(elapsed)}
      </div>
      <div className="text-xs font-medium">
        {isActive ? 'Preparando' : 'Esperando'}
      </div>
    </div>
  );
}

