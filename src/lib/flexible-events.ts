import { FlexibleEventInfo } from './types'

/**
 * Extrait le libellé de période flexible et la description nettoyée.
 * Format standard : [Période flexible : <libellé>] \n <description>
 */
export function parseFlexibleEvent(desc: string | null | undefined): FlexibleEventInfo {
  if (!desc) {
    return { isFlexible: false, flexLabel: '', cleanDesc: '' }
  }
  const match = desc.match(/^\[Période flexible\s*:\s*([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (match) {
    return {
      isFlexible: true,
      flexLabel: match[1].trim(),
      cleanDesc: match[2].trim()
    }
  }
  return { isFlexible: false, flexLabel: '', cleanDesc: desc }
}

/**
 * Formate la description d'un événement avec l'entête de période flexible.
 */
export function formatFlexibleEventDescription(
  cleanDesc: string,
  flexLabel: string = 'Dans les 2 prochaines semaines'
): string {
  const base = (cleanDesc || '').trim()
  return `[Période flexible : ${flexLabel}]\n${base}`.trim()
}
