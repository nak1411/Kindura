// src/types/index.ts - Updated with Prayer Partner types
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
    prayer?: PrayerPreferences; // NEW: Added prayer preferences
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

// Prayer Partner Types
export interface PrayerPartnership {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'active' | 'paused' | 'ended';
  requested_by: string;
  created_at: string;
  accepted_at?: string;
  ended_at?: string;
  
  // Partnership preferences
  prayer_time_preference?: string; // 'morning', 'afternoon', 'evening', 'flexible'
  check_in_frequency: string; // 'daily', 'weekly', 'flexible'
  partnership_type: string; // 'general', 'accountability', 'specific_need'
  
  // Populated user data (from joins)
  partner_user?: User;
  requested_by_user?: User;
}

export interface PrayerRequest {
  id: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  request_text: string;
  is_urgent: boolean;
  status: 'active' | 'answered' | 'ongoing';
  answered_at?: string;
  answered_note?: string;
  created_at: string;
  
  // Populated user data
  from_user?: User;
  to_user?: User;
}

export interface PrayerCheckIn {
  id: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  message?: string;
  check_in_type: string; // 'daily', 'weekly', 'prayer_time'
  responded_at?: string;
  response_message?: string;
  created_at: string;
  
  // Populated user data
  from_user?: User;
  to_user?: User;
}

export interface PrayerPreferences {
  preferred_time?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  frequency?: 'daily' | 'weekly' | 'flexible';
  partnership_type?: 'general' | 'accountability' | 'specific_need';
  topics_comfortable_with?: string[]; // ['anxiety', 'relationships', 'work', 'health', 'family']
  open_to_partnerships?: boolean;
  max_partnerships?: number;
}

// Extend the existing User interface to include prayer preferences
export interface UserWithPrayerPreferences extends User {
  prayer_preferences?: PrayerPreferences;
}