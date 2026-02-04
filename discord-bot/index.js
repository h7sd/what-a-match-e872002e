require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes } = require('discord.js');
const crypto = require('crypto');
const {
  commands,
  handleBalance,
  handleDaily,
  handleTrivia,
  handleCoinflip,
  handleSlots,
  handleRPS,
  handleBlackjack,
  handleLink,
  activeGames
} = require('./commands');
const { handValue, formatHand, createDeck, sendReward, getBalance } = require('./minigames');

// ============================================
// CONFIGURATION
// ============================================
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL;
const BADGE_REQUEST_EDGE_URL = process.env.BADGE_REQUEST_EDGE_URL || 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/badge-request';
const GUILD_ID = process.env.GUILD_ID;
const WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
const BADGE_REQUEST_CHANNEL_ID = process.env.BADGE_REQUEST_CHANNEL_ID || '1466581321169240076';
const BOT_BADGE_REQUESTS_URL = process.env.BOT_BADGE_REQUESTS_URL || 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/bot-badge-requests';
const MINIGAME_EDGE_URL = process.env.MINIGAME_EDGE_URL || 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/minigame-reward';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

// Track already notified requests to avoid duplicates
const notifiedRequests = new Set();

// Config object for minigame handlers
const minigameConfig = {
  MINIGAME_EDGE_URL,
  DISCORD_WEBHOOK_SECRET: WEBHOOK_SECRET
};

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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.GuildMember, Partials.Channel],
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
// HIDDEN ENDPOINT URLS FOR BADGE ACTIONS
// ============================================
const APPROVE_ENDPOINT = 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/x98zg89ezhg938g893g9389g3489g3894z';
const DENY_ENDPOINT = 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/x809guj305gh9i00hezg890zu9ergo9ieuoh';
const EDIT_APPROVE_ENDPOINT = 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/x67ytf6t9f85hzohjoi90879sft7t623ui23u4g';

// ============================================
// BADGE REQUEST HANDLING
// ============================================
async function handleBadgeAction(action, requestId, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Choose endpoint based on action
  let endpoint;
  let payload;
  
  if (action === 'approve' && (options.editedName || options.editedDescription || options.editedColor || options.editedIconUrl)) {
    // Edit & Approve
    endpoint = EDIT_APPROVE_ENDPOINT;
    payload = JSON.stringify({
      requestId,
      editedName: options.editedName,
      editedDescription: options.editedDescription,
      editedColor: options.editedColor,
      editedIconUrl: options.editedIconUrl,
    });
  } else if (action === 'approve') {
    // Simple Approve
    endpoint = APPROVE_ENDPOINT;
    payload = JSON.stringify({ requestId });
  } else if (action === 'deny') {
    // Deny
    endpoint = DENY_ENDPOINT;
    payload = JSON.stringify({
      requestId,
      denialReason: options.denialReason,
    });
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
  
  const signature = generateSignature(payload, timestamp);

  console.log(`🔗 Calling ${action} endpoint for request ${requestId.substring(0, 8)}...`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': signature,
      'x-timestamp': timestamp.toString(),
    },
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`❌ Action ${action} failed: ${response.status} ${response.statusText}`);
    console.error(`Response body: ${text}`);
  }

  return response.json();
}

// ============================================
// INTERACTION HANDLER (Buttons & Modals)
// ============================================
client.on('interactionCreate', async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    
    switch (commandName) {
      case 'balance': return handleBalance(interaction, minigameConfig);
      case 'daily': return handleDaily(interaction, minigameConfig);
      case 'trivia': return handleTrivia(interaction, minigameConfig);
      case 'coinflip': return handleCoinflip(interaction, minigameConfig);
      case 'slots': return handleSlots(interaction, minigameConfig);
      case 'rps': return handleRPS(interaction, minigameConfig);
      case 'blackjack': return handleBlackjack(interaction, minigameConfig);
      case 'link': return handleLink(interaction, minigameConfig);
    }
    return;
  }

  // Check if user is admin for badge management
  const isAdmin = ADMIN_USER_IDS.includes(interaction.user.id);
  
  if (!isAdmin) {
    if (interaction.isButton() || interaction.isModalSubmit()) {
      // Check for blackjack buttons (anyone can use their own)
      if (interaction.isButton() && interaction.customId.startsWith('bj_')) {
        return handleBlackjackButton(interaction);
      }
      return interaction.reply({ 
        content: '❌ You do not have permission to manage badge requests.', 
        ephemeral: true 
      });
    }
    return;
  }
  
  // Handle blackjack buttons for admins too
  if (interaction.isButton() && interaction.customId.startsWith('bj_')) {
    return handleBlackjackButton(interaction);
  }

  // Handle button clicks
  if (interaction.isButton()) {
    const customId = interaction.customId;
    
    // Badge Approve Button
    if (customId.startsWith('badge_approve_')) {
      const requestId = customId.replace('badge_approve_', '');
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const result = await handleBadgeAction('approve', requestId);
        
        if (result.success) {
          await interaction.editReply({ content: '✅ Badge request approved! User has been notified via email.' });
          
          // Update original message
          const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0x22c55e)
            .setTitle('✅ Badge Request APPROVED')
            .setFooter({ text: `Approved by ${interaction.user.tag}` });
          
          await interaction.message.edit({ embeds: [embed], components: [] });
        } else {
          await interaction.editReply({ content: `❌ Failed to approve: ${result.error}` });
        }
      } catch (err) {
        await interaction.editReply({ content: `❌ Error: ${err.message}` });
      }
    }
    
    // Badge Deny Button - Show modal for reason
    if (customId.startsWith('badge_deny_')) {
      const requestId = customId.replace('badge_deny_', '');
      
      const modal = new ModalBuilder()
        .setCustomId(`badge_deny_modal_${requestId}`)
        .setTitle('Deny Badge Request');
      
      const reasonInput = new TextInputBuilder()
        .setCustomId('denial_reason')
        .setLabel('Reason for denial')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Please provide a reason for denying this badge request...')
        .setRequired(true)
        .setMaxLength(500);
      
      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      
      await interaction.showModal(modal);
    }
    
    // Badge Edit Button - Show modal for editing
    if (customId.startsWith('badge_edit_')) {
      const requestId = customId.replace('badge_edit_', '');
      
      const modal = new ModalBuilder()
        .setCustomId(`badge_edit_modal_${requestId}`)
        .setTitle('Edit & Approve Badge');
      
      const nameInput = new TextInputBuilder()
        .setCustomId('edited_name')
        .setLabel('Badge Name (leave empty to keep original)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(30);
      
      const descInput = new TextInputBuilder()
        .setCustomId('edited_description')
        .setLabel('Description (leave empty to keep original)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(100);
      
      const colorInput = new TextInputBuilder()
        .setCustomId('edited_color')
        .setLabel('Color hex (e.g. #8B5CF6)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7);
      
      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(colorInput)
      );
      
      await interaction.showModal(modal);
    }
  }
  
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    const customId = interaction.customId;
    
    // Denial Modal
    if (customId.startsWith('badge_deny_modal_')) {
      const requestId = customId.replace('badge_deny_modal_', '');
      const denialReason = interaction.fields.getTextInputValue('denial_reason');
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const result = await handleBadgeAction('deny', requestId, { denialReason });
        
        if (result.success) {
          await interaction.editReply({ content: '✅ Badge request denied. User has been notified via email.' });
          
          // Update original message
          const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0xef4444)
            .setTitle('❌ Badge Request DENIED')
            .addFields({ name: '📋 Denial Reason', value: denialReason })
            .setFooter({ text: `Denied by ${interaction.user.tag}` });
          
          await interaction.message.edit({ embeds: [embed], components: [] });
        } else {
          await interaction.editReply({ content: `❌ Failed to deny: ${result.error}` });
        }
      } catch (err) {
        await interaction.editReply({ content: `❌ Error: ${err.message}` });
      }
    }
    
    // Edit Modal
    if (customId.startsWith('badge_edit_modal_')) {
      const requestId = customId.replace('badge_edit_modal_', '');
      const editedName = interaction.fields.getTextInputValue('edited_name') || undefined;
      const editedDescription = interaction.fields.getTextInputValue('edited_description') || undefined;
      const editedColor = interaction.fields.getTextInputValue('edited_color') || undefined;
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const result = await handleBadgeAction('approve', requestId, {
          editedName,
          editedDescription,
          editedColor,
        });
        
        if (result.success) {
          await interaction.editReply({ content: '✅ Badge edited and approved! User has been notified via email.' });
          
          // Update original message
          const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0x22c55e)
            .setTitle('✅ Badge Request APPROVED (Edited)')
            .setFooter({ text: `Approved by ${interaction.user.tag}` });
          
          if (editedName) embed.addFields({ name: '✏️ Edited Name', value: editedName, inline: true });
          if (editedColor) embed.addFields({ name: '🎨 Edited Color', value: editedColor, inline: true });
          if (editedDescription) embed.addFields({ name: '📝 Edited Description', value: editedDescription });
          
          await interaction.message.edit({ embeds: [embed], components: [] });
        } else {
          await interaction.editReply({ content: `❌ Failed to approve: ${result.error}` });
        }
      } catch (err) {
        await interaction.editReply({ content: `❌ Error: ${err.message}` });
      }
    }
  }
});

// ============================================
// BADGE REQUEST POLLING
// ============================================
async function checkForNewBadgeRequests() {
  try {
    console.log('🔍 Checking for new badge requests...');
    
    // Generate HMAC signature for secure request
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ action: 'poll' });
    const signature = generateSignature(payload, timestamp);
    
    // Call secure edge function (uses service role internally, bypasses RLS)
    const response = await fetch(BOT_BADGE_REQUESTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-timestamp': timestamp.toString(),
      },
      body: payload,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`❌ Failed to fetch badge requests: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`);
      return;
    }

    const data = await response.json();
    const requests = data.requests || [];
    console.log(`📦 Found ${requests.length} pending badge request(s)`);
    
    const channel = client.channels.cache.get(BADGE_REQUEST_CHANNEL_ID);
    
    if (!channel) {
      console.error(`❌ Badge request channel not found: ${BADGE_REQUEST_CHANNEL_ID}`);
      console.error('❌ Make sure the bot has access to this channel and the channel ID is correct!');
      return;
    }
    
    console.log(`✅ Channel found: #${channel.name}`);

    for (const request of requests) {
      // Skip if already notified
      if (notifiedRequests.has(request.id)) continue;

      // Data is already enriched by the edge function
      const username = request.username || 'Unknown';
      const uid = request.uid_number ?? 'N/A';
      const email = request.email || 'N/A';
      
      // Build embed
      const embed = new EmbedBuilder()
        .setTitle('🏷️ New Badge Request')
        .setColor(parseInt(request.badge_color.replace('#', ''), 16))
        .addFields(
          { name: '👤 Username', value: `@${username}`, inline: true },
          { name: '🆔 UID', value: `#${uid}`, inline: true },
          { name: '📧 Email', value: email, inline: true },
          { name: '🏷️ Badge Name', value: request.badge_name, inline: false },
          { name: '📝 Description', value: request.badge_description || 'No description', inline: false },
          { name: '🎨 Color', value: request.badge_color, inline: true },
          { name: '🖼️ Icon', value: request.badge_icon_url ? `[View](${request.badge_icon_url})` : 'Default', inline: true },
          { name: '🔑 Request ID', value: `\`${request.id}\``, inline: false },
        )
        .setTimestamp(new Date(request.created_at))
        .setFooter({ text: 'Click a button below to manage this request' });

      if (request.badge_icon_url) {
        embed.setThumbnail(request.badge_icon_url);
      }

      // Build buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`badge_approve_${request.id}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`badge_deny_${request.id}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`badge_edit_${request.id}`)
          .setLabel('Edit & Approve')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✏️'),
      );

      // Send message
      await channel.send({ embeds: [embed], components: [row] });
      console.log(`📨 Sent badge request notification for ${username} (${request.id.substring(0, 8)})`);
      
      // Mark as notified
      notifiedRequests.add(request.id);
    }
    
    if (requests.length === 0) {
      console.log('✅ No new badge requests to process');
    }
  } catch (err) {
    console.error('❌ Error checking badge requests:', err.message);
    console.error('Stack trace:', err.stack);
  }
}

// ============================================
// BOT READY EVENT
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

  // ========= REGISTER SLASH COMMANDS =========
  if (CLIENT_ID) {
    console.log('📝 Registering slash commands...');
    try {
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands.map(c => c.toJSON()) }
      );
      console.log(`✅ Registered ${commands.length} slash commands!`);
    } catch (err) {
      console.error('❌ Failed to register commands:', err.message);
    }
  } else {
    console.log('⚠️ DISCORD_CLIENT_ID not set - skipping command registration');
  }
  console.log('');

  console.log('📋 Badge Request Management: ENABLED');
  console.log(`🔗 Using secure edge function: ${BOT_BADGE_REQUESTS_URL}`);
  console.log(`📢 Badge Request Channel: ${BADGE_REQUEST_CHANNEL_ID}`);
  console.log(`👮 Admin Users: ${ADMIN_USER_IDS.length > 0 ? ADMIN_USER_IDS.join(', ') : 'Not configured'}`);
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
  
  // Start badge request polling (every 30 seconds)
  console.log('🔄 Starting badge request polling (every 30s)...');
  await checkForNewBadgeRequests(); // Initial check
  setInterval(checkForNewBadgeRequests, 30000);
  
  console.log('');
  console.log('👀 Watching for presence updates and badge requests...');
  console.log('🎮 Minigame commands: /balance, /daily, /trivia, /coinflip, /slots, /rps, /blackjack, /link');
  console.log('');
});

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
// BOOSTER BADGE EDGE FUNCTION
// ============================================
const BOOSTER_BADGE_URL = process.env.BOOSTER_BADGE_URL || 'https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/assign-booster-badge';

async function handleBoosterBadge(discordUserId, action) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ action, discordUserId });
    const signature = generateSignature(payload, timestamp);

    console.log(`🎉 ${action === 'boost_start' ? 'Assigning' : 'Removing'} booster badge for Discord user ${discordUserId}`);

    const response = await fetch(BOOSTER_BADGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-timestamp': timestamp.toString(),
      },
      body: payload,
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Booster badge ${action === 'boost_start' ? 'assigned' : 'removed'} successfully`);
      } else {
        console.log(`⚠️ Booster badge action skipped: ${result.error || 'Unknown reason'}`);
      }
    } else {
      const text = await response.text().catch(() => '');
      console.error(`❌ Failed to ${action === 'boost_start' ? 'assign' : 'remove'} booster badge:`, response.status, text);
    }
  } catch (err) {
    console.error('❌ Error handling booster badge:', err.message);
  }
}

// ============================================
// EVENT HANDLERS
// ============================================
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
// BOOST DETECTION (guildMemberUpdate)
// ============================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (newMember.user.bot) return;

  const wasBoosting = !!oldMember.premiumSince;
  const isBoosting = !!newMember.premiumSince;

  // User started boosting
  if (!wasBoosting && isBoosting) {
    console.log(`🚀 ${newMember.user.username} started boosting the server!`);
    await handleBoosterBadge(newMember.id, 'boost_start');
  }

  // User stopped boosting
  if (wasBoosting && !isBoosting) {
    console.log(`😢 ${newMember.user.username} stopped boosting the server.`);
    await handleBoosterBadge(newMember.id, 'boost_end');
  }
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
