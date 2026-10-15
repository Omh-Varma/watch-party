import type { Reaction } from '@/types';

interface EmojiReactionsProps {
  reactions: Reaction[];
}

export function EmojiReactions({ reactions }: EmojiReactionsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {reactions.map((reaction) => {
        const leftPercent = 10 + Math.random() * 80;
        const animationName = `floatUp-${reaction.id.replace(/[^a-zA-Z0-9]/g, '')}`;
        return (
          <div
            key={reaction.id}
            className="absolute text-4xl"
            style={{
              left: `${leftPercent}%`,
              bottom: '0%',
              animation: `${animationName} 4s ease-out forwards`,
            }}
          >
            <style>{`
              @keyframes ${animationName} {
                0% {
                  bottom: 0%;
                  opacity: 0;
                  transform: translateX(0) scale(0.5);
                }
                15% {
                  opacity: 1;
                  transform: translateX(0) scale(1.2);
                }
                30% {
                  transform: translateX(10px) scale(1);
                }
                50% {
                  transform: translateX(-15px) scale(1);
                }
                70% {
                  transform: translateX(10px) scale(1);
                }
                100% {
                  bottom: 100%;
                  opacity: 0;
                  transform: translateX(0) scale(0.8);
                }
              }
            `}</style>
            {reaction.emoji}
          </div>
        );
      })}
    </div>
  );
}
