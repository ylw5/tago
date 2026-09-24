<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, nextTick, shallowRef, watch } from 'vue'
import dayjs from 'dayjs'
import { getProfile } from '@/api/account'
import ChatComposer from '@/components/business/ChatComposer.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useTinodeConversation } from '@/composables/useTinodeConversation'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import { goBack } from '@/utils/navigation'

const conversationId=shallowRef(''),draft=shallowRef(''),messageScrollTop=shallowRef(0),initialScrollReady=shallowRef(false),myAvatarId=shallowRef('')
const {detail,messages,encounters,selectedEncounter,loading,connecting,sending,error,sendError,connected,load,send,openEncounter,closeEncounter}=useTinodeConversation()
// 关系上下文：从相遇快照提取 Tag 名 + 按接受认识日计算「第 N 天」（PRD FR-6.1）
const relationTag=computed(()=>{const summary=encounters.value[0]?.summary||detail.value?.latestEncounter?.summary;return summary?.match(/「(.+?)」/)?.[1]||summary?.trim()||null})
const relationDays=computed(()=>{const accepted=encounters.value[0]?.acceptedAt||detail.value?.latestEncounter?.acceptedAt;if(!accepted)return null;const days=dayjs().diff(dayjs(accepted),'day');return Math.max(1,days+1)})
const shortTag=computed(()=>{const tag=relationTag.value||'';return tag.length>14?`${tag.slice(0,14)}…`:tag})
const relationSubtitle=computed(()=>{if(!relationTag.value)return '因为一次真诚回答而相遇';return `因为 #${shortTag.value} 而认识${relationDays.value?` · 第${relationDays.value}天`:''}`})
const peerName=computed(()=>detail.value?.peerIdentity?.displayName||'聊天')
const firstEncounterId=computed(()=>encounters.value[0]?.id||detail.value?.latestEncounterId||'')

watch([messages,loading],()=>{
  if(loading.value){initialScrollReady.value=false;messageScrollTop.value=0;return}
  if(!messages.value.length)return
  uni.createSelectorQuery().select('.messages').scrollOffset(async node=>{
    messageScrollTop.value=(Array.isArray(node)?node[0]:node)?.scrollHeight||0
    await nextTick()
    if(!loading.value)initialScrollReady.value=true
  }).exec()
},{flush:'post'})

async function sendMessage(){if(await send(draft.value))draft.value=''}
function giftHint(){uni.showToast({title:'礼物商店即将上线 ✨',icon:'none'})}
async function showEncounter(){if(firstEncounterId.value)await openEncounter(conversationId.value,firstEncounterId.value)}
function openMore(){
  if(!firstEncounterId.value){uni.showToast({title:'更多功能即将上线',icon:'none'});return}
  uni.showActionSheet({itemList:['查看彼此当时的回答'],success:({tapIndex})=>{if(tapIndex===0)showEncounter()}})
}
onLoad(q=>{
  conversationId.value=typeof q?.id==='string'?q.id:''
  if(conversationId.value)load(conversationId.value)
  getProfile().then(profile=>{myAvatarId.value=profile.avatarId}).catch(()=>{})
})
</script>

<template>
  <view class="chat-page">
    <view class="chat-shell">
      <image class="decor decor--leaf" src="/static/decor/leaf-sprig.png" mode="aspectFit" aria-hidden="true" />
      <image class="decor decor--corners" src="/static/decor/flower-corners.png" mode="aspectFill" aria-hidden="true" />

      <view class="chat-header">
        <button class="chat-header__back" aria-label="返回" @click="goBack" />
        <AvatarImage class="chat-header__avatar" :id="detail?.peerIdentity?.avatarId" />
        <view class="chat-header__identity">
          <text class="chat-header__name">{{ peerName }}</text>
          <text class="chat-header__relation">{{ relationSubtitle }}</text>
        </view>
        <button class="chat-header__more" aria-label="更多" @click="openMore"><i /><i /><i /></button>
      </view>

      <AsyncState :loading="loading || (!error && messages.length>0 && !initialScrollReady)" :error="error" :empty="!conversationId" empty-title="没有找到会话" @retry="load(conversationId)">
        <view v-if="!connected" class="connection"><i />{{ connecting?'正在连接聊天服务':'聊天服务未连接' }}</view>
        <scroll-view scroll-y class="messages" :scroll-top="messageScrollTop">
          <view v-if="relationTag" class="encounter-card">
            <image class="encounter-card__leaf" src="/static/decor/leaf-branch.png" mode="aspectFit" aria-hidden="true" />
            <image class="encounter-card__books" src="/static/stickers/pinned-books.png" mode="aspectFit" aria-hidden="true" />
            <view class="encounter-card__copy">
              <text class="encounter-card__lead">你们因为</text>
              <view class="encounter-card__reason"><text class="encounter-card__tag"># {{ relationTag }}</text><text class="encounter-card__suffix">而认识</text></view>
            </view>
            <view class="encounter-card__footer">
              <text class="encounter-card__slogan">在 TAGO，每一次相遇，都是生活多一种可能 :)</text>
              <button v-if="firstEncounterId" class="encounter-card__answers" @click="showEncounter">查看彼此当时的回答 →</button>
            </view>
          </view>

          <view v-if="messages.length" class="bubble-list">
            <view v-for="message in messages" :key="message.id" class="bubble-row" :class="{mine:message.mine}">
              <AvatarImage class="bubble-avatar" :id="message.mine ? myAvatarId : detail?.peerIdentity?.avatarId" />
              <view class="bubble">{{ message.text }}</view>
              <view class="bubble-meta">
                <text>{{ message.time }}</text>
                <text v-if="message.mine">{{ message.read?'已读':'已送达' }}</text>
              </view>
            </view>
          </view>
          <view v-else-if="connected" class="chat-empty"><b>连接成功</b><text>还没有消息，从一句真诚的问候开始吧。</text></view>
        </scroll-view>
      </AsyncState>

      <ChatComposer v-model="draft" :connected="connected" :sending="sending" :error="sendError" @gift="giftHint" @send="sendMessage" />
    </view>

    <view v-if="selectedEncounter" class="encounter-modal" @click="closeEncounter">
      <view class="encounter-sheet" @click.stop>
        <text class="sheet-title">相遇时的回答</text>
        <text class="sheet-tag"># {{ selectedEncounter.application.tag.body }}</text>
        <article v-for="q in selectedEncounter.application.questions" :key="q.slot">
          <b>Q{{ q.slot }} {{ q.text }}</b>
          <text>{{ selectedEncounter.application.publisherAnswers.find(a=>a.slot===q.slot)?.text||'—' }}</text>
          <text>{{ selectedEncounter.application.applicantAnswers.find(a=>a.slot===q.slot)?.text||'—' }}</text>
        </article>
        <button @click="closeEncounter">收起</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-page {
  min-height:100dvh;
  background:
    radial-gradient(circle at 20% 12%,rgba(255,255,255,.55),transparent 42%),
    linear-gradient(180deg,#f8f5ec 0%,#f3efe3 100%);
}

.chat-shell {
  position:relative;
  display:flex;
  width:100%;
  max-width:var(--tago-content-width);
  height:100dvh;
  flex-direction:column;
  margin:0 auto;
  padding:0 24rpx;
  overflow:hidden;
}
.chat-shell :deep(.async-state) { position:relative; z-index:1; }
.chat-shell :deep(.async-state__content) { display:flex; min-height:0; flex:1; flex-direction:column; }

.decor { position:absolute; z-index:0; pointer-events:none; }
.decor--leaf { top:44%; left:-36rpx; width:150rpx; height:180rpx; opacity:.8; transform:rotate(-12deg); }
.decor--corners { right:0; bottom:110rpx; left:0; width:100%; height:240rpx; opacity:.9; }

.chat-header {
  position:relative;
  z-index:2;
  display:flex;
  flex:none;
  align-items:center;
  gap:16rpx;
  min-height:120rpx;
  padding:calc(14rpx + env(safe-area-inset-top)) 0 10rpx;
}

.chat-header__back,
.chat-header__more {
  display:grid;
  flex:none;
  margin:0;
  padding:0;
  place-items:center;
  border:0;
  background:transparent;
  line-height:1;
}
.chat-header__back::after,
.chat-header__more::after,
.encounter-card__answers::after,
.encounter-sheet>button::after { border:0; }

.chat-header__back { width:48rpx; height:72rpx; }
.chat-header__back::before {
  width:22rpx;
  height:22rpx;
  border-bottom:4rpx solid var(--tago-primary);
  border-left:4rpx solid var(--tago-primary);
  border-radius:2rpx;
  content:'';
  transform:translateX(4rpx) rotate(45deg);
}

.chat-header__avatar {
  flex:none;
  width:84rpx;
  height:84rpx;
  border:4rpx solid #bcd8ee;
  border-radius:50%;
  background:#fff;
}

.chat-header__identity { display:flex; min-width:0; flex:1; flex-direction:column; gap:4rpx; }
.chat-header__name { overflow:hidden; color:var(--tago-ink); font-size:32rpx; font-weight:900; line-height:1.3; text-overflow:ellipsis; white-space:nowrap; }
.chat-header__relation { overflow:hidden; color:var(--tago-muted); font-size:20rpx; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; }

.chat-header__more { width:64rpx; height:64rpx; grid-auto-flow:column; place-content:center; column-gap:7rpx; }
.chat-header__more i { display:block; width:9rpx; height:9rpx; border-radius:50%; background:var(--tago-primary); }

.connection {
  display:flex;
  flex:none;
  align-items:center;
  justify-content:center;
  gap:10rpx;
  height:44rpx;
  color:var(--tago-muted);
  font-size:18rpx;
}
.connection i { width:12rpx; height:12rpx; border-radius:50%; background:#c9a06a; }

.messages { min-height:0; flex:1; padding:6rpx 0 30rpx; }

.encounter-card {
  position:relative;
  display:flex;
  flex-direction:column;
  gap:18rpx;
  margin:6rpx 0 30rpx;
  padding:22rpx 22rpx 20rpx 26rpx;
  overflow:hidden;
  border:2rpx dashed rgba(32,88,79,.16);
  border-radius:14rpx 24rpx 16rpx 22rpx;
  background:linear-gradient(115deg,#f1f6e6 0%,#e6f0d9 100%);
  box-shadow:0 8rpx 20rpx rgba(39,68,56,.07);
}
.encounter-card__leaf { position:absolute; top:-18rpx; right:-20rpx; width:130rpx; height:150rpx; opacity:.85; transform:rotate(18deg); pointer-events:none; }
.encounter-card__books { position:absolute; top:34rpx; right:108rpx; width:130rpx; height:100rpx; pointer-events:none; }
.encounter-card__copy { position:relative; z-index:1; display:flex; flex-direction:column; gap:10rpx; padding-right:230rpx; }
.encounter-card__lead { color:var(--tago-ink); font-size:26rpx; font-weight:800; }

.encounter-card__reason {
  display:-webkit-box;
  overflow:hidden;
  color:var(--tago-ink);
  line-height:1.7;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:3;
}
.encounter-card__tag {
  padding:4rpx 12rpx;
  border-radius:8rpx;
  background:linear-gradient(180deg,transparent 12%,#fbe39a 12%,#f8dc86 92%,transparent 92%);
  font-size:28rpx;
  font-weight:900;
  -webkit-box-decoration-break:clone;
  box-decoration-break:clone;
}
.encounter-card__suffix { margin-left:12rpx; font-size:24rpx; font-weight:800; }

.encounter-card__footer { position:relative; z-index:1; display:flex; align-items:flex-end; justify-content:space-between; gap:16rpx; }
.encounter-card__slogan { min-width:0; flex:1; color:#5f675f; font-size:19rpx; line-height:1.5; }
.encounter-card__answers {
  flex:none;
  width:max-content;
  height:56rpx;
  margin:0;
  padding:0 22rpx;
  color:var(--tago-primary);
  border:2rpx solid var(--tago-primary);
  border-radius:999rpx;
  background:rgba(255,255,255,.92);
  font-size:20rpx;
  font-weight:800;
  line-height:52rpx;
}

.bubble-list { display:flex; flex-direction:column; gap:26rpx; }
.bubble-row { display:flex; align-items:flex-start; gap:14rpx; }
.bubble-row.mine { flex-direction:row-reverse; }

.bubble-avatar {
  flex:none;
  width:76rpx;
  height:76rpx;
  border:4rpx solid #bcd8ee;
  border-radius:50%;
  background:#fff;
}

.bubble {
  max-width:calc(100% - 200rpx);
  margin-top:4rpx;
  padding:18rpx 24rpx;
  border-radius:8rpx 24rpx 24rpx 24rpx;
  background:#fffefa;
  box-shadow:0 4rpx 14rpx rgba(39,68,56,.08);
  color:#252a24;
  font-size:26rpx;
  line-height:1.6;
  overflow-wrap:anywhere;
  white-space:pre-wrap;
}
.mine .bubble { border-radius:24rpx 8rpx 24rpx 24rpx; background:#dcedc8; box-shadow:0 4rpx 14rpx rgba(55,98,53,.08); }

.bubble-meta {
  display:flex;
  flex:none;
  flex-direction:column;
  align-self:flex-end;
  color:#7c827a;
  font-size:18rpx;
  line-height:1.4;
}
.mine .bubble-meta { align-items:flex-end; }

.chat-empty {
  display:flex;
  min-height:380rpx;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:var(--tago-muted);
  text-align:center;
}
.chat-empty b { color:var(--tago-ink); font-size:27rpx; }
.chat-empty text { margin-top:10rpx; font-size:20rpx; }

.encounter-modal {
  position:fixed;
  z-index:50;
  inset:0;
  display:flex;
  align-items:flex-end;
  background:rgba(27,40,34,.35);
}

.encounter-sheet {
  width:100%;
  max-height:82dvh;
  padding:34rpx 28rpx calc(25rpx + env(safe-area-inset-bottom));
  overflow:auto;
  border-radius:34rpx 34rpx 0 0;
  background:var(--tago-paper);
}

.sheet-title { display:block; color:#20241f; font-size:31rpx; font-weight:900; }
.sheet-tag {
  display:block;
  margin:14rpx 0 20rpx;
  padding:18rpx;
  border-radius:15rpx;
  background:var(--tago-note-yellow);
  font-size:22rpx;
  font-weight:820;
}

.encounter-sheet article {
  display:flex;
  flex-direction:column;
  gap:9rpx;
  margin-bottom:15rpx;
  padding:20rpx;
  border-radius:18rpx;
  background:#fffdf6;
}
.encounter-sheet article b { color:#20241f; font-size:21rpx; }
.encounter-sheet article text {
  padding:10rpx 14rpx;
  border-radius:12rpx;
  background:var(--tago-primary-weak);
  font-size:19rpx;
}

.encounter-sheet>button {
  height:70rpx;
  color:#fff;
  border-radius:999rpx;
  background:var(--tago-primary);
  line-height:70rpx;
}
</style>
