/**
 * Front-end feature toggles. Flip a value and rebuild; each entry says where its decision is tracked.
 */

/**
 * Push mode also pushes the tasks above when a task is dragged up (T002). Off: Push mode only pushes
 * down, and an upward move follows the Normal mode rules. Keep or remove: decision pending, see
 * `AI-project-docs/bugs/low-impact.MD`.
 */
export const PUSH_UP_ENABLED = false

/**
 * Tasks may cross midnight (F011, e.g. Sleep 22:00 + 8h). Off: dragging, resizing, Push mode and the task
 * dialog keep a task within 24:00. Tasks that already cross midnight are left as they are. Keep or remove:
 * decision pending, see `AI-project-docs/bugs/low-impact.MD`.
 */
export const OVERNIGHT_TASKS_ENABLED = false
