import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Image, Mic, MicOff, Smile, X, Search,
  MessageSquare, Check, CheckCheck, Play, Pause, ChevronLeft
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useTheme } from '../contexts/ThemeContext';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tenant {
  id: string;
  residents: { name: string; email: string; photo?: string; isTitular?: boolean }[];
  property_id: string;
  propertyName?: string;
}

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

function groupByDate(messages: ChatMessage[]) {
  const groups: { label: string; messages: ChatMessage[] }[] = [];
  let currentLabel = '';
  messages.forEach(msg => {
    const d = new Date(msg.created_at);
    let label = isToday(d) ? 'Hoje' : isYesterday(d) ? 'Ontem' : format(d, "dd 'de' MMMM", { locale: ptBR });
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  });
  return groups;
}

// Gera barras de waveform pseudo-aleatórias mas determinísticas por URL
function generateBars(seed: string, count = 30): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0; }
  return Array.from({ length: count }, (_, i) => {
    h = (Math.imul(31, h) + i) | 0;
    return 20 + Math.abs(h % 80);
  });
}

function AudioMessage({ url, isOwner }: { url: string; isOwner: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = generateBars(url);
  const BAR_COUNT = bars.length;
  const activeBars = Math.round((progress / 100) * BAR_COUNT);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={url}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          if (audioRef.current?.duration)
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }} />
      <button onClick={toggle}
        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-colors">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      {/* Waveform */}
      <div className="flex items-center gap-[2px] flex-1 h-8">
        {bars.map((h, i) => (
          <div key={i}
            className="rounded-full flex-shrink-0 transition-colors"
            style={{
              width: 3,
              height: `${Math.max(4, (h / 100) * 32)}px`,
              background: i < activeBars
                ? (isOwner ? 'rgba(255,255,255,1)' : '#2563eb')
                : (isOwner ? 'rgba(255,255,255,0.35)' : 'rgba(37,99,235,0.3)')
            }}
          />
        ))}
      </div>
      <span className="text-[10px] opacity-60 flex-shrink-0 tabular-nums">
        {audioRef.current?.duration
          ? `${Math.floor(audioRef.current.duration / 60)}:${String(Math.floor(audioRef.current.duration % 60)).padStart(2, '0')}`
          : '0:00'}
      </span>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);
  const recordingRef = useRef(false); // evita closure stale

  // Fetch tenants
  useEffect(() => {
    if (!user) return;
    const fetchTenants = async () => {
      const { data: tenantData } = await supabase.from('tenants').select('id, residents, property_id').eq('owner_id', user.uid);
      const { data: propData } = await supabase.from('properties').select('id, name').eq('owner_id', user.uid);
      const propMap: Record<string, string> = {};
      (propData || []).forEach(p => { propMap[p.id] = p.name; });
      const enriched = (tenantData || []).map(t => ({ ...t, propertyName: propMap[t.property_id] || 'Imóvel' }));
      setTenants(enriched);
    };
    fetchTenants();
  }, [user]);

  // Fetch unread counts
  useEffect(() => {
    if (!user || tenants.length === 0) return;
    const fetchUnread = async () => {
      const { data } = await supabase.from('chat_messages')
        .select('tenant_id')
        .eq('owner_id', user.uid)
        .eq('read_by_owner', false)
        .eq('sender_role', 'tenant');
      const counts: Record<string, number> = {};
      (data || []).forEach(m => { counts[m.tenant_id] = (counts[m.tenant_id] || 0) + 1; });
      setUnreadMap(counts);
    };
    fetchUnread();
  }, [user, tenants]);

  // Load messages for selected tenant
  const loadMessages = useCallback(async (tenantId: string) => {
    if (!user) return;
    const { data } = await supabase.from('chat_messages')
      .select('*')
      .eq('owner_id', user.uid)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Mark as read
    await supabase.from('chat_messages')
      .update({ read_by_owner: true })
      .eq('owner_id', user.uid)
      .eq('tenant_id', tenantId)
      .eq('sender_role', 'tenant');
    setUnreadMap(prev => ({ ...prev, [tenantId]: 0 }));
  }, [user]);

  useEffect(() => {
    if (!selectedTenant || !user) return;
    loadMessages(selectedTenant.id);

    // Realtime subscription
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`chat_${user.uid}_${selectedTenant.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `tenant_id=eq.${selectedTenant.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
          supabase.from('chat_messages').update({ read_by_owner: true }).eq('id', payload.new.id);
        })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [selectedTenant, user, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const uploadMedia = async (blob: Blob, ext: string): Promise<string | null> => {
    const path = `${user!.uid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, blob, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const sendMessage = async (type: ChatMessage['message_type'], content?: string, mediaUrl?: string) => {
    if (!user || !selectedTenant) return;
    setSending(true);
    await supabase.from('chat_messages').insert({
      owner_id: user.uid,
      tenant_id: selectedTenant.id,
      sender_role: 'owner',
      message_type: type,
      content: content || null,
      media_url: mediaUrl || null,
      read_by_owner: true,
      read_by_tenant: false,
    });
    setSending(false);
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

  const handleEmojiClick = async (emojiData: EmojiClickData) => {
    setShowEmoji(false);
    await sendMessage('emoji', emojiData.emoji);
  };

  // Segurar para gravar
  const handleMicPointerDown = async (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = ev => audioChunksRef.current.push(ev.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!recordingRef.current) return; // cancelado
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = await uploadMedia(blob, 'webm');
        if (url) await sendMessage('audio', undefined, url);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      recordingRef.current = true;
      setRecording(true);
    } catch { alert('Permita acesso ao microfone para gravar áudio.'); }
  };

  const handleMicPointerUp = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    recordingRef.current = false;
  };

  const filteredTenants = tenants.filter(t => {
    const name = t.residents?.[0]?.name || '';
    return name.toLowerCase().includes(search.toLowerCase()) || (t.propertyName || '').toLowerCase().includes(search.toLowerCase());
  });

  const tenantName = (t: Tenant) => t.residents?.[0]?.name || 'Inquilino';

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">

        {/* Sidebar - Lista de inquilinos */}
        <div className={`${showSidebar ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex-shrink-0`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Conversas</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar inquilino..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-6">
                <MessageSquare size={40} />
                <p className="text-sm text-center">Nenhum inquilino cadastrado ainda.</p>
              </div>
            ) : filteredTenants.map(t => {
              const titular = t.residents?.find(r => r.isTitular) || t.residents?.[0];
              return (
              <button key={t.id} onClick={() => { setSelectedTenant(t); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 ${selectedTenant?.id === t.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}>
                {titular?.photo ? (
                  <img src={titular.photo} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {tenantName(t).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{tenantName(t)}</p>
                    {(unreadMap[t.id] || 0) > 0 && (
                      <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {unreadMap[t.id]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t.propertyName}</p>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        {/* Área do Chat */}
        <div className={`${!showSidebar ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {!selectedTenant ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <MessageSquare size={36} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700 dark:text-slate-300">Selecione uma conversa</p>
                <p className="text-sm mt-1">Escolha um inquilino para começar a conversar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header do chat */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <ChevronLeft size={20} />
                </button>
                {(() => {
                  const tit = selectedTenant.residents?.find(r => r.isTitular) || selectedTenant.residents?.[0];
                  return tit?.photo ? (
                    <img src={tit.photo} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {tenantName(selectedTenant).charAt(0).toUpperCase()}
                    </div>
                  );
                })()}
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{tenantName(selectedTenant)}</p>
                  <p className="text-xs text-slate-500">{selectedTenant.propertyName}</p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                    <MessageSquare size={32} />
                    <p className="text-sm">Nenhuma mensagem ainda. Diga olá! 👋</p>
                  </div>
                )}
                {groupByDate(messages).map(group => (
                  <div key={group.label}>
                    <div className="flex justify-center my-4">
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium px-3 py-1 rounded-full">
                        {group.label}
                      </span>
                    </div>
                    {group.messages.map(msg => {
                      const isOwner = msg.sender_role === 'owner';
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isOwner ? 'justify-end' : 'justify-start'} mb-2`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${isOwner ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm'}`}>
                            {msg.message_type === 'text' && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                            {msg.message_type === 'emoji' && <p className="text-3xl">{msg.content}</p>}
                            {msg.message_type === 'image' && msg.media_url && (
                              <img src={msg.media_url} alt="foto" className="max-w-full rounded-xl max-h-60 object-cover cursor-pointer"
                                onClick={() => window.open(msg.media_url!, '_blank')} />
                            )}
                            {msg.message_type === 'audio' && msg.media_url && <AudioMessage url={msg.media_url} isOwner={isOwner} />}
                            <div className={`flex items-center gap-1 mt-1 justify-end ${isOwner ? 'opacity-70' : 'opacity-50'}`}>
                              <span className="text-[10px]">{formatMsgDate(msg.created_at)}</span>
                              {isOwner && (msg.read_by_tenant ? <CheckCheck size={12} /> : <Check size={12} />)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input de mensagem */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                <AnimatePresence>
                  {showEmoji && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-24 right-4 z-50 shadow-2xl rounded-2xl overflow-hidden">
                      <EmojiPicker onEmojiClick={handleEmojiClick} theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                        height={380} width={320} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  {/* Emoji */}
                  <button onClick={() => setShowEmoji(v => !v)}
                    className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${showEmoji ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {showEmoji ? <X size={20} /> : <Smile size={20} />}
                  </button>

                  {/* Imagem */}
                  <button onClick={() => fileRef.current?.click()}
                    className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
                    <Image size={20} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleSendImage} />

                  {/* Texto */}
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5">
                    <textarea value={text} onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                      placeholder="Digite uma mensagem..."
                      rows={1} style={{ resize: 'none' }}
                      className="w-full bg-transparent outline-none text-slate-900 dark:text-white text-sm placeholder-slate-400 max-h-32 overflow-y-auto" />
                  </div>

                  {/* Enviar / Gravar */}
                  {text.trim() ? (
                    <button onClick={handleSendText} disabled={sending}
                      className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex-shrink-0 disabled:opacity-50">
                      <Send size={20} />
                    </button>
                  ) : (
                    <button
                      onPointerDown={handleMicPointerDown}
                      onPointerUp={handleMicPointerUp}
                      onPointerLeave={handleMicPointerUp}
                      onContextMenu={e => e.preventDefault()}
                      className={`p-2.5 rounded-xl transition-all flex-shrink-0 select-none touch-none ${
                        recording ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/40' : 'bg-primary text-white hover:bg-primary/90'
                      }`}>
                      <Mic size={20} />
                    </button>
                  )}
                </div>
                {recording && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-red-500 font-bold text-center mt-2 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                    Gravando... Solte para enviar
                  </motion.p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
