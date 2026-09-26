<script setup lang="ts">
import { useConfigProvider } from 'wot-design-uni/components/composables/useConfigProvider'
import type { ConfigProviderThemeVars } from 'wot-design-uni/components/wd-config-provider/types'

const themeVars: ConfigProviderThemeVars = {
  colorTheme: '#20584f',
  colorSuccess: '#43856f',
  colorWarning: '#f4c94c',
  colorDanger: '#e96052',
  colorTitle: '#242820',
  colorContent: '#4f5852',
  colorSecondary: '#6f756e',
  colorBg: '#f8f4e9',
  colorBorder: 'rgba(32, 88, 79, 0.18)',
  buttonPrimaryBgColor: '#20584f',
}

useConfigProvider({ themeVars })
</script>

<template>
  <wd-config-provider theme="light" :theme-vars="themeVars">
    <slot />
  </wd-config-provider>
</template>
