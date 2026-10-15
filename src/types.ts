export type MediaType = 'youtube' | 'mp4';

export interface Room {
  id: string;
  name: string;
  media_url: string | null;
  media_title: string | null;
  media_type: MediaType;
  is_playing: boolean;
  playback_position: number;
  playback_rate: number;
  last_sync_at: string;
  password: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  room_id: string;
  nickname: string;
  color: string;
  is_host: boolean;
  last_seen: string;
  kicked: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  participant_id: string | null;
  nickname: string;
  color: string;
  content: string;
  created_at: string;
}

export interface Poll {
  id: string;
  room_id: string;
  question: string;
  created_by: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  participant_id: string;
  created_at: string;
}

export interface Reaction {
  id: string;
  room_id: string;
  participant_id: string | null;
  emoji: string;
  created_at: string;
}

export interface PlaybackEvent {
  id: string;
  room_id: string;
  participant_id: string | null;
  event_type: string;
  event_position: number;
  created_at: string;
}

export interface VideoQueueItem {
  id: string;
  room_id: string;
  url: string;
  title: string;
  media_type: MediaType;
  position: number;
  added_by: string | null;
  created_at: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
