import { useState, useEffect, useRef } from 'react';
import { Send, X, Users, Loader2 } from 'lucide-react';
import { useCommunityChatStore } from '../../store/communityChatStore';
import { useAuthStore } from '../../store/authStore';

export function CommunityChatbox() {
  const {
    isOpen,
    toggleChatbox,
    messages,
    isConnected,
    isConnecting,
    connectionError,
    isLoadingHistory,
    connectHub,
    disconnectHub,
    fetchHistory,
    sendMessage,
  } = useCommunityChatStore();
  const { user } = useAuthStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      connectHub();
      fetchHistory();
    }
  }, [isOpen, user, connectHub, fetchHistory]);

  useEffect(() => {
    return () => {
      disconnectHub();
    };
  }, [disconnectHub]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;

    await sendMessage(input.trim());
    setInput('');
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={toggleChatbox}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-4 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/30 active:scale-95 lg:bottom-6 lg:right-6"
        title="Nhắn tin cộng đồng"
      >
        {isOpen ? (
          <X className="h-6 w-6 rotate-90 transition-transform duration-300" />
        ) : (
          <div className="relative">
            <Users className="h-6 w-6 transition-transform duration-300" />
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-200 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-50 flex h-[min(68vh,560px)] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-md animate-fade-in animate-slide-up sm:inset-x-auto sm:right-6 sm:h-[610px] sm:w-[410px] lg:bottom-24">
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-100" />
              <div>
                <h3 className="text-sm font-bold tracking-wide">Nhắn tin cộng đồng</h3>
                <span className="flex items-center gap-1 text-[10px] text-blue-100">
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-amber-300' : 'bg-red-400'}`} />
                  {isConnected ? 'Đã kết nối' : isConnecting ? 'Đang kết nối...' : 'Chưa kết nối'}
                </span>
              </div>
            </div>

            <button
              onClick={toggleChatbox}
              className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Đóng chat cộng đồng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-grow space-y-4 overflow-y-auto bg-slate-50/50 p-4">
            {isLoadingHistory ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : connectionError ? (
              <div className="flex h-full select-none flex-col items-center justify-center px-6 py-10 text-center text-red-500">
                <Users className="mb-3 h-10 w-10 text-red-300" />
                <p className="mb-1 text-xs font-bold text-red-700">Không thể kết nối chat</p>
                <p className="max-w-[280px] text-[11px] leading-relaxed">{connectionError}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full select-none flex-col items-center justify-center px-6 py-10 text-center text-slate-400">
                <Users className="mb-3 h-10 w-10 text-indigo-400/70" />
                <p className="mb-1 text-xs font-bold text-slate-700">Phòng chat trống</p>
                <p className="max-w-[280px] text-[11px] leading-relaxed">
                  Hãy là người đầu tiên gửi tin nhắn vào cộng đồng!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === user.id;
                const showName = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                const messageKey = msg.id ?? `${msg.senderId}-${msg.createdAt}-${idx}`;

                return (
                  <div key={messageKey} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <span className="mb-1 ml-1 text-[10px] font-bold text-slate-500">{msg.senderName}</span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {!isMe && showName && msg.senderAvatarUrl && (
                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="h-6 w-6 rounded-full border border-slate-200" />
                      )}
                      {!isMe && showName && !msg.senderAvatarUrl && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                          {msg.senderName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      {!isMe && !showName && <div className="h-6 w-6" />}

                      <div
                        className={`max-w-[240px] rounded-2xl border px-3.5 py-2 text-[13px] leading-relaxed shadow-sm transition-all sm:max-w-[280px] ${
                          isMe
                            ? 'rounded-br-sm border-transparent bg-gradient-to-br from-blue-600 to-indigo-600 font-medium text-white'
                            : 'rounded-bl-sm border-slate-200/70 bg-white text-slate-800'
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

          <form onSubmit={handleSend} className="flex shrink-0 items-center gap-2 border-t border-slate-150 bg-white p-3 shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn với cộng đồng..."
              className="flex-grow rounded-xl border border-slate-200/80 bg-slate-100 px-4 py-2 text-xs text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!input.trim() || !isConnected}
              className={`rounded-xl p-2 text-white transition-all ${
                input.trim() && isConnected
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md hover:from-blue-500 hover:to-indigo-500 active:scale-95'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
