export const AVATAR_SELECTED_EVENT = 'tago:avatar-selected'

export function avatarIndex(id?: string | null) {
  const match = id?.match(/^default-([0-8])$/)
  return match ? Number(match[1]) : null
}

export function avatarSpriteStyle(id?: string | null) {
  const index = avatarIndex(id)
  if (index === null) return null
  return {
    backgroundImage: 'url(/static/avatars/product-sprite.webp)',
    backgroundSize: '300% 300%',
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  }
}

