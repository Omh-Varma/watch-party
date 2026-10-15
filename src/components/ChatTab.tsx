import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '@/types';

interface ChatTabProps {
  messages: Message[];
  onSend: (content: string, nickname: string, color: string) => void;
  nickname: string;
  color: string;
  myId: string | null;
}

export function ChatTab({ messages, onSend, nickname, color, myId }: ChatTabProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input, nickname, color);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-zinc-600 text-sm">No messages yet</p>
            <p className="text-zinc-700 text-xs mt-1">Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.participant_id === myId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-semibold" style={{ color: msg.color }}>
                    {msg.nickname}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div
                  className={`ticket-stub px-3.5 py-2 rounded-2xl text-sm break-words ${
                    isMe
                      ? 'bg-violet-600 text-white rounded-br-md'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="retro-input flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
