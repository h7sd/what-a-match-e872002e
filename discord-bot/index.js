require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURATION
// ============================================
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GUILD_ID) {
  console.error('❌ Missing environment variables! Check your .env file.');
  process.exit(1);
}

// ============================================
// SUPABASE CLIENT
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// DISCORD CLIENT
// ============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.GuildMember],
});

// ============================================
// ACTIVITY TYPE MAPPING
// ============================================
const activityTypeMap = {
  [ActivityType.Playing]: 'Playing',
  [ActivityType.Streaming]: 'Streaming',
  [ActivityType.Listening]: 'Listening to',
  [ActivityType.Watching]: 'Watching',
  [ActivityType.Custom]: 'Custom',
  [ActivityType.Competing]: 'Competing in',
};

// ============================================
// PRESENCE UPDATE HANDLER
// ============================================
async function updatePresenceInDB(userId, presence, user) {
  try {
    // Check if this user has a profile with this discord_user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('discord_user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error(`❌ Error checking profile for ${userId}:`, profileError.message);
      return;
    }

    if (!profile) {
      // User doesn't have a UserVault profile linked, skip
      return;
    }

    // Get main activity (not custom status)
    const activities = presence?.activities?.filter(a => a.type !== ActivityType.Custom) || [];
    const mainActivity = activities[0];

    // Check for Spotify
    const spotifyActivity = presence?.activities?.find(a => a.name === 'Spotify');
    
    // Build avatar URL
    let avatarUrl = null;
    if (user?.avatar) {
      const ext = user.avatar.startsWith('a_') ? 'gif' : 'webp';
      avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${ext}?size=256`;
    } else {
      const defaultIndex = user?.discriminator === '0' 
        ? Number(BigInt(userId) >> 22n) % 6 
        : parseInt(user?.discriminator || '0') % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    // Build presence data
    const presenceData = {
      profile_id: profile.id,
      discord_user_id: userId,
      username: user?.username || null,
      avatar: avatarUrl,
      status: presence?.status || 'offline',
      activity_name: mainActivity?.name || spotifyActivity?.details || null,
      activity_type: mainActivity ? activityTypeMap[mainActivity.type] : (spotifyActivity ? 'Listening to' : null),
      activity_details: mainActivity?.details || (spotifyActivity ? `${spotifyActivity.details} by ${spotifyActivity.state}` : null),
      activity_state: mainActivity?.state || null,
      activity_large_image: getActivityImage(mainActivity) || (spotifyActivity?.assets?.largeImage ? `https://i.scdn.co/image/${spotifyActivity.assets.largeImage.replace('spotify:', '')}` : null),
      updated_at: new Date().toISOString(),
    };

    // Upsert presence data
    const { error: upsertError } = await supabase
      .from('discord_presence')
      .upsert(presenceData, { 
        onConflict: 'profile_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error(`❌ Error upserting presence for ${userId}:`, upsertError.message);
    } else {
      console.log(`✅ Updated presence for ${user?.username || userId}: ${presence?.status} - ${mainActivity?.name || spotifyActivity?.details || 'No activity'}`);
    }
  } catch (err) {
    console.error(`❌ Unexpected error updating presence for ${userId}:`, err);
  }
}

function getActivityImage(activity) {
  if (!activity?.assets?.largeImage) return null;
  
  const image = activity.assets.largeImage;
  const appId = activity.applicationId;
  
  if (image.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${image.replace('mp:external/', '')}`;
  } else if (image.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${image.replace('spotify:', '')}`;
  } else if (appId) {
    return `https://cdn.discordapp.com/app-assets/${appId}/${image}.png`;
  }
  
  return null;
}

// ============================================
// EVENT HANDLERS
// ============================================
client.once('ready', async () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     UserVault Discord Presence Bot         ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  Bot: ${client.user.tag.padEnd(35)}║`);
  console.log(`║  Guilds: ${client.guilds.cache.size.toString().padEnd(33)}║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  // Initial sync of all members
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    console.log(`📡 Syncing presence for ${guild.memberCount} members in ${guild.name}...`);
    
    try {
      const members = await guild.members.fetch({ withPresences: true });
      let synced = 0;
      
      for (const [memberId, member] of members) {
        if (!member.user.bot) {
          await updatePresenceInDB(memberId, member.presence, member.user);
          synced++;
        }
      }
      
      console.log(`✅ Initial sync complete! Synced ${synced} members.`);
    } catch (err) {
      console.error('❌ Error during initial sync:', err);
    }
  } else {
    console.error(`❌ Could not find guild with ID: ${GUILD_ID}`);
  }
  
  console.log('');
  console.log('👀 Now watching for presence updates...');
  console.log('');
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  if (!newPresence?.member || newPresence.member.user.bot) return;
  
  const userId = newPresence.userId;
  const user = newPresence.member.user;
  
  await updatePresenceInDB(userId, newPresence, user);
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  console.log(`👋 New member joined: ${member.user.username}`);
  await updatePresenceInDB(member.id, member.presence, member.user);
});

client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;
  console.log(`👋 Member left: ${member.user.username}`);
  
  // Set status to offline when they leave
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('discord_user_id', member.id)
    .maybeSingle();
    
  if (profile) {
    await supabase
      .from('discord_presence')
      .update({ status: 'offline', activity_name: null, updated_at: new Date().toISOString() })
      .eq('profile_id', profile.id);
  }
});

// ============================================
// ERROR HANDLING & RECONNECTION
// ============================================
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
  console.warn('⚠️ Discord warning:', warning);
});

client.on('disconnect', () => {
  console.log('🔌 Bot disconnected. Attempting to reconnect...');
});

client.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Discord...');
});

client.on('shardError', (error) => {
  console.error('❌ Shard error:', error);
});

client.on('shardReady', (shardId) => {
  console.log(`✅ Shard ${shardId} is ready`);
});

client.on('shardDisconnect', (event, shardId) => {
  console.log(`🔌 Shard ${shardId} disconnected`);
});

client.on('shardReconnecting', (shardId) => {
  console.log(`🔄 Shard ${shardId} reconnecting...`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', async () => {
  console.log('');
  console.log('👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('');
  console.log('👋 Received SIGTERM, shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// ============================================
// START BOT
// ============================================
console.log('🚀 Starting UserVault Discord Presence Bot...');
client.login(DISCORD_TOKEN).catch((err) => {
  console.error('❌ Failed to login:', err);
  process.exit(1);
});
