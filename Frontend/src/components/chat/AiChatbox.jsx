import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MessageSquare, Send, X, ChevronLeft, Plus, 
  Trash2, Pin, Edit3, Loader2, Sparkles, Check, 
  HelpCircle, BookOpen, GraduationCap, Clock 
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/notificationStore';
import logoImg from '../../assets/logo.png';

// Simple lightweight Markdown formatter to handle bullet points, bolding, code, and breaks safely.
function formatMarkdown(text) {
  if (!text) return '';
  let formatted = text;

  // Escape HTML to prevent XSS
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```code``` -> <pre><code>code</code></pre>
  formatted = formatted.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `<pre class="bg-slate-800 text-slate-100 p-3 rounded-lg my-2 text-xs overflow-x-auto font-mono whitespace-pre-wrap">${p1.trim()}</pre>`;
  });

  // Inline code: `code` -> <code>code</code>
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-pink-600 px-1 py-0.5 rounded font-mono text-xs">$1</code>');

  // Bold: **text** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Bullet points: lines starting with * or - -> list items
  const lines = formatted.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.substring(2);
      let listPrefix = '';
      if (!inList) {
        inList = true;
        listPrefix = '<ul class="list-disc pl-5 my-1.5 space-y-1">';
      }
      return `${listPrefix}<li>${content}</li>`;
    } else {
      let listSuffix = '';
      if (inList) {
        inList = false;
        listSuffix = '</ul>';
      }
      return `${listSuffix}${line}`;
    }
  });
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  formatted = processedLines.join('\n');

  // Line breaks: \n -> <br />
  formatted = formatted.replace(/\n/g, '<br />');

  return formatted;
}

export function AiChatbox() {
  const { 
    sessions, activeSessionId, messages, isLoadingSessions, 
    isLoadingMessages, isSendingMessage, isOpen, toggleChatbox, 
    fetchSessions, fetchMessages, startNewSession, sendMessage, 
    renameSession, togglePinSession, deleteSession, setActiveSessionId 
  } = useChatStore();

  const { user } = useAuthStore();
  const location = useLocation();

  const [input, setInput] = useState('');
  const [view, setView] = useState('chat'); // 'chat' or 'list'
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Parse document ID if on the reader page
  const isReaderPage = location.pathname.startsWith('/reader/');
  const currentDocId = isReaderPage ? location.pathname.split('/')[2] : null;

  // Initialize and load sessions when chatbox is opened
  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  // Load messages whenever active session changes
  useEffect(() => {
    if (activeSessionId && isOpen) {
      fetchMessages(activeSessionId);
    }
  }, [activeSessionId, isOpen, fetchMessages]);

  // Auto-scroll chat to the bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSendingMessage]);

  // Auto-select latest session if activeSessionId is null and sessions load
  useEffect(() => {
    if (isOpen && !activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [isOpen, sessions, activeSessionId, setActiveSessionId]);

  if (!user) return null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSendingMessage) return;

    const messageText = input;
    setInput('');

    // If no active session, start a new one first
    if (!activeSessionId) {
      const newId = await startNewSession('Hội thoại mới');
      if (newId) {
        await sendMessage(messageText, currentDocId);
      }
    } else {
      await sendMessage(messageText, currentDocId);
    }
  };

  const handleStartNewSession = async () => {
    const newId = await startNewSession('Hội thoại mới');
    if (newId) {
      setView('chat');
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    setView('chat');
  };

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const handleSaveRename = async (e, id) => {
    e.stopPropagation();
    if (editTitleInput.trim()) {
      await renameSession(id, editTitleInput.trim());
    }
    setEditingSessionId(null);
  };

  const handleTogglePin = async (e, session) => {
    e.stopPropagation();
    await togglePinSession(session.id, !session.isPinned);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    toast.confirm(
      'Bạn có chắc chắn muốn xóa cuộc hội thoại này?',
      async () => {
        await deleteSession(id);
      },
      'Xóa cuộc hội thoại'
    );
  };

  // Quick prompt templates
  const templates = [
    { text: 'Giải thích ngữ pháp câu này', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { text: 'Lập lộ trình HSK3 trong 2 tháng', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { text: 'Kiểm tra từ vựng hôm nay', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { text: 'Tóm tắt nội dung tài liệu', icon: <Clock className="w-3.5 h-3.5" />, showOnlyInDoc: true }
  ];

  const handleTemplateClick = (text) => {
    setInput(text);
    chatInputRef.current?.focus();
  };

  return (
    <>
      {/* Floating Chat Bubble Toggle Button */}
      <button
        onClick={toggleChatbox}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-300 group`}
        title="Trợ lý học tập AI"
      >
        {isOpen ? (
          <X className="w-6 h-6 rotate-90 transition-transform duration-300" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 transition-transform duration-300 group-hover:rotate-6" />
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
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <img
                src={logoImg}
                alt="Hanora logo"
                className="w-6 h-6 object-contain"
              />
              <div>
                <h3 className="text-sm font-bold tracking-wide">Hanora AI Tutor</h3>
                <span className="text-[10px] text-slate-300/80">Trợ lý học tiếng Trung cá nhân</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView(view === 'chat' ? 'list' : 'chat')}
                className="text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-all"
              >
                {view === 'chat' ? 'Lịch sử' : 'Quay lại Chat'}
              </button>
              <button
                onClick={toggleChatbox}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contextual Reader Workspace Banner */}
          {isReaderPage && view === 'chat' && (
            <div className="bg-sky-50 border-b border-sky-100 px-4 py-1.5 flex items-center gap-1.5 shrink-0 text-[11px] text-sky-700 font-semibold select-none">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Đang kết nối ngữ cảnh trang Dịch thuật</span>
            </div>
          )}

          {/* View Body Switcher */}
          <div className="flex-grow overflow-hidden relative min-h-0 bg-slate-50/50">
            {view === 'list' ? (
              
              /* 1. CONVERSATION HISTORY LIST VIEW */
              <div className="h-full flex flex-col p-4 overflow-y-auto">
                <button
                  onClick={handleStartNewSession}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bắt đầu cuộc trò chuyện mới</span>
                </button>

                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 select-none">Hội thoại của bạn</h4>

                {isLoadingSessions ? (
                  <div className="flex-grow flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-55" />
                    <p className="text-xs">Chưa có lịch sử trò chuyện.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 flex-grow pr-1 overflow-y-auto min-h-0">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all hover:shadow-sm ${
                          activeSessionId === session.id 
                            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold' 
                            : 'bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-grow pr-2">
                          <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                          
                          {editingSessionId === session.id ? (
                            <input
                              type="text"
                              value={editTitleInput}
                              onChange={(e) => setEditTitleInput(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(e, session.id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              className="bg-white border border-slate-350 text-xs px-1.5 py-0.5 rounded outline-none w-full text-slate-800 font-normal"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs truncate">{session.title}</span>
                          )}

                          {session.isPinned && (
                            <Pin className="w-3 h-3 text-amber-500 rotate-45 shrink-0" />
                          )}
                        </div>

                        {/* Interactive Edit / Pin / Delete buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingSessionId === session.id ? (
                            <button
                              onClick={(e) => handleSaveRename(e, session.id)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleStartRename(e, session)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded"
                                title="Đổi tên"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleTogglePin(e, session)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded"
                                title={session.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                              >
                                <Pin className={`w-3.5 h-3.5 ${session.isPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, session.id)}
                                className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (

              /* 2. ACTIVE CONVERSATION CHAT VIEW */
              <div className="h-full flex flex-col min-h-0">
                {/* Active Chat Scroll Area */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 min-h-0">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-10 px-6 text-center select-none">
                      <Sparkles className="w-10 h-10 mb-3 text-indigo-500/70" />
                      <p className="text-xs font-bold text-slate-700 mb-1">Hanora AI Learning Assistant</p>
                      <p className="text-[11px] leading-relaxed max-w-[280px]">
                        Tôi có thể giúp bạn giải thích ngữ pháp, kiểm tra từ vựng, tóm tắt bài đọc dịch thuật hoặc giải đáp cấu trúc tiếng Trung. Hãy thử chọn một mẫu câu bên dưới!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed border transition-all ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent rounded-tr-none font-medium'
                              : 'bg-white text-slate-800 border-slate-200/70 rounded-tl-none'
                          }`}
                          dangerouslySetInnerHTML={{ 
                            __html: msg.role === 'user' ? msg.content : formatMarkdown(msg.content) 
                          }}
                        />
                        <span className="text-[9px] text-slate-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}

                  {isSendingMessage && (
                    <div className="flex flex-col items-start animate-pulse">
                      <div className="bg-white text-slate-700 border border-slate-200/75 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                        <span className="text-xs font-medium">Gia sư AI đang viết câu trả lời...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Templates row (only if input is empty) */}
                {!input.trim() && !isSendingMessage && (
                  <div className="px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0 select-none border-t border-slate-100 bg-white">
                    {templates
                      .filter(t => !t.showOnlyInDoc || isReaderPage)
                      .map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTemplateClick(t.text)}
                          className="flex items-center gap-1 shrink-0 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-150 text-[10px] text-slate-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm"
                        >
                          {t.icon}
                          <span>{t.text}</span>
                        </button>
                      ))}
                  </div>
                )}

                {/* Input Text Form */}
                <form
                  onSubmit={handleSend}
                  className="p-3 bg-white border-t border-slate-150 flex items-center gap-2 shrink-0 shadow-inner"
                >
                  <input
                    type="text"
                    ref={chatInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={activeSessionId ? "Hỏi gia sư Hanora..." : "Bắt đầu hội thoại mới..."}
                    className="flex-grow bg-slate-100 border border-slate-200/80 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                    disabled={isSendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isSendingMessage}
                    className={`p-2 rounded-xl text-white transition-all ${
                      input.trim() && !isSendingMessage
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 shadow-md'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AiChatbox;
