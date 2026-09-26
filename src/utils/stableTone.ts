import type { NoteTone } from '@/types/models'

const tones: NoteTone[] = ['yellow', 'blue', 'green', 'pink']

export function stableTone(id: string): NoteTone {
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0)
  return tones[hash % tones.length]
}
