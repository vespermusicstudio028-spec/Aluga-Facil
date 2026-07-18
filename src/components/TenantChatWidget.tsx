import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Image, Mic, MicOff, Check, CheckCheck, Play, Pause, Smile } from 'lucide-react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  owner_id: string;
  tenant_id: string;
  sender_role: 'owner' | 'tenant';
  message_type: 'text' | 'image' | 'audio' | 'emoji';
  content: string | null;
  media_url: string | null;
  read_by_owner: boolean;
  read_by_tenant: boolean;
  created_at: string;
}

function formatMsgDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem ' + format(d, 'HH:mm');
  return format(d, "dd/MM 'às' HH:mm", { locale: ptBR });
}

function generateBars(seed: string, count = 30): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0; }
  return Array.from({ length: count }, (_, i) => {
    h = (Math.imul(31, h) + i) | 0;
    return 20 + Math.abs(h % 80);
  });
}

function AudioMessage({ url, isSender }: { url: string; isSender: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = generateBars(url, 24); // menos barras pro modal
  const activeBars = Math.round((progress / 100) * bars.length);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-1.5 min-w-[150px]">
      <audio ref={audioRef} src={url}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          if (audioRef.current?.duration)
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }} />
      <button onClick={toggle}
        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-colors">
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <div className="flex items-center gap-[2px] flex-1 h-6">
        {bars.map((h, i) => (
          <div key={i}
            className="rounded-full flex-shrink-0 transition-colors"
            style={{
              width: 2,
              height: `${Math.max(4, (h / 100) * 24)}px`,
              background: i < activeBars
                ? (isSender ? 'rgba(255,255,255,1)' : '#2563eb')
                : (isSender ? 'rgba(255,255,255,0.35)' : 'rgba(37,99,235,0.3)')
            }}
          />
        ))}
      </div>
      <span className="text-[9px] opacity-60 flex-shrink-0 tabular-nums">
        {audioRef.current?.duration
          ? `${Math.floor(audioRef.current.duration / 60)}:${String(Math.floor(audioRef.current.duration % 60)).padStart(2, '0')}`
          : '0:00'}
      </span>
    </div>
  );
}

export default function TenantChatWidget({ tenant, ownerInfo }: { tenant: any, ownerInfo: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);
  const recordingRef = useRef(false);

  // Load and subscribe
  useEffect(() => {
    if (!tenant?.id || !tenant?.ownerId) return;

    const loadMessages = async () => {
      if (!tenant?.id || !tenant?.ownerId) return;
      const { data, error } = await supabase.rpc('get_chat_messages', {
        p_owner_id: tenant.ownerId,
        p_tenant_id: tenant.id
      });
      if (error) console.error('get_chat_messages error:', error);
      
      const msgs = Array.isArray(data) ? data : (data ? JSON.parse(typeof data === 'string' ? data : JSON.stringify(data)) : []);
      
      setMessages(prev => {
        const tempMsgs = prev.filter(m => m.id.startsWith('temp_'));
        if (prev.length === msgs.length + tempMsgs.length) return prev;
        return [...msgs, ...tempMsgs];
      });

      const unread = msgs.filter((m: any) => m.sender_role === 'owner' && !m.read_by_tenant).length;
      setUnreadCount(unread);
    };

    loadMessages();

    // Sincronização Ativa (Polling)
    const syncInterval = setInterval(() => {
      loadMessages();
    }, 3000);

    // Subscribe to new messages
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`tenant_chat_${tenant.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `tenant_id=eq.${tenant.id}` 
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        // Inquilino ignora suas próprias mensagens via Realtime
        if (msg.sender_role === 'tenant') return;
        
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_role === 'owner') {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { 
      clearInterval(syncInterval);
      if (channelRef.current) supabase.removeChannel(channelRef.current); 
    };
  }, [tenant]);

  // Read messages when open
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      supabase.rpc('mark_chat_read', {
        p_owner_id: tenant.ownerId,
        p_tenant_id: tenant.id,
        p_reader: 'tenant'
      }).then(() => setUnreadCount(0));
    }
  }, [isOpen, tenant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const uploadMedia = async (blob: Blob, ext: string): Promise<string | null> => {
    const path = `tenants/${tenant.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, blob, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const sendMessage = async (type: ChatMessage['message_type'], content?: string, mediaUrl?: string) => {
    if (!tenant?.id) return;

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      owner_id: tenant.ownerId,
      tenant_id: tenant.id,
      sender_role: 'tenant',
      message_type: type,
      content: content || null,
      media_url: mediaUrl || null,
      read_by_owner: false,
      read_by_tenant: true,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase.rpc('send_chat_message', {
        p_owner_id:       tenant.ownerId,
        p_tenant_id:      tenant.id,
        p_sender_role:    'tenant',
        p_message_type:   type,
        p_content:        content || null,
        p_media_url:      mediaUrl || null,
        p_read_by_owner:  false,
        p_read_by_tenant: true,
      });

      if (error) {
        console.error('ERRO AO ENVIAR:', error);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        alert('Falha ao enviar: ' + error.message);
      } else {
        const saved = (data && typeof data === 'object' && !Array.isArray(data)) ? data : (data?.[0] ?? data);
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== tempId);
          if (!saved) return withoutTemp;
          if (withoutTemp.some(m => m.id === saved.id)) return withoutTemp;
          return [...withoutTemp, saved as ChatMessage];
        });
      }
    } catch (err: any) {
      console.error('Exceção ao enviar:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await sendMessage('text', trimmed);
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadMedia(file, file.name.split('.').pop() || 'jpg');
    if (url) await sendMessage('image', undefined, url);
    e.target.value = '';
  };

  const handleMicPointerDown = async (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = ev => audioChunksRef.current.push(ev.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!recordingRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = await uploadMedia(blob, 'webm');
        if (url) await sendMessage('audio', undefined, url);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      recordingRef.current = true;
      setRecording(true);
    } catch { alert('Permita acesso ao microfone.'); }
  };

  const handleMicPointerUp = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    recordingRef.current = false;
  };

  return (
    <>
      {/* Botão Flutuante */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className={`w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform relative ${isOpen ? 'scale-0' : 'scale-100'}`}
        >
          <MessageSquare size={26} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Janela de Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-full max-w-[360px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                {ownerInfo?.photo ? (
                  <img src={ownerInfo.photo} alt="Proprietário" className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {ownerInfo?.name?.charAt(0).toUpperCase() || 'P'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white leading-tight">{ownerInfo?.name || 'Seu Proprietário'}</h3>
                  <p className="text-white/70 text-xs">Proprietário</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <MessageSquare size={32} />
                  <p className="text-sm text-center">Inicie a conversa com o proprietário.</p>
                </div>
              )}
              {messages.map(msg => {
                const isSender = msg.sender_role === 'tenant';
                return (
                  <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl shadow-sm ${isSender ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-slate-900 border border-slate-100 rounded-bl-sm'}`}>
                      {msg.message_type === 'text' && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                      {msg.message_type === 'emoji' && <p className="text-3xl">{msg.content}</p>}
                      {msg.message_type === 'image' && msg.media_url && (
                        <img src={msg.media_url} alt="anexo" className="max-w-full rounded-xl max-h-40 object-cover cursor-pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                      )}
                      {msg.message_type === 'audio' && msg.media_url && <AudioMessage url={msg.media_url} isSender={isSender} />}
                      
                      <div className={`flex items-center gap-1 mt-1 justify-end ${isSender ? 'opacity-70' : 'opacity-50'}`}>
                        <span className="text-[10px]">{formatMsgDate(msg.created_at)}</span>
                        {isSender && (msg.read_by_owner ? <CheckCheck size={12} /> : <Check size={12} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              <AnimatePresence>
                {showEmoji && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-[70px] left-2 right-2 z-50 shadow-2xl rounded-2xl overflow-hidden">
                    <EmojiPicker onEmojiClick={(d) => { setShowEmoji(false); sendMessage('emoji', d.emoji); }} 
                      height={300} width="100%" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2">
                <button onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-xl transition-colors ${showEmoji ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {showEmoji ? <X size={20} /> : <Smile size={20} />}
                </button>

                <button onClick={() => fileRef.current?.click()} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                  <Image size={20} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleSendImage} />

                <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2">
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                    placeholder="Sua mensagem..." rows={1} style={{ resize: 'none' }}
                    className="w-full bg-transparent outline-none text-slate-900 text-sm max-h-24 overflow-y-auto" />
                </div>

                {text.trim() ? (
                  <button onClick={handleSendText} className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 flex-shrink-0">
                    <Send size={16} className="-ml-0.5" />
                  </button>
                ) : (
                  <button
                    onPointerDown={handleMicPointerDown}
                    onPointerUp={handleMicPointerUp}
                    onPointerLeave={handleMicPointerUp}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all select-none touch-none ${
                      recording ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-500/40' : 'bg-primary text-white'
                    }`}
                  >
                    <Mic size={16} />
                  </button>
                )}
              </div>
              {recording && <p className="text-[10px] text-red-500 font-bold text-center mt-1 animate-pulse">Solte para enviar áudio</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
