import React from 'react';

interface UptimeBarProps {
  checks: Array<{
    id?: string;
    isHealthy: boolean;
    responseTimeMs: number;
    statusCode?: number;
    timestamp: string;
  }>;
  maxBars?: number;
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ checks, maxBars = 40 }) => {
  const displayChecks = checks.slice(-maxBars);

  // Fill in empty slots if checks count is less than maxBars
  const emptySlotsCount = Math.max(0, maxBars - displayChecks.length);

  return (
    <div className="flex items-center gap-[3px] h-6 py-1" title="Historical health check timeline">
      {Array.from({ length: emptySlotsCount }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="w-1.5 h-full rounded-[1px] bg-neutral-200 dark:bg-neutral-800 opacity-40"
        />
      ))}
      {displayChecks.map((c, i) => {
        let barColor = 'bg-emerald-500 hover:bg-emerald-400';
        if (!c.isHealthy) {
          barColor = 'bg-rose-500 hover:bg-rose-400';
        } else if (c.responseTimeMs > 1200) {
          barColor = 'bg-amber-500 hover:bg-amber-400';
        }

        const timeStr = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const tooltip = `${timeStr} · ${c.isHealthy ? 'Healthy' : 'Failure'} · ${c.responseTimeMs}ms · HTTP ${c.statusCode || 'Err'}`;

        return (
          <div
            key={c.id || i}
            title={tooltip}
            className={`w-1.5 h-full rounded-[1px] transition-all cursor-pointer ${barColor}`}
          />
        );
      })}
    </div>
  );
};
