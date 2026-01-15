import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, Sparkles, MessageCircle, MoreVertical, RefreshCw, Zap } from 'lucide-react';
import { createChatSession } from '../services/ai';
import { ChatMessage } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../data/locales';

const ChatScreen: React.FC = () => {
  const { language, appConfig } = useSettings();
  const { user } = useAuth();
  const strings = t[language];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    chatSessionRef.current = createChatSession(appConfig);
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: strings.chat.welcome,
          timestamp: Date.now()
        }
      ]);
    }
  }, [language, appConfig]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (textInput: string = input) => {
    if (!textInput.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textInput,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      const botMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '', 
        timestamp: Date.now()
      }]);

      let fullText = '';
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId ? { ...msg, text: fullText } : msg
          ));
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = language === 'bn' ? 'দুঃখিত, একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন।' : 'Sorry, something went wrong. Please try again.';

      // Robust check for Quota Exceeded (429)
      const errString = JSON.stringify(error || {});
      const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.error?.code === 429 ||
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('"code":429');

      if (isQuotaError) {
         errorMessage = language === 'bn' 
           ? '⚠️ দুঃখিত, আজকের মতো AI কোটা শেষ হয়ে গেছে। দয়া করে কিছুক্ষণ পর বা কাল আবার চেষ্টা করুন।' 
           : '⚠️ Sorry, daily AI quota exceeded. Please try again later or tomorrow.';
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearHistory = () => {
    if(window.confirm('Clear all chat history?')) {
      setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: strings.chat.welcome,
        timestamp: Date.now()
      }]);
      chatSessionRef.current = createChatSession(appConfig); // Reset context
    }
  };

  // Advanced Markdown Parser
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => (
      <p key={i} className={`min-h-[1em] ${i > 0 ? 'mt-2' : ''} leading-7`}>
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    ));
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-500/30">
      
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
         <div className="absolute bottom-[20%] left-[-10%] w-[250px] h-[250px] bg-teal-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '7s' }} />
      </div>

      {/* Glass Header */}
      <div className="z-30 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-bounce"></div>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-white leading-tight">
              {strings.aiTitle}
            </h1>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Zap size={10} className="text-amber-500 fill-amber-500" />
              Online • Gemini 2.0 Flash
            </p>
          </div>
        </div>
        <button 
          onClick={clearHistory}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all active:scale-95"
          title="Clear History"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-0 z-10 scroll-smooth space-y-6">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isBot = msg.role === 'model';
          
          return (
            <div 
              key={msg.id} 
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1 
                  ${isUser 
                    ? 'bg-transparent overflow-hidden' 
                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {isUser ? (
                    user?.photoURL ? (
                      <img src={user.photoURL} alt="Me" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center rounded-full">
                        <User size={14} className="text-slate-500" />
                      </div>
                    )
                  ) : (
                    <Bot size={16} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>

                {/* Bubble */}
                <div className="group relative">
                  <div className={`px-5 py-3.5 shadow-md text-sm transition-all duration-300
                    ${isUser 
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    {renderMessageContent(msg.text)}
                  </div>

                  {/* Timestamp & Actions */}
                  <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-slate-400 opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {isBot && msg.text && (
                      <button 
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className={`text-[10px] flex items-center gap-1 transition-opacity ${copiedId === msg.id ? 'text-emerald-500 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}
                      >
                        {copiedId === msg.id ? <Check size={10} /> : <Copy size={10} />}
                        {copiedId === msg.id ? strings.chat.copied : strings.chat.copy}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start items-center gap-3 animate-in fade-in duration-300 pl-2">
             <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                <Bot size={16} className="text-emerald-600 dark:text-emerald-400" />
             </div>
             <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.15s]"></div>
               <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.3s]"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area (Floating Style) */}
      <div className="z-20 p-4 pb-[85px] bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 dark:to-transparent">
        
        {/* Suggestion Chips */}
        {messages.length < 3 && (
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mask-gradient">
            {strings.chat.suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                disabled={isLoading}
                className="flex-shrink-0 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all flex items-center gap-1 group whitespace-nowrap"
              >
                <Sparkles size={10} className="text-emerald-500 group-hover:animate-spin" /> {sug}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-[24px] shadow-2xl shadow-emerald-900/5 border border-slate-200 dark:border-slate-800">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={strings.typeMessage}
            rows={1}
            className="w-full bg-transparent text-slate-800 dark:text-white border-0 px-4 py-3.5 text-sm focus:ring-0 outline-none resize-none max-h-32 min-h-[48px] rounded-2xl"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="mb-1 mr-1 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={20} className={input.trim() ? 'translate-x-0.5' : ''} />
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

export default ChatScreen;