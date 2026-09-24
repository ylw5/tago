<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { installNavHistory } from '@/utils/navigation'
// #ifdef H5
import { getCurrentInstance } from 'vue'
import { installAuthGuard } from '@/utils/authGuard'

installAuthGuard(getCurrentInstance()!.appContext.config.globalProperties.$router)
// #endif

onLaunch(() => {
  installNavHistory()
})
</script>

<style lang="scss">
@use '@/styles/tokens.scss';
</style>
