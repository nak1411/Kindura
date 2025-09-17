// src/types/index.ts - Updated User interface with location_sharing
export interface User {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  faith_mode: boolean;
  care_score: number;
  preferences: {
    voice_comfort?: boolean;
    video_comfort?: boolean;
    topics_to_avoid?: string[];
    faith_preferences?: string;
  };
  bio?: string;
  location_lat?: number;
  location_lng?: number;
  location_sharing?: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  mode: 'voice' | 'text' | 'quiet' | 'video';
  max_participants: number;
  faith_content: boolean;
  template: {
    warmup?: string;
    activity?: string;
    reflection?: string;
  };
  is_active: boolean;
  created_at: string;
}

export interface QuestSession {
  id: string;
  quest_id: string;
  host_id: string;
  participants: string[];
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  scheduled_for?: string;
  started_at?: string;
  ended_at?: string;
  reflection_data: any;
  created_at: string;
  quest?: Quest;
}

export interface ParallelRoom {
  id: string;
  name: string;
  room_type: 'focus' | 'walk' | 'read' | 'create' | 'pray';
  description?: string;
  current_participants: string[];
  max_capacity: number;
  ambient_sound?: string;
  prompt_of_moment?: string;
  faith_content: boolean;
  is_active: boolean;
  created_at: string;
}