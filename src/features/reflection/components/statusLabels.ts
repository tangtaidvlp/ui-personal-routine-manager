import type { ComparisonStatus } from '../types/reflection.ts'

export const STATUS_LABEL: Record<ComparisonStatus, string> = {
  AS_PLANNED: 'As planned',
  CHANGED: 'Changed',
  SKIPPED: 'Skipped',
  UNPLANNED: 'Unplanned',
}

export const STATUS_CLASS: Record<ComparisonStatus, string> = {
  AS_PLANNED: 'rf-chip-as-planned',
  CHANGED: 'rf-chip-changed',
  SKIPPED: 'rf-chip-skipped',
  UNPLANNED: 'rf-chip-unplanned',
}
