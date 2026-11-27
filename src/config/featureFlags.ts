/**
 * Front-end feature toggles. Flip a value and rebuild; each entry says where its decision is tracked.
 */

/**
 * Push mode also pushes the tasks above when a task is dragged up (T002). Off: Push mode only pushes
 * down, and an upward move follows the Normal mode rules. Keep or remove: decision pending, see
 * `AI-project-docs/bugs/low-impact.MD`.
 */
export const PUSH_UP_ENABLED = false
