import type { ComparisonItem, ReflectionView } from '../types/reflection.ts'

/** The comparison row for a task on the Reality board (F007 R16), or null if there is none. */
export function itemForActualTask(view: ReflectionView | null | undefined, taskId: string | null | undefined): ComparisonItem | null {
  if (!view || !taskId) {
    return null
  }
  return view.comparison.items.find((item) => item.actual?.id === taskId) ?? null
}
