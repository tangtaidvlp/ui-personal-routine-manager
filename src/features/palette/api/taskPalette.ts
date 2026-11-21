import { ApiError, apiRequest } from '../../../lib/api.ts'
import type { TaskPalette } from '../types/palette.ts'

export async function fetchTaskPalette(): Promise<TaskPalette> {
  const data = await apiRequest<TaskPalette>('/api/v1/task-palette', { method: 'GET' })
  if (!data || !Array.isArray(data.colors) || data.colors.length === 0) {
    throw new ApiError(502, 'Invalid task palette payload')
  }
  return data
}
