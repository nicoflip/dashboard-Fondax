/**
 * Helper to handle optional closure comments / resolution traces for calendar events.
 * Embedded cleanly in the event description as `[CLOTURE: <comment>]`.
 */

export interface ParsedEventClosure {
  cleanDesc: string
  closureComment: string | null
}

const CLOSURE_TAG_REGEX = /\[(?:CLOTURE|CLÔTURE|RESOLUTION|RÉSOLUTION)\s*:\s*([\s\S]*?)\]/i

/**
 * Parses description to extract any closure comment and clean description text
 */
export function parseEventClosureComment(description: string | null | undefined): ParsedEventClosure {
  if (!description) {
    return { cleanDesc: '', closureComment: null }
  }

  const match = description.match(CLOSURE_TAG_REGEX)
  if (!match) {
    return { cleanDesc: description.trim(), closureComment: null }
  }

  const closureComment = match[1]?.trim() || null
  const cleanDesc = description.replace(CLOSURE_TAG_REGEX, '').trim()

  return {
    cleanDesc,
    closureComment
  }
}

/**
 * Embeds or updates a closure comment in the event description
 */
export function formatEventDescriptionWithClosure(
  rawDesc: string | null | undefined,
  closureComment: string | null | undefined
): string | null {
  const base = (rawDesc || '').replace(CLOSURE_TAG_REGEX, '').trim()
  const comment = (closureComment || '').trim()

  if (!comment) {
    return base || null
  }

  if (!base) {
    return `[CLOTURE: ${comment}]`
  }

  return `${base}\n\n[CLOTURE: ${comment}]`
}

/**
 * Aliases pour les tâches pour une sémantique claire et explicite
 */
export const parseTaskClosureComment = parseEventClosureComment
export const formatTaskDescriptionWithClosure = formatEventDescriptionWithClosure

