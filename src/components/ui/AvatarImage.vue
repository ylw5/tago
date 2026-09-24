<script setup lang="ts">
import { computed } from 'vue'
import { avatarSpriteStyle } from '@/utils/avatar'

const props = defineProps<{ id?: string | null; url?: string | null }>()
const spriteStyle = computed(() => avatarSpriteStyle(props.id) || (!props.url ? avatarSpriteStyle('default-0') : null))
</script>

<template>
  <view class="avatar-image" :style="spriteStyle || undefined">
    <image v-if="!spriteStyle" :src="url || ''" mode="aspectFill" />
  </view>
</template>

<style scoped>
.avatar-image { display:block; overflow:hidden; border-radius:50%; background-repeat:no-repeat; }
.avatar-image > image { display:block; width:100%; height:100%; }
</style>
