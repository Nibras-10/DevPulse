import type { IncidentStatus } from '../../db/types';

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  INVESTIGATING: ['IDENTIFIED', 'MONITORING', 'RESOLVED'],
  IDENTIFIED: ['MONITORING', 'RESOLVED', 'INVESTIGATING'],
  MONITORING: ['RESOLVED', 'IDENTIFIED', 'INVESTIGATING'],
  RESOLVED: ['INVESTIGATING'], // Reopening permitted if service regresses
};

export function canTransition(currentStatus: IncidentStatus, newStatus: IncidentStatus): boolean {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

export function validateStatusTransition(currentStatus: IncidentStatus, newStatus: IncidentStatus): void {
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid incident status transition: cannot transition from "${currentStatus}" to "${newStatus}". Allowed transitions are: ${VALID_TRANSITIONS[currentStatus]?.join(', ') || 'none'}.`
    );
  }
}
