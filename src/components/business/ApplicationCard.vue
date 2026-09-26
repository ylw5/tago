<script setup lang="ts">
import { computed } from 'vue'
import type { ApplicationItem } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'
const props = defineProps<{ application: ApplicationItem }>()
const emit = defineEmits<{ accept:[id:string]; decline:[id:string]; detail:[id:string]; chat:[id:string] }>()
const outgoing = computed(() => props.application.direction === 'outgoing')
const person = computed(() => props.application.peer || props.application.applicant)
const statusLabel = computed(() => {
  if (props.application.state === 'PENDING') return '等待回应'
  if (props.application.state === 'ACCEPTED') return '已经认识'
  return '本次申请已结束'
})
// 后端没有独立附言字段，message 取自第一条回答；与 Q1 重复时不再单独展示
const showMessage = computed(() => Boolean(props.application.message) && props.application.message !== props.application.answers[0]?.answer)
const artSource = computed(() => props.application.tone === 'blue' ? '/static/decor/leaf-branch.png' : '/static/decor/leaf-sprig.png')
const metaLabel = computed(() => [person.value.city, props.application.timeLabel].filter(Boolean).join(' · '))
</script>

<template>
  <view class="application" :class="`application--${application.tone}`">
    <view class="application__tape application__tape--tl" aria-hidden="true" />
    <view class="application__tape application__tape--br" aria-hidden="true" />
    <view class="application__art" aria-hidden="true">
      <text class="application__spark application__spark--lg">✦</text>
      <text class="application__spark application__spark--sm">✦</text>
      <image class="application__leaf" :src="artSource" mode="aspectFit" />
    </view>
    <view class="application__head">
      <AvatarBadge class="application__avatar" :user="person" size="lg" />
      <view class="application__identity">
        <text class="application__name">{{ person.name }}</text>
        <text class="application__meta">{{ metaLabel }}</text>
      </view>
      <view class="application__story">
        <view class="application__tag">
          <text class="application__reason-prefix">{{ outgoing ? '你想因为' : 'TA 想因为' }}</text>
          <text class="application__reason">{{ application.tagTitle }}</text>
          <text class="application__known">{{ outgoing ? '认识 TA' : '认识你' }}</text>
        </view>
        <text v-if="showMessage" class="application__message">{{ application.message }}</text>
      </view>
    </view>
    <view class="application__answers">
      <view v-for="(item,index) in application.answers" :key="item.id" class="application__qa">
        <view class="application__q"><text class="application__q-index">Q{{ index + 1 }}</text><text class="application__q-text">{{ item.question }}</text></view>
        <text class="application__a">A：{{ item.answer }}</text>
      </view>
    </view>
    <view v-if="outgoing" class="application__actions">
      <button class="application__detail" @click="emit('detail',application.id)">看看回答 →</button>
      <button v-if="application.state === 'ACCEPTED' && application.conversationId" class="application__accept" @click="emit('chat', application.conversationId)">去聊天</button>
      <text v-else class="application__status" :class="`application__status--${application.state.toLowerCase()}`">{{ statusLabel }}</text>
    </view>
    <view v-else class="application__actions">
      <button class="application__detail" @click="emit('detail',application.id)">看看TA →</button>
      <view class="application__decision">
        <button class="application__accept" data-testid="accept-button" @click="emit('accept',application.id)"><text class="application__heart">♥</text>接受认识</button>
        <button class="application__decline" @click="emit('decline',application.id)">暂时不了</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.application {
  position:relative;
  display:flex;
  flex-direction:column;
  margin:0 4rpx 30rpx;
  padding:26rpx 22rpx 22rpx;
  border:1rpx solid rgba(32,88,79,.06);
  border-radius:10rpx 14rpx 8rpx 12rpx;
  box-shadow:0 8rpx 20rpx rgba(39,68,56,.08);
}

.application::before {
  content:'';
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:repeating-linear-gradient(116deg, rgba(255,255,255,.12) 0 2px, transparent 2px 9px);
  pointer-events:none;
}

.application--yellow { --tone-strong:#f3d77a; --tone-soft:rgba(250,232,170,.72); --tone-tape:rgba(240,210,120,.62); background:linear-gradient(150deg, rgba(255,248,228,.72) 0%, rgba(253,240,204,.72) 100%); }
.application--blue { --tone-strong:#f3d77a; --tone-soft:rgba(200,228,246,.82); --tone-tape:rgba(160,205,232,.66); background:linear-gradient(150deg, rgba(238,248,254,.72) 0%, rgba(223,240,251,.72) 100%); }
.application--green { --tone-strong:#f3d77a; --tone-soft:rgba(214,236,200,.85); --tone-tape:rgba(180,214,160,.66); background:linear-gradient(150deg, rgba(243,249,238,.72) 0%, rgba(230,242,223,.72) 100%); }
.application--pink { --tone-strong:#f3d77a; --tone-soft:rgba(248,210,218,.82); --tone-tape:rgba(232,170,186,.66); background:linear-gradient(150deg, rgba(255,244,246,.72) 0%, rgba(248,220,227,.72) 100%); }

.application__tape { position:absolute; z-index:2; width:54rpx; height:20rpx; background:var(--tone-tape); pointer-events:none; }
.application__tape--tl { top:-6rpx; left:-14rpx; transform:rotate(-36deg); }
.application__tape--br { right:-14rpx; bottom:-4rpx; transform:rotate(-36deg); }

.application__art { position:absolute; z-index:1; top:4rpx; right:8rpx; width:60rpx; height:120rpx; pointer-events:none; }
.application__spark { position:absolute; color:#f1c84b; line-height:1; }
.application__spark--lg { top:0; right:10rpx; font-size:30rpx; }
.application__spark--sm { top:28rpx; right:40rpx; font-size:16rpx; }
.application__leaf { position:absolute; right:0; bottom:0; width:44rpx; height:52rpx; transform:rotate(18deg); }

.application__head { position:relative; display:flex; align-items:flex-start; gap:14rpx; padding-right:40rpx; }
.application__avatar.avatar--lg { width:92rpx; height:92rpx; font-size:32rpx; }
.application__identity { display:flex; min-width:96rpx; max-width:156rpx; flex:0 0 auto; flex-direction:column; justify-content:center; gap:6rpx; min-height:92rpx; overflow:hidden; }
.application__name { overflow:hidden; color:#20241f; font-size:29rpx; font-weight:870; text-overflow:ellipsis; white-space:nowrap; }
.application__meta { overflow:hidden; color:#6b726b; font-size:18rpx; text-overflow:ellipsis; white-space:nowrap; }

.application__story { display:flex; min-width:0; flex:1; flex-direction:column; justify-content:center; gap:10rpx; min-height:92rpx; }
.application__tag { display:-webkit-box; overflow:hidden; color:#252921; font-size:20rpx; line-height:1.9; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.application__reason-prefix, .application__reason { padding:3rpx 8rpx; border-radius:6rpx 10rpx 8rpx 12rpx; font-weight:800; -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.application__reason-prefix { margin-right:6rpx; background:var(--tone-strong); }
.application__reason { margin-right:6rpx; background:var(--tone-soft); }
.application__known { color:#3d443e; font-weight:700; white-space:nowrap; }
.application__message {
  display:-webkit-box;
  overflow:hidden;
  padding:10rpx 14rpx;
  color:#565e56;
  border-radius:12rpx;
  background:rgba(255,255,255,.62);
  font-size:19rpx;
  line-height:1.45;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
}

.application__answers {
  position:relative;
  margin-top:18rpx;
  padding:4rpx 18rpx;
  border:1rpx solid rgba(255,255,255,.7);
  border-radius:12rpx;
  background:rgba(255,254,248,.62);
}

.application__qa {
  display:grid;
  grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);
  gap:16rpx;
  padding:12rpx 0;
  border-bottom:1rpx dashed rgba(32,88,79,.12);
  line-height:1.45;
}

.application__qa:last-child { border-bottom:0; }
.application__q { display:flex; min-width:0; gap:14rpx; color:#242820; font-size:20rpx; font-weight:760; }
.application__q-index { flex:none; }
.application__q-text, .application__a { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.application__a { color:#4f5750; font-size:20rpx; }

.application__actions {
  position:relative;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16rpx;
  margin-top:20rpx;
}

.application__actions button {
  flex:none;
  height:64rpx;
  margin:0;
  padding:0;
  border-radius:999rpx;
  font-size:24rpx;
  line-height:64rpx;
  white-space:nowrap;
}

.application__detail { width:196rpx; color:var(--tago-primary); border:2rpx solid var(--tago-primary); background:rgba(255,255,255,.4); }
.application__decision { display:flex; align-items:center; gap:14rpx; }
.application__accept { display:flex; width:216rpx; align-items:center; justify-content:center; gap:10rpx; color:#fff; background:var(--tago-primary); font-weight:800; box-shadow:0 6rpx 14rpx rgba(32,88,79,.2); }
.application__heart { font-size:26rpx; }
.application__decline { width:144rpx; color:#4b534d; border:1rpx solid rgba(32,88,79,.14); background:rgba(255,254,248,.78); }
.application__status { display:inline-flex; align-items:center; height:64rpx; padding:0 22rpx; border-radius:999rpx; font-size:22rpx; font-weight:800; }
.application__status--pending { color:#8a6414; background:rgba(243,215,122,.75); }
.application__status--accepted { color:var(--tago-primary); background:rgba(211,232,204,.95); }
.application__status--rejected, .application__status--expired { color:#6b726b; background:rgba(255,254,248,.78); }
</style>
