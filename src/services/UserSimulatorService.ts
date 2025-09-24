// src/services/UserSimulatorService.ts
import { supabase } from './supabase';
import { User, PrayerPartnership, RoomMessage } from '../types';

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface BotUser {
  id: string;
  display_name: string;
  location_lat: number;
  location_lng: number;
  location_sharing: boolean;
  last_active: string;
  personality: 'encouraging' | 'thoughtful' | 'prayer_focused' | 'casual';
  activity_level: 'high' | 'medium' | 'low';
  response_speed: 'instant' | 'realistic' | 'slow';
  behaviors: {
    joinRooms: boolean;
    sendMessages: boolean;
    prayerRequests: boolean;
    respondToMessages: boolean;
    moveAround: boolean;
  };
}

interface AdvancedBotConfig {
  count: number;
  centerLat: number;
  centerLng: number;
  locationSpread: number;
  responseSpeed: 'instant' | 'realistic' | 'slow';
  activityLevel: 'low' | 'medium' | 'high';
  personalityMix: {
    encouraging: number;
    thoughtful: number;
    prayer_focused: number;
    casual: number;
  };
  behaviors: {
    joinRooms: boolean;
    sendMessages: boolean;
    prayerRequests: boolean;
    respondToMessages: boolean;
    moveAround: boolean;
  };
}

export class UserSimulatorService {
  private static activeBots = new Map<string, BotUser[]>();
  private static activeIntervals = new Map<string, NodeJS.Timeout>();
  private static conversationMemory = new Map<string, string[]>(); // roomId -> recent messages
  private static allBotIds = new Set<string>(); // Track all bot IDs

  // Realistic bot names
  private static botNames = [
    'Sarah M', 'John K', 'Mary L', 'David R', 'Grace W', 'Michael T', 
    'Ruth S', 'James C', 'Hannah B', 'Peter D', 'Elizabeth F', 'Paul N',
    'Rebecca J', 'Joshua M', 'Anna P', 'Matthew W', 'Esther K', 'Daniel S'
  ];

  // Context-aware message templates
  private static messageTemplates = {
    encouraging: {
      general: [
        "God's got this! 🙏", "Praying for strength for you today", "You're loved and not forgotten ❤️",
        "Feeling grateful for this community", "God is working in your life!", "Stay strong in faith",
        "His plans are good 💪", "Blessed to be here with you all"
      ],
      responses: [
        "Amen to that!", "So grateful for your heart ❤️", "This encouraged me too",
        "God is so good!", "Exactly what I needed to hear", "Thank you for sharing"
      ],
      prayer_responses: [
        "Lifting you up in prayer right now 🙏", "Praying with you", "God hears your heart",
        "Adding this to my prayer list", "Believing God for breakthrough"
      ]
    },
    thoughtful: {
      general: [
        "Been reflecting on Philippians 4:13 today", "Sometimes the quiet moments teach us most",
        "Grateful for God's faithfulness", "Learning to trust in His timing", "Finding peace in prayer today",
        "God's word is alive and active", "In seasons of waiting, we grow"
      ],
      responses: [
        "That really resonates with me", "Thank you for that perspective", "I've been learning similar things",
        "Wise words", "That's beautifully put", "Something to meditate on"
      ],
      prayer_responses: [
        "May God grant you wisdom", "Praying for His peace over you", "Trusting God's perfect timing with you"
      ]
    },
    prayer_focused: {
      general: [
        "Lifting you all up in prayer", "Praying for wisdom and guidance", "May God's peace be with you",
        "Asking for God's blessings on everyone here", "Praying through Psalm 23 today",
        "Lord, be near to us today", "Covering this community in prayer"
      ],
      responses: [
        "Praying agreement with you", "Standing with you in prayer", "Amen, Lord hear us",
        "Joining you in prayer", "God is faithful to answer"
      ],
      prayer_responses: [
        "Father God, we lift this request to you", "Praying earnestly for this", "Lord, you know every need"
      ]
    },
    casual: {
      general: [
        "Good morning everyone!", "Hope you're having a blessed day", "Thanks for being here",
        "Appreciate this community", "Sending good vibes your way", "Great to connect with you all",
        "Hope everyone's doing well", "Grateful for this space"
      ],
      responses: [
        "Thanks for sharing!", "Good to hear from you", "Hope your day goes well",
        "Take care!", "Same to you!", "Nice connecting"
      ],
      prayer_responses: [
        "Keeping you in my thoughts", "Sending prayers your way", "Hope things get better soon"
      ]
    }
  };

  /**
   * Start advanced bot simulation with detailed configuration
   */
  static async startAdvancedSimulation(config: AdvancedBotConfig): Promise<string> {
    const simulationId = `bot_sim_${Date.now()}`;
    
    try {
      console.log('Starting bot simulation with config:', config);
      
      // Create bot users based on personality distribution
      const bots = await this.createAdvancedBots(config);
      this.activeBots.set(simulationId, bots);
      
      console.log(`Created ${bots.length} bots`);
      
      const intervalTime = this.getActivityInterval(config.activityLevel);
      console.log(`🕐 Setting up activity interval: ${intervalTime}ms (${intervalTime/1000}s)`);
      
      // Start intelligent activity loop
      const interval = setInterval(() => {
        console.log(`⏰ Activity timer fired - running cycle for ${bots.length} bots...`);
        this.runIntelligentActivity(simulationId);
      }, intervalTime);
      
      this.activeIntervals.set(simulationId, interval);
      
      console.log(`📊 Active intervals now: ${this.activeIntervals.size}`);
      console.log(`📊 Active bot simulations: ${this.activeBots.size}`);
      
      // Run initial activity immediately
      console.log('🚀 Running initial activity...');
      setTimeout(() => {
        console.log('🎬 Initial activity timeout fired');
        this.runIntelligentActivity(simulationId);
      }, 2000);
      
      return simulationId;
    } catch (error) {
      console.error('Failed to start advanced simulation:', error);
      throw error;
    }
  }

  /**
   * Create bots with personality distribution
   */
  private static async createAdvancedBots(config: AdvancedBotConfig): Promise<BotUser[]> {
    const bots: BotUser[] = [];
    const personalities = this.distributePersonalities(config.count, config.personalityMix);
    
    console.log('Creating bots with personalities:', personalities);
    
    for (let i = 0; i < config.count; i++) {
      const location = this.generateLocationNearby(
        config.centerLat,
        config.centerLng,
        config.locationSpread
      );
      
      const bot: BotUser = {
        id: generateUUID(),
        display_name: `${this.botNames[i % this.botNames.length]}${Math.floor(i / this.botNames.length) > 0 ? ` ${Math.floor(i / this.botNames.length) + 1}` : ''}`,
        location_lat: location.lat,
        location_lng: location.lng,
        location_sharing: true,
        last_active: new Date().toISOString(),
        personality: personalities[i],
        activity_level: config.activityLevel,
        response_speed: config.responseSpeed,
        behaviors: { ...config.behaviors }
      };
      
      bots.push(bot);
      this.allBotIds.add(bot.id);
    }
    
    // Generate proper UUIDs for bots first
    for (const bot of bots) {
      bot.id = generateUUID(); // Ensure each bot has a proper UUID
      this.allBotIds.add(bot.id);
    }

    // Try creating with auth users first
    const createdBots: BotUser[] = [];
    
    for (const bot of bots) {
      try {
        // Method 1: Create auth user first
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: `bot-${bot.id.substring(0, 8)}@simulated.local`,
          password: `bot-pass-${Math.random().toString(36)}`,
          user_metadata: {
            display_name: bot.display_name,
            is_simulated: true
          },
          email_confirm: true
        });

        if (!authError && authData.user) {
          // Use auth user ID
          const originalId = bot.id;
          bot.id = authData.user.id;
          this.allBotIds.delete(originalId);
          this.allBotIds.add(bot.id);
          
          // Insert profile
          const { error: profileError } = await supabase.from('users').insert({
            id: bot.id,
            display_name: bot.display_name,
            location_lat: bot.location_lat,
            location_lng: bot.location_lng,
            location_sharing: bot.location_sharing,
            last_active: bot.last_active,
            is_simulated: true,
            email: authData.user.email,
            created_at: new Date().toISOString(),
            care_score: Math.floor(Math.random() * 50) + 25
          });
          
          if (!profileError) {
            createdBots.push(bot);
            console.log(`✅ Created bot ${bot.display_name} with auth user`);
            continue;
          }
        }
        
        // Method 2: Try direct insert with generated ID
        const { data: userData, error: directError } = await supabase.from('users').insert({
          id: bot.id,
          display_name: bot.display_name,
          location_lat: bot.location_lat,
          location_lng: bot.location_lng,
          location_sharing: bot.location_sharing,
          last_active: bot.last_active,
          is_simulated: true,
          email: `bot-${bot.id.substring(0, 8)}@simulated.local`,
          created_at: new Date().toISOString(),
          care_score: Math.floor(Math.random() * 50) + 25
        }).select('id');
        
        if (!directError && userData?.[0]) {
          createdBots.push(bot);
          console.log(`✅ Created bot ${bot.display_name} with direct insert`);
          continue;
        }
        
        console.error(`Failed to create bot ${bot.display_name}:`, directError || authError);
      } catch (error) {
        console.error(`Exception creating bot ${bot.display_name}:`, error);
      }
    }
    
    console.log(`✅ Successfully created ${createdBots.length} out of ${bots.length} bots`);
    
    // Update bots array to only include successfully created ones
    bots.length = 0;
    bots.push(...createdBots);
    
    return bots;
  }

  /**
   * Run intelligent activity cycle
   */
  private static async runIntelligentActivity(simulationId: string): Promise<void> {
    const bots = this.activeBots.get(simulationId);
    if (!bots || bots.length === 0) {
      console.log(`❌ No bots found for simulation ${simulationId}`);
      return;
    }

    console.log(`🚀 Starting activity cycle for ${bots.length} bots...`);

    try {
      // Get current room and message context
      const { data: rooms, error: roomError } = await supabase
        .from('parallel_rooms')
        .select('*');

      if (roomError) {
        console.error('Error fetching rooms:', roomError);
        return;
      }

      const { data: recentMessages, error: messageError } = await supabase
        .from('room_messages')
        .select('*')
        .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (messageError) {
        console.error('Error fetching messages:', messageError);
      }

      console.log(`📊 Context: ${rooms?.length || 0} rooms, ${recentMessages?.length || 0} recent messages`);

      if (!rooms || rooms.length === 0) {
        console.log('⚠️ No rooms available - bots cannot join or send messages');
        return;
      }

      // Force each bot to be active this cycle for testing
      for (const bot of bots) {
        console.log(`🤖 Processing bot: ${bot.display_name}`);
        
        // Force activity for debugging - remove random chance
        await this.decideBotActivity(bot, rooms, recentMessages || []);
        
        // Small delay between bot actions
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`✅ Activity cycle complete`);
    } catch (error) {
      console.error('Error in runIntelligentActivity:', error);
    }
  }

  /**
   * Decide what activity the bot should perform
   */
  private static async decideBotActivity(bot: BotUser, rooms: any[], recentMessages: any[]): Promise<void> {
    console.log(`🎯 Bot ${bot.display_name} deciding activity...`);
    
    const activities = [];
    
    // Higher weight = more likely
    if (bot.behaviors.joinRooms && rooms && rooms.length > 0) {
      activities.push({ type: 'join_room', weight: 0.6 });
    }
    
    if (bot.behaviors.sendMessages) {
      activities.push({ type: 'send_message', weight: 0.8 });
    }
    
    if (bot.behaviors.respondToMessages && recentMessages && recentMessages.length > 0) {
      activities.push({ type: 'respond_to_message', weight: 0.7 });
    }
    
    if (bot.behaviors.prayerRequests) {
      activities.push({ type: 'prayer_request', weight: 0.1 });
    }
    
    if (bot.behaviors.moveAround) {
      activities.push({ type: 'move_location', weight: 0.1 });
    }

    if (activities.length === 0) {
      console.log(`❌ Bot ${bot.display_name} has no enabled behaviors`);
      return;
    }

    console.log(`🎲 Bot ${bot.display_name} has ${activities.length} possible activities:`, activities.map(a => a.type));

    // Choose activity based on weights
    const totalWeight = activities.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const activity of activities) {
      random -= activity.weight;
      if (random <= 0) {
        console.log(`✨ Bot ${bot.display_name} chose: ${activity.type}`);
        await this.executeBotActivity(bot, activity.type, { rooms: rooms || undefined, recentMessages: recentMessages || undefined });
        return;
      }
    }
    
    console.log(`❓ Bot ${bot.display_name} didn't choose any activity`);
  }

  /**
   * Execute specific bot activity
   */
  private static async executeBotActivity(
    bot: BotUser, 
    activityType: string, 
    context: { rooms?: any[]; recentMessages?: any[] }
  ): Promise<void> {
    console.log(`🎬 Executing ${activityType} for bot ${bot.display_name}`);
    
    try {
      switch (activityType) {
        case 'join_room':
          if (context.rooms) await this.botJoinRoom(bot, context.rooms);
          break;
        case 'send_message':
          await this.botSendMessage(bot, context.rooms || []);
          break;
        case 'respond_to_message':
          if (context.recentMessages) await this.botRespondToMessage(bot, context.recentMessages);
          break;
        case 'prayer_request':
          await this.botSendPrayerRequest(bot);
          break;
        case 'move_location':
          await this.botMoveLocation(bot);
          break;
        default:
          console.log(`❓ Unknown activity type: ${activityType}`);
      }
    } catch (error) {
      console.error(`❌ Error executing ${activityType} for ${bot.display_name}:`, error);
    }
  }

  /**
   * Bot joins a room intelligently
   */
  private static async botJoinRoom(bot: BotUser, rooms: any[]): Promise<void> {
    console.log(`🚪 Bot ${bot.display_name} attempting to join room...`);
    console.log(`Available rooms:`, rooms.map(r => ({ 
      id: r.id, 
      name: r.name, 
      occupants: r.current_occupants, 
      capacity: r.max_capacity,
      participants: r.current_participants?.length || 0
    })));
    
    try {
      // Prefer rooms with some but not too many participants - handle undefined occupants
      const suitableRooms = rooms.filter(r => {
        const occupants = r.current_occupants || r.current_participants?.length || 0;
        const capacity = r.max_capacity || 8;
        const isSuitable = occupants < capacity && occupants < 8;
        console.log(`Room ${r.name}: occupants=${occupants}, capacity=${capacity}, suitable=${isSuitable}`);
        return isSuitable;
      });
      
      console.log(`🎯 Suitable rooms for ${bot.display_name}: ${suitableRooms.length}`);
      
      if (suitableRooms.length === 0) {
        console.log(`❌ No suitable rooms for ${bot.display_name} - all full or max capacity reached`);
        return;
      }

      const room = suitableRooms[Math.floor(Math.random() * suitableRooms.length)];
      console.log(`🎲 ${bot.display_name} selected room:`, { id: room.id, name: room.name });
      
      // Check if already in room
      console.log(`🔍 Checking if ${bot.display_name} already in room ${room.id}...`);
      const { data: existing, error: checkError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', bot.id)
        .eq('is_active', true);

      if (checkError) {
        console.error(`❌ Error checking room participation:`, checkError);
        return;
      }

      if (existing && existing.length > 0) {
        console.log(`⚠️ Bot ${bot.display_name} already in room ${room.id}`);
        return;
      }

      console.log(`✅ ${bot.display_name} can join room ${room.id}`);

      // IMPORTANT: Add to both room_participants table AND current_participants array
      
      // 1. Add to room_participants table
      console.log(`📝 Adding ${bot.display_name} to room_participants table...`);
      const { error: participantError } = await supabase.from('room_participants').upsert({
        room_id: room.id,
        user_id: bot.id,
        joined_at: new Date().toISOString(),
        is_active: true
      });

      if (participantError) {
        console.error(`❌ Failed to add to room_participants:`, participantError);
        return;
      }

      // 2. Add to parallel_rooms.current_participants array
      console.log(`📝 Adding ${bot.display_name} to current_participants array...`);
      const currentParticipants = room.current_participants || [];
      const updatedParticipants = [...currentParticipants, bot.id];
      const { error: roomUpdateError } = await supabase
        .from('parallel_rooms')
        .update({ 
          current_participants: updatedParticipants,
          current_occupants: updatedParticipants.length 
        })
        .eq('id', room.id);

      if (roomUpdateError) {
        console.error(`❌ Failed to update room participants:`, roomUpdateError);
        return;
      }

      console.log(`🎉 Bot ${bot.display_name} successfully joined room ${room.name || room.id}`);

      // Send joining message after realistic delay
      const delay = this.getResponseDelay(bot.response_speed);
      console.log(`⏰ Scheduling join message in ${delay}ms...`);
      
      setTimeout(async () => {
        console.log(`💬 Sending join message for ${bot.display_name}...`);
        const joinMessages = {
          encouraging: ["Hi everyone! 😊", "Blessed to join you all", "Good to be here!", "Hope everyone's doing great!"],
          thoughtful: ["Hello, grateful to be here", "Peace to you all", "Joining you in fellowship", "Good to see this community"],
          prayer_focused: ["Blessings to all", "Grace and peace", "In His name, hello", "Praying for you all"],
          casual: ["Hey there!", "Morning everyone", "What's up, friends?", "Good to be here!"]
        };
        
        const messages = joinMessages[bot.personality];
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        await this.sendBotMessage(bot, room.id, message);
      }, delay);

    } catch (error) {
      console.error(`❌ Error in botJoinRoom for ${bot.display_name}:`, error);
    }
  }

  /**
   * Bot sends a contextual message
   */
  private static async botSendMessage(bot: BotUser, rooms: any[]): Promise<void> {
    try {
      console.log(`💬 Bot ${bot.display_name} trying to send message...`);
      
      // Get rooms bot is in
      const { data: participations } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', bot.id)
        .eq('is_active', true);

      console.log(`📍 Bot ${bot.display_name} is in ${participations?.length || 0} rooms`);

      if (!participations || participations.length === 0) {
        console.log(`🔄 Bot ${bot.display_name} not in any rooms, trying to join one first...`);
        // If not in any room, try to join one first
        await this.botJoinRoom(bot, rooms);
        return;
      }

      const roomId = participations[Math.floor(Math.random() * participations.length)].room_id;
      const messages = this.messageTemplates[bot.personality].general;
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      console.log(`📤 Bot ${bot.display_name} sending: "${message}" to room ${roomId}`);
      await this.sendBotMessage(bot, roomId, message);
    } catch (error) {
      console.error(`❌ Error in botSendMessage for ${bot.display_name}:`, error);
    }
  }

  /**
   * Bot responds to recent messages intelligently
   */
  private static async botRespondToMessage(bot: BotUser, recentMessages: any[]): Promise<void> {
    try {
      // Filter messages from rooms bot is in, excluding bot's own messages
      const { data: participations } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', bot.id)
        .eq('is_active', true);

      if (!participations) return;

      const botRooms = participations.map(p => p.room_id);
      const relevantMessages = recentMessages.filter(msg => 
        botRooms.includes(msg.room_id) && 
        !this.allBotIds.has(msg.user_id) && // Don't respond to other bots
        msg.created_at > new Date(Date.now() - 3 * 60 * 1000).toISOString() // Only recent messages
      );

      if (relevantMessages.length === 0) return;

      const targetMessage = relevantMessages[Math.floor(Math.random() * relevantMessages.length)];
      
      // Choose response type based on message content
      let responseType = 'responses';
      const msgContent = targetMessage.content.toLowerCase();
      
      if (msgContent.includes('pray') || msgContent.includes('prayer') || msgContent.includes('help')) {
        responseType = 'prayer_responses';
      }

      const responses = this.messageTemplates[bot.personality][responseType as keyof typeof this.messageTemplates[typeof bot.personality]];
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Send response after realistic delay
      setTimeout(async () => {
        await this.sendBotMessage(bot, targetMessage.room_id, response);
      }, this.getResponseDelay(bot.response_speed));

    } catch (error) {
      console.error('Error in botRespondToMessage:', error);
    }
  }

  /**
   * Send a message from bot to room
   */
  private static async sendBotMessage(bot: BotUser, roomId: string, content: string): Promise<void> {
    try {
      // First verify bot is in room's current_participants
      const { data: room } = await supabase
        .from('parallel_rooms')
        .select('current_participants')
        .eq('id', roomId)
        .single();

      if (!room || !room.current_participants.includes(bot.id)) {
        console.log(`❌ Bot ${bot.display_name} not in room participants, cannot send message`);
        return;
      }

      const { error } = await supabase.from('room_messages').insert({
        room_id: roomId,
        user_id: bot.id,
        content: content,
        message_type: 'text',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error(`❌ Failed to send bot message from ${bot.display_name}:`, error);
        return;
      }

      console.log(`✅ Bot ${bot.display_name} sent: "${content}"`);

      // Update last active
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', bot.id);

    } catch (error) {
      console.error('Error in sendBotMessage:', error);
    }
  }

  /**
   * Bot sends prayer request to real users
   */
  private static async botSendPrayerRequest(bot: BotUser): Promise<void> {
    try {
      // Get real users (non-simulated)
      const { data: realUsers } = await supabase
        .from('users')
        .select('id')
        .neq('is_simulated', true)
        .limit(10);

      if (!realUsers || realUsers.length === 0) return;

      const targetUser = realUsers[Math.floor(Math.random() * realUsers.length)];
      
      const prayerRequests = [
        "Could use prayer for job interviews this week 🙏",
        "Please pray for my family during this season",
        "Seeking God's wisdom for an important decision",
        "Pray for healing and strength, friends",
        "Need prayer for peace in a difficult situation",
        "Please lift up my church community in prayer",
        "Asking for prayer for safe travels",
        "Could use prayer for financial provision"
      ];
      
      const request = prayerRequests[Math.floor(Math.random() * prayerRequests.length)];
      
      await supabase.from('prayer_requests').insert({
        from_user_id: bot.id,
        to_user_id: targetUser.id,
        request_text: request,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      console.log(`Bot ${bot.display_name} sent prayer request to user ${targetUser.id}`);
    } catch (error) {
      console.error('Error in botSendPrayerRequest:', error);
    }
  }

  /**
   * Bot moves to new location
   */
  private static async botMoveLocation(bot: BotUser): Promise<void> {
    try {
      const movement = this.generateSmallMovement();
      const newLat = bot.location_lat + movement.latDelta;
      const newLng = bot.location_lng + movement.lngDelta;

      await supabase
        .from('users')
        .update({
          location_lat: newLat,
          location_lng: newLng,
          last_active: new Date().toISOString()
        })
        .eq('id', bot.id);

      // Update bot object
      bot.location_lat = newLat;
      bot.location_lng = newLng;

      console.log(`Bot ${bot.display_name} moved to ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    } catch (error) {
      console.error('Error in botMoveLocation:', error);
    }
  }

  // Helper methods
  private static distributePersonalities(count: number, mix: any): ('encouraging' | 'thoughtful' | 'prayer_focused' | 'casual')[] {
    const personalities: ('encouraging' | 'thoughtful' | 'prayer_focused' | 'casual')[] = [];
    const total = mix.encouraging + mix.thoughtful + mix.prayer_focused + mix.casual;
    
    const encouragingCount = Math.round((mix.encouraging / total) * count);
    const thoughtfulCount = Math.round((mix.thoughtful / total) * count);
    const prayerCount = Math.round((mix.prayer_focused / total) * count);
    const casualCount = count - encouragingCount - thoughtfulCount - prayerCount;

    for (let i = 0; i < encouragingCount; i++) personalities.push('encouraging');
    for (let i = 0; i < thoughtfulCount; i++) personalities.push('thoughtful');
    for (let i = 0; i < prayerCount; i++) personalities.push('prayer_focused');
    for (let i = 0; i < casualCount; i++) personalities.push('casual');

    // Shuffle array
    for (let i = personalities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [personalities[i], personalities[j]] = [personalities[j], personalities[i]];
    }

    return personalities;
  }

  private static generateLocationNearby(centerLat: number, centerLng: number, spreadKm: number): { lat: number; lng: number } {
    const latDelta = (Math.random() - 0.5) * 2 * (spreadKm / 111.32);
    const lngDelta = (Math.random() - 0.5) * 2 * (spreadKm / (111.32 * Math.cos(centerLat * Math.PI / 180)));
    
    return {
      lat: centerLat + latDelta,
      lng: centerLng + lngDelta
    };
  }

  private static generateSmallMovement(): { latDelta: number; lngDelta: number } {
    return {
      latDelta: (Math.random() - 0.5) * 0.002,
      lngDelta: (Math.random() - 0.5) * 0.002
    };
  }

  private static getActivityProbability(level: 'low' | 'medium' | 'high'): number {
    switch (level) {
      case 'high': return 0.8;
      case 'medium': return 0.4;
      case 'low': return 0.2;
      default: return 0.3;
    }
  }

  /**
   * Get activity interval based on level
   */
  private static getActivityInterval(level: 'low' | 'medium' | 'high'): number {
    switch (level) {
      case 'high': return 8000;   // 8 seconds - very active
      case 'medium': return 15000; // 15 seconds  
      case 'low': return 30000;    // 30 seconds
      default: return 20000;
    }
  }

  private static getResponseDelay(speed: 'instant' | 'realistic' | 'slow'): number {
    switch (speed) {
      case 'instant': return 500;
      case 'realistic': return 2000 + Math.random() * 3000;
      case 'slow': return 5000 + Math.random() * 10000;
      default: return 2000;
    }
  }

  // Public methods
  static stopSimulation(simulationId: string): void {
    const interval = this.activeIntervals.get(simulationId);
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(simulationId);
    }
    
    const bots = this.activeBots.get(simulationId);
    if (bots) {
      bots.forEach(bot => this.allBotIds.delete(bot.id));
      this.activeBots.delete(simulationId);
    }
    
    console.log(`Stopped simulation ${simulationId}`);
  }

  /**
   * Get active simulation IDs
   */
  static getActiveSimulations(): string[] {
    return Array.from(this.activeBots.keys());
  }

  /**
   * Trigger immediate bot activity for all active simulations (for testing)
   */
  static async triggerActivityBurst(): Promise<void> {
    console.log('🚀 Triggering activity burst for all active bots...');
    
    console.log(`📊 Active simulations: ${this.activeBots.size}`);
    console.log(`📊 Simulation IDs:`, Array.from(this.activeBots.keys()));
    
    for (const [simulationId, bots] of this.activeBots.entries()) {
      console.log(`Running activity for ${bots.length} bots in simulation ${simulationId}`);
      console.log(`Bot names:`, bots.map(b => b.display_name));
      
      // Get current context
      const { data: rooms } = await supabase
        .from('parallel_rooms')
        .select('*');

      const { data: recentMessages } = await supabase
        .from('room_messages')
        .select('*')
        .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      console.log(`Context: ${rooms?.length || 0} rooms, ${recentMessages?.length || 0} recent messages`);
      
      if (!rooms || rooms.length === 0) {
        console.log('❌ No rooms available for bots to join');
        continue;
      }

      // Force each bot to do something - using direct method calls
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        console.log(`🤖 Processing bot ${i + 1}/${bots.length}: ${bot.display_name} (${bot.id})`);
        console.log(`Bot behaviors:`, bot.behaviors);
        
        try {
          // Force bot to join room first
          console.log(`🎯 Forcing ${bot.display_name} to join room...`);
          await this.botJoinRoom(bot, rooms);
          
          // Small delay then force message
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log(`🎯 Forcing ${bot.display_name} to send message...`);
          await this.botSendMessage(bot, rooms);
          
          // Small delay between bots to prevent spam
          console.log(`⏳ Waiting 500ms before next bot...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Error with bot ${bot.display_name}:`, error);
        }
      }
    }
    
    console.log('✅ Activity burst complete');
  }

  /**
   * Fallback method to insert bot without auth constraints
   */
  private static async insertBotDirectly(bot: BotUser): Promise<void> {
    try {
      console.log(`Trying fallback creation for bot ${bot.display_name}...`);
      
      // Try using SQL function to bypass constraints
      const { data, error: sqlError } = await supabase.rpc('insert_simulated_user', {
        p_display_name: bot.display_name,
        p_email: `${bot.id}@bot.local`,
        p_location_lat: bot.location_lat,
        p_location_lng: bot.location_lng,
        p_care_score: Math.floor(Math.random() * 50) + 25
      });

      if (sqlError) {
        console.warn(`RPC failed for ${bot.display_name}, trying direct insert:`, sqlError);
        
        // Final attempt: insert without ID constraint
        const { data: directData, error: directError } = await supabase
          .from('users')
          .insert({
            display_name: bot.display_name,
            location_lat: bot.location_lat,
            location_lng: bot.location_lng,
            location_sharing: bot.location_sharing,
            last_active: bot.last_active,
            is_simulated: true,
            email: `${Math.random().toString(36)}@bot.local`, // Random email
            created_at: new Date().toISOString(),
            care_score: Math.floor(Math.random() * 50) + 25
          })
          .select('id')
          .single();
        
        if (directError) {
          throw directError;
        }
        
        if (directData) {
          bot.id = directData.id;
          this.allBotIds.add(directData.id);
          console.log(`✅ Created bot ${bot.display_name} with ID ${directData.id}`);
        }
      } else {
        // RPC succeeded
        if (data) {
          bot.id = data;
          this.allBotIds.add(data);
          console.log(`✅ Created bot ${bot.display_name} via RPC with ID ${data}`);
        }
      }
    } catch (error) {
      console.error(`❌ All creation methods failed for ${bot.display_name}:`, error);
      throw error;
    }
  }
}