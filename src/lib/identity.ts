const NICKNAME_ADJECTIVES = [
  'Cosmic', 'Neon', 'Quantum', 'Solar', 'Lunar', 'Electric', 'Crystal', 'Turbo',
  'Hyper', 'Stellar', 'Mystic', 'Vivid', 'Rapid', 'Golden', 'Silver', 'Arctic',
];

const NICKNAME_ANIMALS = [
  'Falcon', 'Wolf', 'Tiger', 'Phoenix', 'Dragon', 'Lion', 'Eagle', 'Panther',
  'Fox', 'Bear', 'Hawk', 'Viper', 'Raven', 'Shark', 'Cobra', 'Jaguar',
];

const PARTICIPANT_COLORS = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#f97316',
  '#e11d48', '#8b5cf6', '#0ea5e9', '#22c55e', '#eab308',
];

export function generateNickname(): string {
  const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const animal = NICKNAME_ANIMALS[Math.floor(Math.random() * NICKNAME_ANIMALS.length)];
  return `${adj}${animal}${Math.floor(Math.random() * 100)}`;
}

export function randomColor(): string {
  return PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
}

export function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const PARTICIPANT_KEY = 'syncstream_participant';

interface StoredIdentity {
  id: string;
  nickname: string;
  color: string;
}

export function getOrCreateIdentity(): StoredIdentity {
  const stored = localStorage.getItem(PARTICIPANT_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fall through
    }
  }
  const identity: StoredIdentity = {
    id: crypto.randomUUID(),
    nickname: generateNickname(),
    color: randomColor(),
  };
  localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(identity));
  return identity;
}
