<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, shallowRef } from 'vue'
import type { ApplicationDto } from '@/api/social'
import { acceptApplication, getApplication, rejectApplication } from '@/api/social'
import { getProfile } from '@/api/account'
import AppHeader from '@/components/business/AppHeader.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import { goBack } from '@/utils/navigation'
const application=shallowRef<ApplicationDto|null>(null),loading=shallowRef(true),working=shallowRef(false),error=shallowRef('')
const myPublicId=shallowRef('')
const isPublisher=computed(()=>Boolean(application.value&&myPublicId.value===application.value.publisherIdentity.publicId))
const counterparty=computed(()=>{const item=application.value;if(!item)return null;return isPublisher.value?item.applicantIdentity:item.publisherIdentity})
const relationNote=computed(()=>isPublisher.value?'TA 想因为这个 Tag 认识你':'你想因为这个 Tag 认识 TA')
const pageSubtitle=computed(()=>{const state=application.value?.state;if(!application.value)return'看看这次认真写下的回答';if(isPublisher.value)return'一个有趣的人，想和你聊聊这个 Tag！';if(state==='ACCEPTED')return'对方接受了这次认识';if(state!=='PENDING')return'这次申请已经结束了';return'你发出的申请，正在等对方看看'})
const canDecide=computed(()=>application.value?.state==='PENDING'&&isPublisher.value)
const canOpenChat=computed(()=>application.value?.state==='ACCEPTED'&&Boolean(application.value.conversationId))
const statusLabel=computed(()=>{const state=application.value?.state;if(!isPublisher.value){if(state==='PENDING')return'等待对方回应';if(state==='ACCEPTED')return'已经认识';return'本次申请已结束'};return ({ACCEPTED:'已接受',REJECTED:'已婉拒',EXPIRED:'已过期'} as Record<string,string>)[state||'']||'已结束'})
const rows=computed(()=>{
  const item=application.value
  if(!item)return[]
  const mineIsPublisher=isPublisher.value
  const mine=mineIsPublisher?item.publisherIdentity:item.applicantIdentity
  const theirs=mineIsPublisher?item.applicantIdentity:item.publisherIdentity
  return item.questions.map(q=>({
    slot:q.slot,
    question:q.text,
    mine:item[ mineIsPublisher?'publisherAnswers':'applicantAnswers'].find(a=>a.slot===q.slot)?.text||'—',
    theirs:item[ mineIsPublisher?'applicantAnswers':'publisherAnswers'].find(a=>a.slot===q.slot)?.text||'—',
    mineAvatarId:mine.avatarId,
    theirAvatarId:theirs.avatarId,
    icon:q.slot%3===2?'/static/illustrations/meet-seedling.png':'/static/stickers/sticker-book.png',
    deco:['✦','♡','☾'][(q.slot-1)%3],
  }))
})
async function load(id:string){loading.value=true;error.value='';try{const [item,profile]=await Promise.all([getApplication(id),getProfile()]);application.value=item;myPublicId.value=profile.publicId}catch(cause){error.value=cause instanceof Error?cause.message:'申请详情加载失败'}finally{loading.value=false}}
async function accept(){if(!application.value||!isPublisher.value)return;working.value=true;try{const result=await acceptApplication(application.value.id);uni.redirectTo({url:`/pages/chat/index?id=${encodeURIComponent(result.conversationId)}`})}catch(cause){uni.showToast({title:cause instanceof Error?cause.message:'接受失败',icon:'none'})}finally{working.value=false}}
async function reject(){if(!application.value||!isPublisher.value)return;working.value=true;try{application.value=await rejectApplication(application.value.id);uni.showToast({title:'已婉拒这次申请',icon:'none'})}catch(cause){uni.showToast({title:cause instanceof Error?cause.message:'拒绝失败',icon:'none'})}finally{working.value=false}}
function openChat(){const id=application.value?.conversationId;if(id)uni.navigateTo({url:`/pages/chat/index?id=${encodeURIComponent(id)}`})}
onLoad(q=>{const id=typeof q?.id==='string'?q.id:'';if(id)load(id);else{loading.value=false;error.value='缺少申请 ID'}})
</script>
<template>
  <view class="tago-page tago-page--detail compare-page">
    <AppHeader class="compare-header" back title="认识申请" :subtitle="pageSubtitle" @back="goBack" />
    <view class="compare-slogan" aria-hidden="true">
      <text>好的相遇</text>
      <text>从一个共同的兴趣开始</text>
      <text class="compare-slogan__smile">◡̈</text>
    </view>
    <AsyncState :loading="loading" :error="error" :empty="!application" empty-title="没有找到这条认识申请" empty-description="返回申请列表，查看其他认识申请。" @retry="application && load(application.id)">
      <section v-if="application" class="tag-card">
        <view class="tag-card__profile">
          <view class="tag-card__avatar">
            <AvatarImage :id="counterparty?.avatarId" />
          </view>
          <view class="tag-card__identity">
            <b>{{ counterparty?.displayName }}</b>
            <small>{{ relationNote }}</small>
          </view>
        </view>
        <view class="tag-card__aside" aria-hidden="true">
          <text>好书会让</text>
          <text>平凡的日子发光</text>
        </view>
        <image class="tag-card__books" src="/static/stickers/books.png" mode="aspectFit" aria-hidden="true" />
        <view class="tag-card__title"><text># {{ application.tag.body }}</text></view>
        <text class="tag-card__note">{{ '“让每一次相遇，\n都从共同的兴趣开始～”' }}</text>
      </section>
      <section v-if="application" class="compare-heading">
        <strong>我们在这些问题上的回答</strong>
        <small>{{ '不同的回答，\n让我们看见彼此更真实的样子 ♡' }}</small>
      </section>
      <section class="compare-list">
        <article v-for="row in rows" :key="row.slot">
          <header class="question-head">
            <b class="question-head__number">Q{{ row.slot }}</b>
            <h2>{{ row.question }}</h2>
            <image :src="row.icon" mode="aspectFit" aria-hidden="true" />
          </header>
          <view class="answer-pair">
            <view class="answer answer--mine">
              <AvatarImage :id="row.mineAvatarId" />
              <view><small>我的回答</small><text>{{ row.mine }}</text></view>
            </view>
            <view class="answer answer--theirs">
              <AvatarImage :id="row.theirAvatarId" />
              <view><small>TA 的回答</small><text>{{ row.theirs }}</text></view>
              <text class="answer__deco" aria-hidden="true">{{ row.deco }}</text>
            </view>
          </view>
        </article>
      </section>
      <view v-if="canDecide" class="actions">
        <button class="decline" :disabled="working" @click="reject">暂时不了</button>
        <button class="accept" :loading="working" @click="accept">认识 TA</button>
      </view>
      <button v-else-if="canOpenChat" class="chat-link" @click="openChat">去聊天</button>
      <view v-else-if="application" class="finished">{{ statusLabel }}</view>
      <text v-if="canDecide" class="closing-note">或许这会是一段有趣的相遇 ☺</text>
    </AsyncState>
  </view>
</template>

<style scoped lang="scss">
$marker-yellow: #f6d77e;
$marker-green: #d3e8cc;
$paper-yellow: #fbefc7;

.compare-page { position:relative; }

/* 头部：标题 + 右上角猫咪插画 */
.compare-page :deep(.compare-header) {
  min-height:168rpx;
  padding:calc(20rpx + env(safe-area-inset-top)) 28rpx 12rpx 84rpx;
  aspect-ratio:auto;
}
.compare-page :deep(.compare-header .header__back) {
  top: calc(20rpx + env(safe-area-inset-top));
  height: 64rpx;
  line-height: 60rpx;
}
.compare-page :deep(.compare-header .header__eyebrow),
.compare-page :deep(.compare-header .header__doodle) { display:none; }
.compare-page :deep(.compare-header .header__copy) { padding-right:0; }
.compare-page :deep(.compare-header .header__title) {
  position:relative;
  align-self:flex-start;
  margin-top:4rpx;
  font-size:46rpx;
  letter-spacing:4rpx;
}
.compare-page :deep(.compare-header .header__title::after) {
  position:absolute;
  top:2rpx;
  right:-34rpx;
  width:7rpx;
  height:22rpx;
  border-radius:6rpx;
  background:#f2c94c;
  box-shadow:10rpx 12rpx 0 -1rpx #f2c94c;
  content:'';
  transform:rotate(38deg);
}
.compare-page :deep(.compare-header .header__subtitle) { margin-top:10rpx; font-size:23rpx; }
.compare-page :deep(.compare-header)::after {
  position:absolute;
  top:calc(34rpx + env(safe-area-inset-top));
  right:-26rpx;
  z-index:1;
  width:290rpx;
  height:145rpx;
  background:url('/static/illustrations/header-cat.png') right bottom / contain no-repeat;
  content:'';
  pointer-events:none;
}
.compare-slogan {
  position:absolute;
  top:calc(16rpx + env(safe-area-inset-top));
  right:110rpx;
  z-index:2;
  display:flex;
  align-items:center;
  flex-direction:column;
  color:var(--tago-muted);
  font-size:19rpx;
  line-height:1.5;
  transform:rotate(-6deg);
  pointer-events:none;
}
.compare-slogan__smile { font-size:24rpx; line-height:1; }

/* 申请人 Tag 卡片：黄色纸片 */
.tag-card {
  position:relative;
  min-height:310rpx;
  overflow:hidden;
  padding:24rpx 26rpx 24rpx;
  border-radius:10rpx 16rpx 12rpx 18rpx;
  background:
    radial-gradient(circle at 12% 18%, rgba(255,255,255,.35), transparent 42%),
    $paper-yellow;
  box-shadow:0 8rpx 22rpx rgba(120,94,30,.12), inset 0 0 0 2rpx rgba(236,208,132,.55), inset 0 0 26rpx rgba(236,200,110,.28);
}
.tag-card__profile { position:relative; z-index:1; display:flex; align-items:center; gap:16rpx; margin-bottom:8rpx; }
.tag-card__avatar { position:relative; flex:none; width:92rpx; height:92rpx; padding:6rpx; border-radius:50%; background:#fbe29a; }
.tag-card__avatar::after {
  position:absolute;
  top:-4rpx;
  right:-18rpx;
  width:6rpx;
  height:18rpx;
  border-radius:6rpx;
  background:#f2c94c;
  box-shadow:10rpx 10rpx 0 -1rpx #f2c94c;
  content:'';
  transform:rotate(40deg);
}
.tag-card__avatar .avatar-image { display:block; width:100%; height:100%; border:4rpx solid #fff; border-radius:50%; box-sizing:border-box; }
.tag-card__identity { display:flex; min-width:0; flex-direction:column; gap:6rpx; }
.tag-card__identity b { font-size:38rpx; font-weight:800; line-height:1.2; overflow-wrap:anywhere; }
.tag-card__identity small { color:var(--tago-muted); font-size:22rpx; }
.tag-card__aside {
  position:absolute;
  top:28rpx;
  right:40rpx;
  display:flex;
  align-items:center;
  flex-direction:column;
  color:var(--tago-muted);
  font-size:18rpx;
  line-height:1.45;
  transform:rotate(-6deg);
}
.tag-card__books { position:absolute; right:4rpx; bottom:6rpx; width:250rpx; height:180rpx; }
.tag-card__title {
  position:relative;
  z-index:1;
  width:fit-content;
  max-width:calc(100% - 170rpx);
  margin:8rpx 0 12rpx;
  padding:6rpx 14rpx;
  border-radius:12rpx 18rpx 14rpx 16rpx;
  background:$marker-yellow;
}
.tag-card__title text {
  font-size:44rpx;
  font-weight:900;
  line-height:1.45;
  letter-spacing:1rpx;
  overflow-wrap:anywhere;
}
.tag-card__note {
  position:relative;
  z-index:1;
  display:block;
  max-width:calc(100% - 200rpx);
  color:#5f655e;
  font-size:22rpx;
  line-height:1.55;
  white-space:pre-line;
}

/* 分区标题 */
.compare-heading { display:flex; align-items:center; justify-content:space-between; gap:12rpx; margin:24rpx 0 12rpx; }
.compare-heading strong {
  flex:none;
  padding:6rpx 18rpx;
  border-radius:6rpx 18rpx 8rpx 16rpx;
  background:$marker-green;
  font-size:28rpx;
  font-weight:800;
  line-height:1.35;
}
.compare-heading small { color:var(--tago-muted); font-size:18rpx; line-height:1.45; text-align:center; white-space:pre-line; transform:rotate(-3deg); }

/* 问题对比卡片 */
.compare-list { display:flex; flex-direction:column; gap:16rpx; }
.compare-list article {
  padding:12rpx 12rpx 12rpx;
  border-radius:12rpx 18rpx 14rpx 16rpx;
  background:rgba(255,253,248,.96);
  box-shadow:0 6rpx 18rpx rgba(39,68,56,.08);
}
.question-head { display:grid; grid-template-columns:auto 1fr 56rpx; align-items:center; gap:12rpx; margin-bottom:8rpx; padding:0 4rpx; }
.question-head__number {
  padding:0 10rpx;
  background:linear-gradient(180deg, transparent 22%, $marker-yellow 22%, $marker-yellow 90%, transparent 90%);
  border-radius:6rpx 12rpx;
  font-size:30rpx;
  font-weight:800;
  line-height:1.3;
}
.question-head h2 { margin:0; font-size:25rpx; font-weight:800; line-height:1.4; }
.question-head>image { width:50rpx; height:44rpx; }
.answer-pair { display:grid; grid-template-columns:1fr 1fr; gap:12rpx; }
.answer {
  position:relative;
  display:grid;
  min-width:0;
  min-height:136rpx;
  grid-template-columns:54rpx minmax(0,1fr);
  align-items:start;
  gap:10rpx;
  padding:14rpx 12rpx;
  border-radius:8rpx 16rpx 10rpx 14rpx;
}
.answer--mine { background:var(--tago-note-green); }
.answer--theirs { background:var(--tago-note-blue); }
.answer>.avatar-image { width:54rpx; height:54rpx; border:3rpx solid rgba(255,255,255,.95); border-radius:50%; box-sizing:border-box; }
.answer>view { display:flex; min-width:0; flex-direction:column; gap:4rpx; }
.answer small { color:var(--tago-ink); font-size:21rpx; font-weight:800; line-height:1.3; }
.answer text { color:#454b46; font-size:21rpx; line-height:1.55; overflow-wrap:anywhere; }
.answer .answer__deco { position:absolute; top:10rpx; right:14rpx; color:#f2c94c; font-size:26rpx; line-height:1; }

/* 操作按钮 */
.actions { position:relative; display:grid; grid-template-columns:1fr 1fr; gap:24rpx; margin:20rpx 0 8rpx; padding:0 34rpx; }
.actions::before,
.actions::after {
  position:absolute;
  top:6rpx;
  width:6rpx;
  height:20rpx;
  border-radius:6rpx;
  background:#f2c94c;
  content:'';
}
.actions::before { left:6rpx; box-shadow:-2rpx 26rpx 0 -1rpx #f2c94c; transform:rotate(-40deg); }
.actions::after { right:6rpx; box-shadow:2rpx 26rpx 0 -1rpx #f2c94c; transform:rotate(40deg); }
.actions button { width:100%; height:80rpx; margin:0; padding:0; border-radius:999rpx; font-size:29rpx; font-weight:700; line-height:80rpx; letter-spacing:2rpx; }
.actions button::after { border:0; }
.decline { color:var(--tago-primary); border:2rpx solid var(--tago-primary); background:rgba(255,255,255,.7); }
.accept { color:#fff; background:var(--tago-primary); box-shadow:0 8rpx 18rpx rgba(32,88,79,.2); }
.closing-note { display:block; margin-top:4rpx; color:var(--tago-muted); font-size:20rpx; text-align:center; }
.chat-link { display:block; width:62%; max-width:420rpx; height:80rpx; margin:20rpx auto 8rpx; color:#fff; border-radius:999rpx; background:var(--tago-primary); box-shadow:0 8rpx 18rpx rgba(32,88,79,.2); font-size:29rpx; font-weight:700; line-height:80rpx; }
.chat-link::after { border:0; }
.finished { margin:25rpx; padding:22rpx; color:var(--tago-muted); text-align:center; }

@media(max-width:360px) {
  .compare-slogan { right:100rpx; font-size:17rpx; }
  .tag-card__books { width:170rpx; height:122rpx; }
  .tag-card__title { max-width:calc(100% - 130rpx); }
  .tag-card__title text { font-size:36rpx; }
  .compare-heading strong { font-size:26rpx; }
  .answer { grid-template-columns:48rpx minmax(0,1fr); gap:8rpx; padding:12rpx 10rpx; }
  .answer>.avatar-image { width:48rpx; height:48rpx; }
  .answer text { font-size:20rpx; }
  .question-head h2 { font-size:24rpx; }
}
</style>
