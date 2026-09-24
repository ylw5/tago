// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarBadge from './AvatarBadge.vue'
import AvatarImage from '@/components/ui/AvatarImage.vue'

it('renders the backend-selected avatar in cards instead of a name-derived photo', () => {
  const wrapper = mount(AvatarBadge, {
    props: { user: { id: 'TG123', name: '会飞的西', city: '线上', avatar: '会', avatarId: 'default-4' } },
  })
  expect(wrapper.find('.avatar-image').attributes('style')).toContain('50% 50%')
  expect(wrapper.html()).not.toContain('/static/avatars/u')
})

it('uses the sprite as the fallback when no avatar is available', () => {
  const wrapper = mount(AvatarImage, { props: { id: 'unknown' } })
  expect(wrapper.attributes('style')).toContain('0% 0%')
  expect(wrapper.find('image').exists()).toBe(false)
})
