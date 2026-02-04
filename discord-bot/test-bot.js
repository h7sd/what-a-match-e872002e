// test-bot.js - Minimal Discord bot to test minigame API
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

// Import the thin client
const games = require('./minigames-api');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET;

// Define test commands
const commands = [
  new SlashCommandBuilder().setName('test-trivia').setDescription('Test trivia API'),
  new SlashCommandBuilder().setName('test-slots').setDescription('Test slots API'),
  new SlashCommandBuilder().setName('test-coin').setDescription('Test coinflip API'),
  new SlashCommandBuilder().setName('test-rps').setDescription('Test RPS API')
    .addStringOption(opt => opt.setName('choice').setDescription('rock/paper/scissors').setRequired(true)),
  new SlashCommandBuilder().setName('test-blackjack').setDescription('Test blackjack API'),
  new SlashCommandBuilder().setName('test-balance').setDescription('Test balance API'),
  new SlashCommandBuilder().setName('test-reward').setDescription('Test reward API (adds 10 UV)'),
];

// Register commands on startup
client.once('ready', async () => {
  console.log(`✅ Test bot ready as ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  
  try {
    console.log('📝 Registering test commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log('✅ Commands registered!');
  } catch (error) {
    console.error('❌ Command registration failed:', error);
  }
});

// Handle commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;
  
  try {
    await interaction.deferReply();

    switch (commandName) {
      case 'test-trivia': {
        const trivia = await games.getTrivia();
        await interaction.editReply(`🎯 **Trivia API Test**\n\`\`\`json\n${JSON.stringify(trivia, null, 2)}\n\`\`\``);
        break;
      }

      case 'test-slots': {
        const slots = await games.spinSlots();
        await interaction.editReply(`🎰 **Slots API Test**\n${slots.display}\nPayout: ${slots.payout} UV`);
        break;
      }

      case 'test-coin': {
        const coin = await games.flipCoin();
        await interaction.editReply(`🪙 **Coinflip API Test**\n${coin.emoji} Result: **${coin.result}**`);
        break;
      }

      case 'test-rps': {
        const choice = interaction.options.getString('choice');
        const rps = await games.playRPS(choice);
        if (rps.error) {
          await interaction.editReply(`❌ Error: ${rps.error}`);
        } else {
          await interaction.editReply(
            `✂️ **RPS API Test**\n` +
            `You: ${rps.playerEmoji} vs Bot: ${rps.botEmoji}\n` +
            `Result: **${rps.result.toUpperCase()}**`
          );
        }
        break;
      }

      case 'test-blackjack': {
        const bj = await games.startBlackjack(50);
        await interaction.editReply(
          `🃏 **Blackjack API Test**\n` +
          `Your hand: ${bj.playerDisplay} (${bj.playerValue})\n` +
          `Dealer: ${bj.dealerDisplay}\n` +
          `Game ID: ${bj.gameId}`
        );
        break;
      }

      case 'test-balance': {
        const balance = await games.getBalance(user.id, WEBHOOK_SECRET);
        if (balance.error) {
          await interaction.editReply(`❌ Error: ${balance.error}`);
        } else {
          await interaction.editReply(
            `💰 **Balance API Test**\n` +
            `User: ${balance.username}\n` +
            `Balance: ${balance.balance} UV\n` +
            `Total Earned: ${balance.totalEarned} UV`
          );
        }
        break;
      }

      case 'test-reward': {
        const reward = await games.sendReward(user.id, 10, 'test', 'API Test Reward', WEBHOOK_SECRET);
        if (reward.error) {
          await interaction.editReply(`❌ Error: ${reward.error}`);
        } else {
          await interaction.editReply(
            `✅ **Reward API Test**\n` +
            `Added 10 UV to ${reward.username}\n` +
            `New Balance: ${reward.newBalance} UV`
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error('Command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
