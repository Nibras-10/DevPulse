import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface LatencyDataPoint {
  time: string;
  timestamp: string;
  latency: number;
  status: string;
  code?: number;
}

interface LatencyChartProps {
  data: LatencyDataPoint[];
  height?: number;
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ data, height = 220 }) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-500"
      >
        No latency data recorded in this timeframe
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#171717" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#171717" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            stroke="#A3A3A3"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#E5E5E5' }}
            dy={5}
          />
          <YAxis
            stroke="#A3A3A3"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#E5E5E5' }}
            tickFormatter={(val) => `${val}ms`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as LatencyDataPoint;
                return (
                  <div className="bg-neutral-900 text-white border border-neutral-800 shadow-md rounded-md p-2.5 text-xs">
                    <p className="text-neutral-400 font-mono text-[11px] mb-1">{item.timestamp}</p>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Latency:</span>
                      <span className="font-mono tabular-nums text-emerald-400 font-semibold">{item.latency} ms</span>
                    </div>
                    {item.code && (
                      <div className="flex items-center gap-3 mt-0.5 text-neutral-300">
                        <span>HTTP Status:</span>
                        <span className="font-mono tabular-nums">{item.code}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="#171717"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#latencyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
