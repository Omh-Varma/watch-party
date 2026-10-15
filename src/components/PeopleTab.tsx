import { Crown, Circle, UserCog, LogOut } from 'lucide-react';
import { useState } from 'react';
import type { Participant } from '@/types';

interface PeopleTabProps {
  participants: Participant[];
  myId: string | null;
  isHost: boolean;
  onTransferHost: (participantId: string) => void;
  onKick: (participantId: string) => void;
}

export function PeopleTab({ participants, myId, isHost, onTransferHost, onKick }: PeopleTabProps) {
  const [confirmKick, setConfirmKick] = useState<string | null>(null);

  const active = participants.filter(isActive);
  const idle = participants.filter((p) => !isActive(p));
  const sorted = [...active, ...idle];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800">
        <span className="text-sm text-zinc-400">
          {participants.length} {participants.length === 1 ? 'person' : 'people'} watching
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-1">
        {sorted.map((p) => {
          const isMe = p.id === myId;
          const online = isActive(p);
          const canManage = isHost && !isMe && !p.is_host;
          return (
            <div
              key={p.id}
              className="ticket-stub flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900 transition-colors group"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 bg-zinc-700">
                  {online && <Circle className="w-full h-full text-emerald-500 fill-emerald-500" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-white truncate">{p.nickname}</span>
                  {isMe && <span className="text-xs text-zinc-500">(You)</span>}
                  {p.is_host && (
                    <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs text-zinc-600">
                  {online ? 'Active now' : 'Away'}
                </span>
              </div>

              {/* Host controls */}
              {canManage && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onTransferHost(p.id)}
                    title="Make host"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmKick(p.id)}
                    title="Remove from room"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Kick confirmation */}
              {confirmKick === p.id && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={() => {
                      onKick(p.id);
                      setConfirmKick(null);
                    }}
                    className="px-2 py-1 text-[10px] font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                  >
                    Kick
                  </button>
                  <button
                    onClick={() => setConfirmKick(null)}
                    className="px-2 py-1 text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {participants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-zinc-600 text-sm">Nobody here yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function isActive(p: Participant): boolean {
  const diff = Date.now() - new Date(p.last_seen).getTime();
  return diff < 30000;
}
