require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const crypto = require('crypto');

// ============================================
// CONFIGURATION
// ============================================
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL;
const GUILD_ID = process.env.GUILD_ID;
const WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET;

if (!DISCORD_TOKEN || !EDGE_FUNCTION_URL || !GUILD_ID || !WEBHOOK_SECRET) {
  console.error('❌ Missing environment variables! Check your .env file.');
  console.error('Required: DISCORD_BOT_TOKEN, EDGE_FUNCTION_URL, GUILD_ID, DISCORD_WEBHOOK_SECRET');
  process.exit(1);
}

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
// HMAC SIGNATURE GENERATION
// ============================================
function generateSignature(payload, timestamp) {
  const message = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(message)
    .digest('hex');
}

// ============================================
// PRESENCE UPDATE HANDLER
// ============================================
async function updatePresence(userId, presence, user) {
  try {
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
      username: user?.username || null,
      avatar: avatarUrl,
      status: presence?.status || 'offline',
      activity_name: mainActivity?.name || (spotifyActivity ? spotifyActivity.details : null),
      activity_type: mainActivity ? activityTypeMap[mainActivity.type] : (spotifyActivity ? 'Listening to' : null),
      activity_details: mainActivity?.details || (spotifyActivity ? `${spotifyActivity.details} by ${spotifyActivity.state}` : null),
      activity_state: mainActivity?.state || null,
      activity_large_image: getActivityImage(mainActivity) || getSpotifyImage(spotifyActivity),
    };

    // Build payload with timestamp for replay protection
    const timestamp = Date.now();
    const payload = JSON.stringify({
      action: 'update',
      discord_user_id: userId,
      presence_data: presenceData,
    });

    // Generate HMAC signature
    const signature = generateSignature(payload, timestamp);

    // Send to edge function with signature
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-timestamp': timestamp.toString(),
      },
      body: payload,
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${user?.username || userId}: ${presence?.status} - ${presenceData.activity_name || 'No activity'}`);
    } else if (result.skipped) {
      // User doesn't have a profile, silently skip
    } else if (result.error) {
      console.error(`❌ Error for ${userId}:`, result.error);
    }
  } catch (err) {
    console.error(`❌ Failed to update ${userId}:`, err.message);
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

function getSpotifyImage(spotifyActivity) {
  if (!spotifyActivity?.assets?.largeImage) return null;
  const image = spotifyActivity.assets.largeImage;
  if (image.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${image.replace('spotify:', '')}`;
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

  // Initial sync
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    console.log(`📡 Syncing ${guild.memberCount} members from ${guild.name}...`);
    
    try {
      const members = await guild.members.fetch({ withPresences: true });
      let synced = 0;
      
      for (const [memberId, member] of members) {
        if (!member.user.bot) {
          await updatePresence(memberId, member.presence, member.user);
          synced++;
          // Small delay to avoid rate limits
          if (synced % 10 === 0) {
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }
      
      console.log(`✅ Initial sync complete! Processed ${synced} members.`);
    } catch (err) {
      console.error('❌ Error during initial sync:', err.message);
    }
  } else {
    console.error(`❌ Could not find guild: ${GUILD_ID}`);
  }
  
  console.log('');
  console.log('👀 Watching for presence updates...');
  console.log('');
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  if (!newPresence?.member || newPresence.member.user.bot) return;
  await updatePresence(newPresence.userId, newPresence, newPresence.member.user);
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  console.log(`👋 ${member.user.username} joined`);
  await updatePresence(member.id, member.presence, member.user);
});

client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;
  console.log(`👋 ${member.user.username} left`);
  // Set offline
  await updatePresence(member.id, { status: 'offline', activities: [] }, member.user);
});

// ============================================
// ERROR HANDLING
// ============================================
client.on('error', (error) => console.error('❌ Client error:', error.message));
client.on('warn', (warning) => console.warn('⚠️ Warning:', warning));

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

// ============================================
// START
// ============================================
console.log('🚀 Starting UserVault Discord Presence Bot...');
client.login(DISCORD_TOKEN).catch((err) => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});
