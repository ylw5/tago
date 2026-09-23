import { computed, onUnmounted, shallowRef } from 'vue'
import type { Tinode, TinodeMessage, TinodeTopic } from 'tinode-sdk'
import * as TinodeModule from 'tinode-sdk'
import { createChatConnection, createConversationConnection, getChatDetail, getEncounterDetail, listEncounters } from '@/api/chat'
import type { ConversationDetailDto, EncounterDetailDto } from '@/api/chat'
import { FIXTURES_ENABLED } from '@/api/client'
import { fixtureChatMessages, fixtureChatReply } from '@/mocks/fixtures'

export interface LiveMessage { id:string; text:string; mine:boolean; time:string; sequence:number }

type TinodeFactory = typeof TinodeModule.Tinode
// Node resolves this UMD package to { default: { Tinode } }; Vite may expose the named class.
const createTinode:TinodeFactory = TinodeModule.Tinode ?? (TinodeModule.default as unknown as { Tinode: typeof TinodeModule.Tinode }).Tinode
const CHAT_SUBSCRIBE_TIMEOUT_MS=3000

function encodeChatSecret(value:string) {
  const digits='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes=Array.from(value, character => character.charCodeAt(0))
  let output=''
  for(let index=0;index<bytes.length;index+=3){
    const a=bytes[index]!,b=bytes[index+1]??0,c=bytes[index+2]??0
    output+=digits[a>>2]
    output+=digits[(a&3)<<4|b>>4]
    output+=index+1<bytes.length?digits[(b&15)<<2|c>>6]:'='
    output+=index+2<bytes.length?digits[c&63]:'='
  }
  return output
}

async function waitForChatHandshake(instance:Tinode) {
  for(let attempt=0;attempt<100;attempt+=1){
    if(instance.getServerInfo())return
    await new Promise(resolve=>setTimeout(resolve,50))
  }
  throw new Error('聊天握手超时')
}

export function useTinodeConversation() {
  const detail=shallowRef<ConversationDetailDto|null>(null),messages=shallowRef<LiveMessage[]>([]),encounters=shallowRef<Awaited<ReturnType<typeof listEncounters>>['items']>([]),selectedEncounter=shallowRef<EncounterDetailDto|null>(null)
  const loading=shallowRef(false),connecting=shallowRef(false),sending=shallowRef(false),error=shallowRef(''),sendError=shallowRef(''),connected=shallowRef(false)
  let tinode:Tinode|null=null, topic:TinodeTopic|null=null, me:string|null=null
  let activeTopicHandle:string|null=null
  let fixtureSequence=0
  let chatActivityFallback=false

  function textOf(message?:TinodeMessage){return !message?'':typeof message.content==='string'?message.content:message.content?.txt||''}
  function ingest(message?:TinodeMessage){const text=textOf(message);if(!message||!text)return;const sequence=message.seq||Date.now();const item:LiveMessage={id:String(sequence),sequence,text,mine:message.from===me,time:new Date(message.ts||Date.now()).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})};const next=messages.value.filter(existing=>existing.id!==item.id);next.push(item);messages.value=next.sort((a,b)=>a.sequence-b.sequence)}
  function pushLocal(text:string,mine:boolean){fixtureSequence+=1;const item:LiveMessage={id:`local-${fixtureSequence}`,sequence:fixtureSequence,text,mine,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})};messages.value=[...messages.value,item]}
  function useChatActivityFallback(conversationId:string){
    // 聊天活动服务单接口降级：REST 会话与相遇数据仍来自真实后端。
    chatActivityFallback=true
    topic=null
    activeTopicHandle=null
    tinode?.disconnect()
    tinode=null
    const script=fixtureChatMessages(conversationId)
    fixtureSequence=Math.max(0,...script.map(item=>item.sequence))
    messages.value=script
  }

  async function connect(conversationId:string){
    connecting.value=true
    chatActivityFallback=false
    topic=null
    activeTopicHandle=null
    connected.value=false
    messages.value=[]
    try{
      if(FIXTURES_ENABLED){
        // 静态演示模式：不连接真实聊天引擎，直接播放静态消息剧本
        me='me'
        const script=fixtureChatMessages(conversationId)
        fixtureSequence=Math.max(0,...script.map(item=>item.sequence))
        messages.value=script
        await new Promise(resolve=>setTimeout(resolve,350))
        connected.value=true
        return
      }
      const conversation=await createConversationConnection(conversationId)
      // Tinode ticket is single-use: fetch the topic first, then issue the login ticket.
      const bootstrap=await createChatConnection()
      const endpoint=new URL(bootstrap.endpoint)
      tinode=new createTinode({host:endpoint.host,secure:endpoint.protocol==='https:',apiKey:bootstrap.apiKey,appName:'TAGO H5',platform:'web',transport:'ws',persist:false})
      tinode.onDisconnect=()=>{connected.value=false}
      await tinode.connect()
      await waitForChatHandshake(tinode)
      await tinode.login(bootstrap.authenticationScheme,encodeChatSecret(bootstrap.ticket))
      me=tinode.getCurrentUserID()
      const activeTopic=tinode.getTopic(conversation.topicHandle)
      topic=activeTopic
      activeTopicHandle=conversation.topicHandle
      activeTopic.onData=ingest
      try{
        await Promise.race([
          activeTopic.subscribe({what:'data',data:{limit:50}}),
          new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('聊天活动订阅超时')),CHAT_SUBSCRIBE_TIMEOUT_MS)),
        ])
        const history:TinodeMessage[]=[]
        activeTopic.messages(message=>history.push(message))
        history.forEach(ingest)
      }catch{
        useChatActivityFallback(conversationId)
      }
      connected.value=true
    }catch(cause){connected.value=false;throw cause}finally{connecting.value=false}
  }
  async function load(conversationId:string){loading.value=true;error.value='';try{const [conversation,history]=await Promise.all([getChatDetail(conversationId),listEncounters(conversationId,{limit:30})]);detail.value=conversation;encounters.value=history.items;await connect(conversationId)}catch(cause){error.value=cause instanceof Error?cause.message:'聊天连接失败'}finally{loading.value=false}}
  async function send(text:string){
    if(!connected.value||!text.trim()||sending.value)return false
    sending.value=true
    sendError.value=''
    try{
      if(FIXTURES_ENABLED){
        // 静态演示模式：本地回显 + 一条预设回复，让对话可以完整走通
        pushLocal(text.trim(),true)
        await new Promise(resolve=>setTimeout(resolve,700))
        pushLocal(fixtureChatReply(text.trim()),false)
        return true
      }
      if(chatActivityFallback){
        pushLocal(text.trim(),true)
        await new Promise(resolve=>setTimeout(resolve,700))
        pushLocal(fixtureChatReply(text.trim()),false)
        return true
      }
      if(!tinode||!topic||!activeTopicHandle){sendError.value='聊天连接已断开，请稍后重试';return false}
      // 避开 tinode-sdk 0.25.x Topic.publish 的错误回调缺陷：发送失败时它会无参数触发 onData，
      // 既覆盖服务端原始错误，也可能让消息被误判为发送成功。直接走客户端发布可保留真实 reject。
      const clientMessageId=crypto.randomUUID()
      const message=tinode.createMessage(activeTopicHandle,text.trim(),true)
      message.head={clientMessageId}
      const published=await tinode.publishMessage(message)
      ingest({seq:published.params?.seq,from:me||undefined,ts:published.ts,content:text.trim()})
      return true
    }catch(cause){sendError.value=cause instanceof Error?cause.message:'消息发送失败';return false}finally{sending.value=false}}
  async function openEncounter(conversationId:string,encounterId:string){selectedEncounter.value=await getEncounterDetail(conversationId,encounterId)}
  function closeEncounter(){selectedEncounter.value=null}
  onUnmounted(()=>tinode?.disconnect())
  return{detail:computed(()=>detail.value),messages:computed(()=>messages.value),encounters:computed(()=>encounters.value),selectedEncounter:computed(()=>selectedEncounter.value),loading:computed(()=>loading.value),connecting:computed(()=>connecting.value),sending:computed(()=>sending.value),error:computed(()=>error.value),sendError:computed(()=>sendError.value),connected:computed(()=>connected.value),load,send,openEncounter,closeEncounter}
}
