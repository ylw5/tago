<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, nextTick, shallowRef, watch } from 'vue'
import dayjs from 'dayjs'
import AppHeader from '@/components/business/AppHeader.vue'
import ChatComposer from '@/components/business/ChatComposer.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useTinodeConversation } from '@/composables/useTinodeConversation'
const conversationId=shallowRef(''),draft=shallowRef(''),messageScrollTop=shallowRef(0),initialScrollReady=shallowRef(false)
const {detail,messages,encounters,selectedEncounter,loading,connecting,sending,error,sendError,connected,load,send,openEncounter,closeEncounter}=useTinodeConversation()
// 关系上下文：从相遇快照提取 Tag 名 + 按接受认识日计算「第 N 天」（PRD FR-6.1）
const relationTag=computed(()=>{const summary=encounters.value[0]?.summary||detail.value?.latestEncounter?.summary;return summary?.match(/「(.+?)」/)?.[1]||null});
const relationDays=computed(()=>{const accepted=encounters.value[0]?.acceptedAt||detail.value?.latestEncounter?.acceptedAt;if(!accepted)return null;const days=dayjs().diff(dayjs(accepted),'day');return Math.max(1,days+1)});
const relationSubtitle=computed(()=>{if(!relationTag.value)return '因为一次真诚回答而相遇';return `因为 #${relationTag.value} 而认识${relationDays.value?` · 第 ${relationDays.value} 天`:''}`});
const peerAvatar=computed(()=>{const seed=detail.value?.peerIdentity?.publicId||detail.value?.peerIdentity?.avatarId||'peer';const index=Array.from(seed).reduce((sum,char)=>sum+char.charCodeAt(0),0)%7;return `/static/avatars/u${index}.png`})
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
async function showEncounter(id:string){await openEncounter(conversationId.value,id)}
function goBack(){
  if(getCurrentPages().length>1){
    uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/meet/index'})})
    return
  }
  uni.reLaunch({url:'/pages/meet/index'})
}
onLoad(q=>{conversationId.value=typeof q?.id==='string'?q.id:'';if(conversationId.value)load(conversationId.value)})
</script>
<template><view class="chat-page"><view class="chat-shell"><AppHeader back :title="detail?.peerIdentity?.displayName||'聊天'" :subtitle="relationSubtitle" compact @back="goBack"/><AsyncState :loading="loading || (!error && messages.length>0 && !initialScrollReady)" :error="error" :empty="!conversationId" empty-title="没有找到会话" @retry="load(conversationId)"><view v-if="!connected" class="connection" :class="{online:connected}"><i/>{{ connecting?'正在连接聊天服务':'聊天服务未连接' }}</view><scroll-view scroll-y class="messages" :scroll-top="messageScrollTop"><button v-if="encounters.length" class="encounter-banner" @click="showEncounter(encounters[0].id)"><view class="encounter-banner__stamp">相遇<br>记</view><text>你们因为「{{ encounters[0].summary||'一次 Tag' }}」相遇</text><small>看看彼此当时写下的回答 →</small></button><view v-if="messages.length" class="bubble-list"><view v-for="message in messages" :key="message.id" class="bubble-wrap" :class="{mine:message.mine}"><image class="bubble-avatar" :src="message.mine?'/static/avatars/u0.png':peerAvatar" mode="aspectFill"/><view class="bubble-body"><view class="bubble">{{ message.text }}</view><small>{{ message.time }}{{ message.mine?' · 已发送':'' }}</small></view></view></view><view v-else-if="connected" class="chat-empty"><b>连接成功</b><text>还没有消息，从一句真诚的问候开始吧。</text></view></scroll-view></AsyncState><ChatComposer v-model="draft" :connected="connected" :sending="sending" :error="sendError" @gift="giftHint" @send="sendMessage"/></view><view v-if="selectedEncounter" class="encounter-modal" @click="closeEncounter"><view class="encounter-sheet" @click.stop><text class="sheet-title">相遇时的回答</text><text class="sheet-tag"># {{ selectedEncounter.application.tag.body }}</text><article v-for="q in selectedEncounter.application.questions" :key="q.slot"><b>Q{{ q.slot }} {{ q.text }}</b><text>{{ selectedEncounter.application.publisherAnswers.find(a=>a.slot===q.slot)?.text||'—' }}</text><text>{{ selectedEncounter.application.applicantAnswers.find(a=>a.slot===q.slot)?.text||'—' }}</text></article><button @click="closeEncounter">收起</button></view></view></view></template>
<style scoped lang="scss">
.chat-page { min-height:100dvh; background:linear-gradient(180deg,#eff1ea 0%,#e9ebe4 100%); }
.chat-shell {
  display:flex;
  width:100%;
  max-width:var(--tago-content-width);
  height:100dvh;
  flex-direction:column;
  margin:0 auto;
  padding:0 28rpx;
  overflow:hidden;
}
.chat-shell :deep(.async-state__content) { display:flex; min-height:0; flex-direction:column; }

.connection {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10rpx;
  height:44rpx;
  color:var(--tago-muted);
  font-size:17rpx;
}

.connection i { width:12rpx; height:12rpx; border-radius:50%; background:#c9a06a; }
.connection.online i { background:#5f9f78; }
.messages { min-height:0; flex:1; padding:12rpx 4rpx 30rpx; }

.encounter-banner {
  position:relative;
  display:flex;
  width:94%;
  min-height:92rpx;
  flex-direction:column;
  justify-content:center;
  margin:4rpx auto 28rpx;
  padding:15rpx 24rpx;
  color:var(--tago-ink);
  border:0;
  border-radius:18rpx 28rpx;
  background:linear-gradient(150deg,#ecf1e5 0%,#e4eadf 100%);
  text-align:left;
  line-height:1.45;
}
.encounter-banner__stamp { position:absolute; top:-11rpx; right:18rpx; display:grid; width:58rpx; height:58rpx; place-items:center; color:#c87961; border:2rpx solid #c87961; border-radius:50%; background:rgba(255,252,244,.62); font-size:14rpx; font-weight:900; line-height:1.1; transform:rotate(8deg); }

.encounter-banner::after,
.encounter-sheet>button::after { border:0; }
.encounter-banner text { color:#20241f; font-size:21rpx; font-weight:820; }
.encounter-banner small { color:#6c7269; font-size:17rpx; }
.bubble-list { display:flex; flex-direction:column; gap:20rpx; }
.bubble-wrap { display:flex; align-items:flex-start; gap:11rpx; }
.bubble-wrap.mine { flex-direction:row-reverse; }
.bubble-avatar { flex:none; width:58rpx; height:58rpx; border:4rpx solid rgba(255,255,255,.9); border-radius:50%; box-shadow:0 4rpx 12rpx rgba(39,68,56,.12); }
.bubble-body { display:flex; max-width:calc(78% - 69rpx); flex-direction:column; align-items:flex-start; }
.mine .bubble-body { align-items:flex-end; }

.bubble {
  max-width:100%;
  padding:17rpx 22rpx;
  border:1rpx solid rgba(32,88,79,.06);
  border-radius:8rpx 24rpx 24rpx;
  background:#fffdf6;
  box-shadow:0 6rpx 16rpx rgba(39,68,56,.06);
  color:#252a24;
  font-size:23rpx;
  line-height:1.55;
  overflow-wrap:anywhere;
}

.mine .bubble {
  color:#242820;
  border-color:rgba(32,88,79,.08);
  border-radius:24rpx 8rpx 24rpx 24rpx;
  background:linear-gradient(155deg,#f3f7ef,#eaf1e2);
}

.bubble-wrap small { margin:5rpx 8rpx 0; color:#6c7269; font-size:15rpx; }

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
