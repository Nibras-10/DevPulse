import React from 'react';

export type HealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
export type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
export type IncidentSeverity = 'SEV1_CRITICAL' | 'SEV2_MAJOR' | 'SEV3_MINOR' | 'SEV4_LOW';

interface StatusIndicatorProps {
  status: HealthStatus | IncidentStatus | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const norm = status?.toUpperCase() || 'UNKNOWN';

  let colorClass = 'text-neutral-500 dark:text-neutral-400';
  let dotClass = 'bg-neutral-400';
  let label = norm;

  if (norm === 'OPERATIONAL') {
    colorClass = 'text-emerald-600 dark:text-emerald-400';
    dotClass = 'bg-emerald-500';
    label = 'Operational';
  } else if (norm === 'DEGRADED') {
    colorClass = 'text-amber-600 dark:text-amber-400';
    dotClass = 'bg-amber-500';
    label = 'Degraded';
  } else if (norm === 'DOWN') {
    colorClass = 'text-rose-600 dark:text-rose-400';
    dotClass = 'bg-rose-500';
    label = 'Down';
  } else if (norm === 'INVESTIGATING') {
    colorClass = 'text-rose-600 dark:text-rose-400';
    dotClass = 'bg-rose-500';
    label = 'Investigating';
  } else if (norm === 'IDENTIFIED') {
    colorClass = 'text-amber-600 dark:text-amber-400';
    dotClass = 'bg-amber-500';
    label = 'Identified';
  } else if (norm === 'MONITORING') {
    colorClass = 'text-sky-600 dark:text-sky-400';
    dotClass = 'bg-sky-500';
    label = 'Monitoring';
  } else if (norm === 'RESOLVED') {
    colorClass = 'text-neutral-600 dark:text-neutral-400';
    dotClass = 'bg-neutral-400';
    label = 'Resolved';
  } else if (norm.includes('SEV1')) {
    colorClass = 'text-rose-700 dark:text-rose-400 font-semibold';
    dotClass = 'bg-rose-600';
    label = 'SEV1 Critical';
  } else if (norm.includes('SEV2')) {
    colorClass = 'text-amber-700 dark:text-amber-400 font-semibold';
    dotClass = 'bg-amber-600';
    label = 'SEV2 Major';
  } else if (norm.includes('SEV3')) {
    colorClass = 'text-amber-600 dark:text-amber-300';
    dotClass = 'bg-amber-500';
    label = 'SEV3 Minor';
  } else if (norm.includes('SEV4')) {
    colorClass = 'text-neutral-600 dark:text-neutral-400';
    dotClass = 'bg-neutral-400';
    label = 'SEV4 Low';
  }

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap shrink-0 ${textSize} ${colorClass}`}>
      {showDot && <span className={`rounded-full shrink-0 ${dotSize} ${dotClass}`} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
};
