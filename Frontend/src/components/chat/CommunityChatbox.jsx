import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users, Loader2 } from 'lucide-react';
import { useCommunityChatStore } from '../../store/communityChatStore';
import { useAuthStore } from '../../store/authStore';
import { getToken } from '../../services/apiClient';

export function CommunityChatbox() {
  const { 
    isOpen, toggleChatbox, messages, isConnected, 
    isLoadingHistory, connectHub, disconnectHub, 
    fetchHistory, sendMessage 
  } = useCommunityChatStore();
  const { user } = useAuthStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Connection & Fetch History on open
  useEffect(() => {
    if (isOpen && user) {
      const token = getToken();
      connectHub(token);
      fetchHistory();
    }
  }, [isOpen, user, connectHub, fetchHistory]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      disconnectHub();
    };
  }, [disconnectHub]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;

    await sendMessage(input);
    setInput('');
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Bubble Toggle Button */}
      <button
        onClick={toggleChatbox}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-300 group`}
        title="Nhắn tin cộng đồng"
      >
        {isOpen ? (
          <X className="w-6 h-6 rotate-90 transition-transform duration-300" />
        ) : (
          <div className="relative">
            <Users className="w-6 h-6 transition-transform duration-300 group-hover:rotate-6" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
            </span>
          </div>
        )}
      </button>

      {/* Main Chat Panel Container */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] sm:w-[410px] h-[540px] sm:h-[610px] bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-2xl rounded-2xl z-50 flex flex-col overflow-hidden animate-fade-in animate-slide-up">
          
          {/* Header Bar */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-100" />
              <div>
                <h3 className="text-sm font-bold tracking-wide">Nhắn tin cộng đồng</h3>
                <span className="text-[10px] text-blue-100 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
                </span>
              </div>
            </div>
            
            <button
              onClick={toggleChatbox}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {isLoadingHistory ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-10 px-6 text-center select-none h-full">
                <Users className="w-10 h-10 mb-3 text-indigo-400/70" />
                <p className="text-xs font-bold text-slate-700 mb-1">Phòng chat trống</p>
                <p className="text-[11px] leading-relaxed max-w-[280px]">
                  Hãy là người đầu tiên gửi tin nhắn vào cộng đồng!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === user.id;
                
                // Optional: show sender name if it's not 'me' and different from previous
                const showName = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.senderName}</span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {!isMe && showName && msg.senderAvatarUrl && (
                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-6 h-6 rounded-full border border-slate-200" />
                      )}
                      {!isMe && showName && !msg.senderAvatarUrl && (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                          {msg.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Spacer if consecutive message from same non-me user */}
                      {!isMe && !showName && <div className="w-6 h-6" />}
                      
                      <div
                        className={`max-w-[240px] sm:max-w-[280px] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm leading-relaxed border transition-all ${
                          isMe
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent rounded-br-sm font-medium'
                            : 'bg-white text-slate-800 border-slate-200/70 rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Text Form */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-slate-150 flex items-center gap-2 shrink-0 shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn với cộng đồng..."
              className="flex-grow bg-slate-100 border border-slate-200/80 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!input.trim() || !isConnected}
              className={`p-2 rounded-xl text-white transition-all ${
                input.trim() && isConnected
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
