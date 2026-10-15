interface ArtProps {
  className?: string;
}

export function FilmReelArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="52" stroke="#211f1b" strokeWidth="4" fill="#344b40" />
      <circle cx="60" cy="60" r="12" stroke="#211f1b" strokeWidth="3" fill="#211f1b" />
      <circle cx="60" cy="28" r="9" fill="#211f1b" />
      <circle cx="88" cy="44" r="9" fill="#211f1b" />
      <circle cx="88" cy="76" r="9" fill="#211f1b" />
      <circle cx="60" cy="92" r="9" fill="#211f1b" />
      <circle cx="32" cy="76" r="9" fill="#211f1b" />
      <circle cx="32" cy="44" r="9" fill="#211f1b" />
      <circle cx="60" cy="28" r="3.5" fill="#c18a3e" />
      <circle cx="88" cy="44" r="3.5" fill="#c18a3e" />
      <circle cx="88" cy="76" r="3.5" fill="#c18a3e" />
      <circle cx="60" cy="92" r="3.5" fill="#c18a3e" />
      <circle cx="32" cy="76" r="3.5" fill="#c18a3e" />
      <circle cx="32" cy="44" r="3.5" fill="#c18a3e" />
      <path d="M60 72l0 38M60 72l30 22M60 72l-30 22" stroke="#c18a3e" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

export function ClapperboardArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 140 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="30" width="120" height="70" stroke="#211f1b" strokeWidth="4" fill="#211f1b" />
      <rect x="10" y="30" width="120" height="18" stroke="#211f1b" strokeWidth="4" fill="#e8dcc1" />
      <path d="M10 36 L30 30 M30 36 L50 30 M50 36 L70 30 M70 36 L90 30 M90 36 L110 30 M110 36 L130 30" stroke="#211f1b" strokeWidth="4" />
      <path d="M16 48 L34 48 L34 38 L16 38 Z" fill="#211f1b" opacity="0.7" transform="skewX(-15)" />
      <path d="M76 48 L94 48 L94 38 L76 38 Z" fill="#211f1b" opacity="0.7" transform="skewX(-15)" />
      <text x="70" y="80" textAnchor="middle" fill="#c18a3e" fontFamily="Impact, sans-serif" fontSize="18" fontWeight="bold" letterSpacing="2">ACTION!</text>
      <text x="70" y="93" textAnchor="middle" fill="#9f2f2d" fontFamily="monospace" fontSize="7" letterSpacing="1">SCENE 01 TAKE 01</text>
    </svg>
  );
}

export function PopcornBucketArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 100 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 45 L80 45 L72 115 L28 115 Z" stroke="#211f1b" strokeWidth="4" fill="#9f2f2d" />
      <path d="M25 50 L75 50" stroke="#c18a3e" strokeWidth="3" />
      <path d="M30 65 L70 65 M32 80 L68 80 M34 95 L66 95" stroke="#e8dcc1" strokeWidth="2" opacity="0.4" />
      <text x="50" y="88" textAnchor="middle" fill="#e8dcc1" fontFamily="Impact, sans-serif" fontSize="14" fontWeight="bold" letterSpacing="1">POP</text>
      <circle cx="30" cy="35" r="12" fill="#f1e8d2" stroke="#211f1b" strokeWidth="2.5" />
      <circle cx="50" cy="22" r="14" fill="#f1e8d2" stroke="#211f1b" strokeWidth="2.5" />
      <circle cx="70" cy="35" r="12" fill="#f1e8d2" stroke="#211f1b" strokeWidth="2.5" />
      <circle cx="40" cy="28" r="10" fill="#f1e8d2" stroke="#211f1b" strokeWidth="2" />
      <circle cx="60" cy="28" r="10" fill="#f1e8d2" stroke="#211f1b" strokeWidth="2" />
      <circle cx="28" cy="33" r="3" fill="#c18a3e" opacity="0.6" />
      <circle cx="52" cy="20" r="3" fill="#c18a3e" opacity="0.6" />
      <circle cx="68" cy="33" r="3" fill="#c18a3e" opacity="0.6" />
    </svg>
  );
}

export function FilmStripArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 60 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="60" height="200" fill="#211f1b" />
      <rect x="4" y="4" width="52" height="192" fill="none" stroke="#c18a3e" strokeWidth="1" opacity="0.4" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <g key={i}>
          <rect x="6" y={8 + i * 21} width="48" height="16" rx="1" fill="#344b40" stroke="#c18a3e" strokeWidth="1" />
          <circle cx="3" cy={12 + i * 21} r="2.5" fill="#e8dcc1" />
          <circle cx="3" cy={20 + i * 21} r="2.5" fill="#e8dcc1" />
          <circle cx="57" cy={12 + i * 21} r="2.5" fill="#e8dcc1" />
          <circle cx="57" cy={20 + i * 21} r="2.5" fill="#e8dcc1" />
        </g>
      ))}
    </svg>
  );
}

export function TicketStubArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 140 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12 L96 12 L96 22 Q102 22 102 28 Q102 34 96 34 L96 58 L8 58 Z" stroke="#211f1b" strokeWidth="3" fill="#e8dcc1" />
      <path d="M96 22 Q102 22 102 28 Q102 34 96 34" stroke="#211f1b" strokeWidth="3" fill="none" />
      <line x1="96" y1="18" x2="96" y2="52" stroke="#211f1b" strokeWidth="2" strokeDasharray="3 3" />
      <text x="12" y="30" fill="#9f2f2d" fontFamily="Impact, sans-serif" fontSize="16" fontWeight="bold" letterSpacing="1">ADMIT ONE</text>
      <text x="12" y="46" fill="#4f493d" fontFamily="monospace" fontSize="7">ROW A - SEAT 7</text>
      <text x="12" y="55" fill="#4f493d" fontFamily="monospace" fontSize="6" opacity="0.6">NO. 04287</text>
    </svg>
  );
}

export function VintageCameraArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 100 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="70" height="50" rx="4" stroke="#211f1b" strokeWidth="3.5" fill="#344b40" />
      <rect x="25" y="12" width="30" height="10" stroke="#211f1b" strokeWidth="3" fill="#211f1b" />
      <circle cx="55" cy="45" r="20" stroke="#211f1b" strokeWidth="3.5" fill="#211f1b" />
      <circle cx="55" cy="45" r="14" stroke="#c18a3e" strokeWidth="2.5" fill="#4f493d" />
      <circle cx="55" cy="45" r="7" stroke="#c18a3e" strokeWidth="2" fill="#211f1b" />
      <circle cx="52" cy="42" r="2.5" fill="#e8dcc1" opacity="0.7" />
      <rect x="18" y="28" width="12" height="8" rx="1" stroke="#211f1b" strokeWidth="2" fill="#c18a3e" />
      <rect x="72" y="30" width="8" height="6" rx="1" stroke="#211f1b" strokeWidth="2" fill="#9f2f2d" />
      <line x1="55" y1="25" x2="55" y2="30" stroke="#c18a3e" strokeWidth="2" />
      <circle cx="80" cy="70" r="3" fill="#211f1b" />
      <circle cx="20" cy="70" r="3" fill="#211f1b" />
    </svg>
  );
}

export function MegaphoneArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 100 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 35 L60 20 L60 55 L15 42 Z" stroke="#211f1b" strokeWidth="3.5" fill="#9f2f2d" />
      <path d="M15 35 L8 35 Q6 38 8 42 L15 42" stroke="#211f1b" strokeWidth="3" fill="#c18a3e" />
      <rect x="60" y="22" width="22" height="32" rx="3" stroke="#211f1b" strokeWidth="3" fill="#344b40" />
      <rect x="64" y="26" width="14" height="3" fill="#c18a3e" />
      <rect x="64" y="32" width="14" height="3" fill="#c18a3e" />
      <rect x="64" y="38" width="14" height="3" fill="#c18a3e" />
      <rect x="64" y="44" width="14" height="3" fill="#c18a3e" />
      <path d="M75 15 Q82 18 82 25 M80 12 Q90 16 90 28" stroke="#c18a3e" strokeWidth="2.5" opacity="0.6" />
      <text x="40" y="70" textAnchor="middle" fill="#211f1b" fontFamily="Impact, sans-serif" fontSize="10" fontWeight="bold" letterSpacing="1">LIVE!</text>
    </svg>
  );
}

export function ProjectorArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="30" width="60" height="40" rx="3" stroke="#211f1b" strokeWidth="3.5" fill="#344b40" />
      <circle cx="75" cy="40" r="16" stroke="#211f1b" strokeWidth="3.5" fill="#211f1b" />
      <circle cx="75" cy="40" r="10" stroke="#c18a3e" strokeWidth="2.5" fill="#4f493d" />
      <circle cx="75" cy="40" r="5" fill="#c18a3e" />
      <path d="M85 28 L100 20 M88 35 L105 30 M88 45 L105 50 M85 52 L100 60" stroke="#c18a3e" strokeWidth="2" opacity="0.5" />
      <rect x="18" y="38" width="20" height="12" rx="1" stroke="#211f1b" strokeWidth="2" fill="#c18a3e" />
      <rect x="44" y="38" width="6" height="6" rx="1" stroke="#211f1b" strokeWidth="1.5" fill="#9f2f2d" />
      <circle cx="20" cy="68" r="4" fill="#211f1b" />
      <circle cx="58" cy="68" r="4" fill="#211f1b" />
      <rect x="44" y="50" width="6" height="4" rx="1" stroke="#211f1b" strokeWidth="1.5" fill="#211f1b" opacity="0.5" />
    </svg>
  );
}

export function StarburstArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 4 L46 28 L70 22 L52 40 L70 58 L46 52 L40 76 L34 52 L10 58 L28 40 L10 22 L34 28 Z" stroke="#211f1b" strokeWidth="3" fill="#c18a3e" />
      <path d="M40 16 L43 30 L56 27 L47 36 L56 45 L43 42 L40 56 L37 42 L24 45 L33 36 L24 27 L37 30 Z" fill="#9f2f2d" opacity="0.5" />
      <text x="40" y="44" textAnchor="middle" fill="#211f1b" fontFamily="Impact, sans-serif" fontSize="9" fontWeight="bold">NOW</text>
    </svg>
  );
}

export function ThreeDGlassesArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 80 50" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="12" width="28" height="22" rx="4" stroke="#211f1b" strokeWidth="3" fill="#9f2f2d" opacity="0.7" />
      <rect x="46" y="12" width="28" height="22" rx="4" stroke="#211f1b" strokeWidth="3" fill="#344b40" opacity="0.7" />
      <path d="M34 23 Q40 18 46 23" stroke="#211f1b" strokeWidth="3" fill="none" />
      <path d="M6 18 Q4 10 12 6 M74 18 Q76 10 68 6" stroke="#211f1b" strokeWidth="2.5" fill="none" />
    </svg>
  );
}
