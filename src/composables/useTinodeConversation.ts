import { computed, onUnmounted, shallowRef, watch } from 'vue'
import type { Tinode, TinodeMessage, TinodeTopic } from 'tinode-sdk'
import { ensureTinodeSession, tinodeSession, syncTinodeUnread, withChatTimeout } from './useTinodeSession'
import { createConversationConnection, getChatDetail, getEncounterDetail, listEncounters } from '@/api/chat'
import type { ConversationDetailDto, EncounterDetailDto } from '@/api/chat'

export interface LiveMessage { id:string; text:string; mine:boolean; time:string; sequence:number; read?:boolean }

export function useTinodeConversation() {
  const detail=shallowRef<ConversationDetailDto|null>(null),messages=shallowRef<LiveMessage[]>([]),encounters=shallowRef<Awaited<ReturnType<typeof listEncounters>>['items']>([]),selectedEncounter=shallowRef<EncounterDetailDto|null>(null)
  const loading=shallowRef(false),connecting=shallowRef(false),sending=shallowRef(false),error=shallowRef(''),sendError=shallowRef(''),connected=shallowRef(false)
  let tinode:Tinode|null=null, topic:TinodeTopic|null=null, me:string|null=null
  let activeTopicHandle:string|null=null
  let visible=true, revision=0, currentConversation=''
  let topicWork:Promise<void>=Promise.resolve(), leaving:Promise<unknown>=Promise.resolve()
  function markRead(seq?:number){if(visible && (typeof document==='undefined'||document.visibilityState!=='hidden') && topic)try{topic.noteRead(seq);syncTinodeUnread(topic)}catch{/* 已读回执失败不影响消息展示 */}}
  function release(){
    revision++
    const previous=topic
    topic=null;activeTopicHandle=null;connected.value=false;connecting.value=false
    if(previous){previous.onData=undefined;previous.onInfo=undefined;previous.onMetaSub=undefined;previous.onAllMessagesReceived=undefined;leaving=previous.leave(false).catch(()=>{})}
  }
  function hide(){visible=false;release()}
  function show(){visible=true;if(currentConversation&&!topic&&!connecting.value)void connect(currentConversation).catch(cause=>{error.value=cause instanceof Error?cause.message:'聊天连接失败'})}
  function visibilityChanged(){if(typeof document!=='undefined'&&document.visibilityState==='visible')markRead()}
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibilityChanged)
  const stopSessionWatch=watch(tinodeSession.client,client=>{
    if(!client){release();return}
    if(visible&&currentConversation&&!connecting.value)show()
  },{flush:'sync'})

  function textOf(message?:TinodeMessage){return !message?'':typeof message.content==='string'?message.content:message.content?.txt||''}
  function readByPeer(sequence:number){try{return (topic?.msgReadCount(sequence)||0)>0}catch{return false}}
  function ingest(message?:TinodeMessage){const text=textOf(message);if(!message||!text)return;const sequence=message.seq||Date.now();const mine=message.from===me;const item:LiveMessage={id:String(sequence),sequence,text,mine,read:mine&&readByPeer(sequence),time:new Date(message.ts||Date.now()).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})};const next=messages.value.filter(existing=>existing.id!==item.id);next.push(item);messages.value=next.sort((a,b)=>a.sequence-b.sequence);if(!mine&&message.seq)markRead(message.seq)}
  function refreshReadState(){messages.value=messages.value.map(item=>item.mine?{...item,read:readByPeer(item.sequence)}:item)}
  function connect(conversationId:string){
    const task=topicWork.catch(()=>{}).then(()=>{if(visible&&currentConversation===conversationId)return attach(conversationId)})
    topicWork=task
    return task
  }
  async function attach(conversationId:string){
    release()
    const attempt=revision
    connecting.value=true
    topic=null
    activeTopicHandle=null
    connected.value=false
    messages.value=[]
    try{
      await leaving
      if(attempt!==revision||!visible)return
      const conversation=await createConversationConnection(conversationId)
      if(attempt!==revision||!visible)return
      tinode=await ensureTinodeSession()
      if(attempt!==revision||!visible)return
      me=tinode.getCurrentUserID()
      const activeTopic=tinode.getTopic(conversation.topicHandle)
      topic=activeTopic
      activeTopicHandle=conversation.topicHandle
      activeTopic.onData=ingest
      activeTopic.onInfo=info=>{if(info.what==='read')refreshReadState()}
      activeTopic.onMetaSub=refreshReadState
      // SDK 0.25.3 会用历史消息模拟 read 通知，覆盖订阅中的对方已读序号；历史收完后重新取服务端状态。
      activeTopic.onAllMessagesReceived=()=>{void activeTopic.getMeta({what:'sub'}).catch(()=>{})}
      // sub 元数据携带对方的 read 序号，用于展示「已读」。
      await withChatTimeout(activeTopic.subscribe({what:'sub data',data:{limit:50}}))
      if(attempt!==revision||!visible){activeTopic.onData=undefined;activeTopic.onInfo=undefined;activeTopic.onMetaSub=undefined;activeTopic.onAllMessagesReceived=undefined;await activeTopic.leave(false).catch(()=>{});return}
      const history:TinodeMessage[]=[]
      activeTopic.messages(message=>history.push(message))
      history.forEach(ingest)
      refreshReadState()
      markRead()
      error.value=''
      connected.value=true
    }catch(cause){if(attempt===revision){release();throw cause}}finally{if(attempt===revision)connecting.value=false}
  }
  async function load(conversationId:string){currentConversation=conversationId;loading.value=true;error.value='';try{const [conversation,history]=await Promise.all([getChatDetail(conversationId),listEncounters(conversationId,{limit:30})]);detail.value=conversation;encounters.value=history.items;await connect(conversationId)}catch(cause){error.value=cause instanceof Error?cause.message:'聊天连接失败'}finally{loading.value=false}}
  async function send(text:string){
    if(!connected.value||!text.trim()||sending.value)return false
    const attempt=revision
    sending.value=true
    sendError.value=''
    try{
      if(!tinode||!topic||!activeTopicHandle){sendError.value='聊天连接已断开，请稍后重试';return false}
      // 避开 tinode-sdk 0.25.x Topic.publish 的错误回调缺陷：发送失败时它会无参数触发 onData，
      // 既覆盖服务端原始错误，也可能让消息被误判为发送成功。直接走客户端发布可保留真实 reject。
      const clientMessageId=crypto.randomUUID()
      const message=tinode.createMessage(activeTopicHandle,text.trim(),true)
      message.head={clientMessageId}
      const published=await tinode.publishMessage(message)
      if(attempt===revision)ingest({seq:published.params?.seq,from:me||undefined,ts:published.ts,content:text.trim()})
      return true
    }catch(cause){sendError.value=cause instanceof Error?cause.message:'消息发送失败';return false}finally{sending.value=false}}
  async function openEncounter(conversationId:string,encounterId:string){selectedEncounter.value=await getEncounterDetail(conversationId,encounterId)}
  function closeEncounter(){selectedEncounter.value=null}
  onUnmounted(()=>{hide();stopSessionWatch();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibilityChanged)})
  return{detail:computed(()=>detail.value),messages:computed(()=>messages.value),encounters:computed(()=>encounters.value),selectedEncounter:computed(()=>selectedEncounter.value),loading:computed(()=>loading.value),connecting:computed(()=>connecting.value),sending:computed(()=>sending.value),error:computed(()=>error.value),sendError:computed(()=>sendError.value),connected:computed(()=>connected.value),load,send,openEncounter,closeEncounter,show,hide}
}
