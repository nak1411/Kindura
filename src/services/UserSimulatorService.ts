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
      
      // Start intelligent activity loop
      const interval = setInterval(() => {
        console.log('Running bot activity cycle...');
        this.runIntelligentActivity(simulationId);
      }, this.getActivityInterval(config.activityLevel));
      
      this.activeIntervals.set(simulationId, interval);
      
      // Run initial activity immediately
      setTimeout(() => {
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
        id: generateUUID(), // Use proper UUID
        display_name: `${this.botNames[i % this.botNames.length]}${Math.floor(i / this.botNames.length) > 0 ? ` ${Math.floor(i / this.botNames.length) + 1}` : ''}`,
        location_lat: location.lat,
        location_lng: location.lng,
        location_sharing: true,
        last_active: new Date().toISOString(),
        personality: personalities[i],
        activity_level: this.randomizeActivityLevel(config.activityLevel),
        response_speed: config.responseSpeed,
        behaviors: config.behaviors
      };
      
      bots.push(bot);
      this.allBotIds.add(bot.id); // Track this bot ID
      console.log(`Creating bot: ${bot.display_name} (${bot.personality}) with ID: ${bot.id}`);

      // Create bot by temporarily signing up as that user
      const botEmail = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@kindura.simulation`;
      
      try {
        console.log('Creating bot through auth signup...');
        
        // Store current auth state
        const { data: currentSession } = await supabase.auth.getSession();
        
        // Sign up as the bot user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: botEmail,
          password: 'TempBotPass123!',
          options: {
            data: {
              display_name: bot.display_name,
              is_simulated: true
            }
          }
        });
        
        if (signUpError || !signUpData.user) {
          console.error('Bot signup failed:', signUpError);
          continue;
        }
        
        console.log(`Bot signed up: ${signUpData.user.id}`);
        
        // Update bot with the real user ID
        bot.id = signUpData.user.id;
        this.allBotIds.add(bot.id);
        
        // Create/update the user profile
        const { error: profileError } = await supabase.from('users').upsert({
          id: signUpData.user.id,
          display_name: bot.display_name,
          email: botEmail,
          location_lat: bot.location_lat,
          location_lng: bot.location_lng,
          location_sharing: bot.location_sharing,
          last_active: bot.last_active,
          is_simulated: true
        });
        
        if (profileError) {
          console.error('Bot profile creation failed:', profileError);
        } else {
          console.log(`Bot ${bot.display_name} created successfully`);
        }
        
        // Restore original session if we had one
        if (currentSession.session) {
          await supabase.auth.setSession(currentSession.session);
        } else {
          // Sign out the bot user to restore no-auth state
          await supabase.auth.signOut();
        }
        
      } catch (error) {
        console.error('Exception creating bot:', error);
      }
    }
    
    return bots;
  }

  /**
   * Distribute personalities based on percentages
   */
  private static distributePersonalities(
    count: number, 
    mix: AdvancedBotConfig['personalityMix']
  ): BotUser['personality'][] {
    const personalities: BotUser['personality'][] = [];
    const types = Object.keys(mix) as (keyof typeof mix)[];
    
    types.forEach(type => {
      const amount = Math.round((mix[type] / 100) * count);
      for (let i = 0; i < amount; i++) {
        personalities.push(type);
      }
    });
    
    // Fill remaining slots randomly
    while (personalities.length < count) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      personalities.push(randomType);
    }
    
    // Shuffle array
    return personalities.sort(() => Math.random() - 0.5);
  }

  /**
   * Randomize individual bot activity levels
   */
  private static randomizeActivityLevel(baseLevel: AdvancedBotConfig['activityLevel']): BotUser['activity_level'] {
    const variation = Math.random();
    if (baseLevel === 'high') {
      return variation > 0.7 ? 'medium' : 'high';
    } else if (baseLevel === 'medium') {
      if (variation > 0.8) return 'high';
      if (variation < 0.2) return 'low';
      return 'medium';
    } else { // low
      return variation > 0.7 ? 'medium' : 'low';
    }
  }

  /**
   * Get activity interval based on level
   */
  private static getActivityInterval(level: AdvancedBotConfig['activityLevel']): number {
    const intervals = { low: 45000, medium: 25000, high: 15000 }; // milliseconds
    return intervals[level];
  }

  /**
   * Run intelligent bot activities
   */
  private static async runIntelligentActivity(simulationId: string): Promise<void> {
    const bots = this.activeBots.get(simulationId);
    if (!bots || bots.length === 0) {
      console.log('No bots found for simulation:', simulationId);
      return;
    }

    console.log(`Running activity for ${bots.length} bots`);

    for (const bot of bots) {
      try {
        // Update bot as active
        await supabase.from('users').update({
          last_active: new Date().toISOString()
        }).eq('id', bot.id);

        // Determine if bot should act this cycle
        if (!this.shouldBotAct(bot)) {
          console.log(`Bot ${bot.display_name} skipping this cycle`);
          continue;
        }

        console.log(`Bot ${bot.display_name} is acting...`);
        // Choose activity based on bot's behaviors and current app state
        await this.chooseBotActivity(bot);

      } catch (error) {
        console.error(`Error in bot activity for ${bot.display_name}:`, error);
      }
    }
  }

  /**
   * Determine if bot should act based on personality and activity level
   */
  private static shouldBotAct(bot: BotUser): boolean {
    const baseChances = { high: 0.8, medium: 0.5, low: 0.3 };
    const personalityModifiers = {
      encouraging: 1.2,
      prayer_focused: 1.1, 
      thoughtful: 0.9,
      casual: 1.0
    };
    
    const chance = baseChances[bot.activity_level] * personalityModifiers[bot.personality];
    return Math.random() < chance;
  }

  /**
   * Choose and execute bot activity intelligently
   */
  private static async chooseBotActivity(bot: BotUser): Promise<void> {
    // Get current app state to make smart decisions
    const { data: rooms } = await supabase
      .from('parallel_rooms')
      .select('*')
      .eq('is_active', true)
      .limit(10);

    const { data: recentMessages } = await supabase
      .from('room_messages')
      .select('*, room_id')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    const activities = [];
    
    // Build weighted activity list based on bot behaviors and app state
    if (bot.behaviors.joinRooms && rooms && rooms.length > 0) {
      activities.push({ type: 'join_room', weight: 0.4 });
    }
    
    if (bot.behaviors.sendMessages && rooms && rooms.length > 0) {
      activities.push({ type: 'send_message', weight: 0.3 });
    }
    
    if (bot.behaviors.respondToMessages && recentMessages && recentMessages.length > 0) {
      activities.push({ type: 'respond_to_message', weight: 0.5 });
    }
    
    if (bot.behaviors.prayerRequests) {
      activities.push({ type: 'prayer_request', weight: 0.2 });
    }
    
    if (bot.behaviors.moveAround) {
      activities.push({ type: 'move_location', weight: 0.1 });
    }

    if (activities.length === 0) return;

    // Choose activity based on weights
    const totalWeight = activities.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const activity of activities) {
      random -= activity.weight;
      if (random <= 0) {
        await this.executeBotActivity(bot, activity.type, { rooms: rooms || undefined, recentMessages: recentMessages || undefined });
        break;
      }
    }
  }

  /**
   * Execute specific bot activity
   */
  private static async executeBotActivity(
    bot: BotUser, 
    activityType: string, 
    context: { rooms?: any[]; recentMessages?: any[] }
  ): Promise<void> {
    switch (activityType) {
      case 'join_room':
        if (context.rooms) await this.botJoinRoom(bot, context.rooms);
        break;
      case 'send_message':
        if (context.rooms) await this.botSendMessage(bot, context.rooms);
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
    }
  }

  /**
   * Bot joins a room intelligently
   */
  private static async botJoinRoom(bot: BotUser, rooms: any[]): Promise<void> {
    try {
      // Prefer rooms with some but not too many participants
      const suitableRooms = rooms.filter(r => r.current_occupants < r.max_capacity && r.current_occupants < 8);
      if (suitableRooms.length === 0) return;

      const room = suitableRooms[Math.floor(Math.random() * suitableRooms.length)];
      
      // Check if already in room
      const { data: existing } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', bot.id)
        .eq('is_active', true);

      if (existing && existing.length > 0) return;

      // Join room
      await supabase.from('room_participants').upsert({
        room_id: room.id,
        user_id: bot.id,
        joined_at: new Date().toISOString(),
        is_active: true
      });

      // Send joining message after realistic delay
      setTimeout(async () => {
        const joinMessages = {
          encouraging: ["Hi everyone! 😊", "Blessed to join you all", "Good to be here!"],
          thoughtful: ["Hello, grateful to be here", "Peace to you all", "Joining you in fellowship"],
          prayer_focused: ["Blessings to all", "Grace and peace", "In His name, hello"],
          casual: ["Hey there!", "Morning everyone", "What's up, friends?"]
        };
        
        const messages = joinMessages[bot.personality];
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        await this.sendBotMessage(bot, room.id, message);
      }, this.getResponseDelay(bot.response_speed));

    } catch (error) {
      console.error('Error in botJoinRoom:', error);
    }
  }

  /**
   * Bot sends a contextual message
   */
  private static async botSendMessage(bot: BotUser, rooms: any[]): Promise<void> {
    try {
      // Get rooms bot is in
      const { data: participations } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', bot.id)
        .eq('is_active', true);

      if (!participations || participations.length === 0) return;

      const roomId = participations[Math.floor(Math.random() * participations.length)].room_id;
      const messages = this.messageTemplates[bot.personality].general;
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      await this.sendBotMessage(bot, roomId, message);
    } catch (error) {
      console.error('Error in botSendMessage:', error);
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
        status: 'active',
        is_urgent: Math.random() < 0.15, // 15% chance urgent
        created_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in botSendPrayerRequest:', error);
    }
  }

  /**
   * Bot slightly changes location (simulates movement)
   */
  private static async botMoveLocation(bot: BotUser): Promise<void> {
    try {
      // Small random movement (within 200m)
      const latChange = (Math.random() - 0.5) * 0.002;
      const lngChange = (Math.random() - 0.5) * 0.002;
      
      bot.location_lat += latChange;
      bot.location_lng += lngChange;
      
      await supabase.from('users').update({
        location_lat: bot.location_lat,
        location_lng: bot.location_lng,
        last_active: new Date().toISOString()
      }).eq('id', bot.id);

    } catch (error) {
      console.error('Error in botMoveLocation:', error);
    }
  }

  /**
   * Send message with bot's personality
   */
  private static async sendBotMessage(bot: BotUser, roomId: string, content: string): Promise<void> {
    await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: bot.id,
      content,
      message_type: 'text',
      created_at: new Date().toISOString()
    });
  }

  /**
   * Get response delay based on bot's response speed
   */
  private static getResponseDelay(speed: BotUser['response_speed']): number {
    const delays = { 
      instant: 100, 
      realistic: 2000 + Math.random() * 4000, // 2-6 seconds
      slow: 5000 + Math.random() * 10000 // 5-15 seconds
    };
    return delays[speed];
  }

  /**
   * Generate location nearby with realistic distribution
   */
  private static generateLocationNearby(centerLat: number, centerLng: number, radiusKm: number) {
    const radiusInDegrees = radiusKm / 111.32;
    
    // Use normal distribution for more realistic clustering
    const u = Math.random();
    const v = Math.random();
    const distance = radiusInDegrees * Math.sqrt(-2 * Math.log(u)) * 0.3; // Cluster closer to center
    const angle = 2 * Math.PI * v;
    
    return {
      lat: centerLat + (distance * Math.cos(angle)),
      lng: centerLng + (distance * Math.sin(angle))
    };
  }

  /**
   * Stop simulation and cleanup
   */
  static stopSimulation(simulationId: string): void {
    const interval = this.activeIntervals.get(simulationId);
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(simulationId);
    }
    
    // Remove bot IDs from tracking when stopping
    const bots = this.activeBots.get(simulationId);
    if (bots && Array.isArray(bots)) {
      bots.forEach(bot => this.allBotIds.delete(bot.id));
    }
    
    this.activeBots.delete(simulationId);
    this.cleanupBotData();
  }

  /**
   * Clean up all bot data
   */
  private static async cleanupBotData(): Promise<void> {
    try {
      // Get all bot IDs from database
      const { data: botUsers } = await supabase
        .from('users')
        .select('id')
        .eq('is_simulated', true);
      
      if (!botUsers || botUsers.length === 0) return;
      
      const botIds = botUsers.map(u => u.id);
      
      // Remove from all related tables
      await supabase.from('room_participants').delete().in('user_id', botIds);
      await supabase.from('room_messages').delete().in('user_id', botIds);
      await supabase.from('prayer_requests').delete().in('from_user_id', botIds);
      await supabase.from('users').delete().eq('is_simulated', true);
      
      // Clear tracking
      this.allBotIds.clear();
      
    } catch (error) {
      console.error('Error cleaning up bot data:', error);
    }
  }

  /**
   * Get active simulations
   */
  static getActiveSimulations(): string[] {
    return Array.from(this.activeIntervals.keys());
  }

  /**
   * Trigger immediate activity for testing
   */
  static async triggerActivityBurst(): Promise<void> {
    for (const [simId, bots] of this.activeBots.entries()) {
      if (bots && bots.length > 0) {
        for (const bot of bots.slice(0, 3)) { // Trigger activity for first 3 bots
          await this.chooseBotActivity(bot);
        }
      }
    }
  }
}