import { useState } from 'react';
import { Plus, BarChart3, X, Check } from 'lucide-react';

interface PollData {
  poll: { id: string; room_id: string; question: string; created_by: string | null; created_at: string };
  options: { id: string; poll_id: string; text: string }[];
  votes: { id: string; poll_id: string; option_id: string; participant_id: string; created_at: string }[];
}

interface PollsTabProps {
  polls: PollData[];
  onCreatePoll: (question: string, options: string[]) => void;
  onVote: (pollId: string, optionId: string) => void;
  myId: string | null;
}

export function PollsTab({ polls, onCreatePoll, onVote, myId }: PollsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || options.filter((o) => o.trim()).length < 2) return;
    onCreatePoll(question, options);
    setQuestion('');
    setOptions(['', '']);
    setShowCreate(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm text-zinc-400">{polls.length} polls</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
        >
          {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showCreate ? 'Cancel' : 'New Poll'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 border-b border-zinc-800 space-y-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question..."
            maxLength={200}
            className="retro-input w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                maxLength={100}
                className="retro-input flex-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ''])}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          )}
          <button
            type="submit"
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Create Poll
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
        {polls.length === 0 && !showCreate && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">No polls yet</p>
            <p className="text-zinc-600 text-xs mt-1">Create one to get everyone's vote</p>
          </div>
        )}
        {polls.map(({ poll, options: pollOptions, votes }) => {
          const totalVotes = votes.length;
          const myVote = votes.find((v) => v.participant_id === myId);
          return (
            <div key={poll.id} className="ticket-stub poll-card bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">{poll.question}</h3>
              <div className="space-y-2">
                {pollOptions.map((opt) => {
                  const voteCount = votes.filter((v) => v.option_id === opt.id).length;
                  const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  const isMyVote = myVote?.option_id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => onVote(poll.id, opt.id)}
                      className="relative w-full overflow-hidden rounded-xl border transition-colors text-left group"
                      style={{
                        borderColor: isMyVote ? '#9f2f2d' : '#776d5c',
                      }}
                    >
                      <div
                        className="absolute inset-0 transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isMyVote ? '#9f2f2d35' : '#776d5c35',
                        }}
                      />
                      <div className="relative flex items-center justify-between px-3.5 py-2.5">
                        <span className="text-sm text-white flex items-center gap-2">
                          {isMyVote && <Check className="w-3.5 h-3.5 text-violet-400" />}
                          {opt.text}
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                          {totalVotes > 0 ? `${Math.round(pct)}%` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-zinc-600">
                  {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
                {myVote && <span className="text-xs text-violet-400">Voted</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
