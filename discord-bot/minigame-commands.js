// minigame-commands.js - Discord command handlers for minigames
// Requires: minigames.js (API client)

const { 
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const games = require('./minigames');

// Active game states
const activeTrivia = new Map();
const activeBlackjack = new Map();
const activeGuess = new Map();

// ============ COMMAND DEFINITIONS ============

const commands = [
  new SlashCommandBuilder().setName('trivia').setDescription('🎯 Play trivia and win UV!'),
  new SlashCommandBuilder().setName('slots').setDescription('🎰 Spin the slots!'),
  new SlashCommandBuilder().setName('coin').setDescription('🪙 Flip a coin')
    .addStringOption(opt => opt.setName('guess').setDescription('Heads or tails?').setRequired(true)
      .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),
  new SlashCommandBuilder().setName('rps').setDescription('✂️ Rock Paper Scissors')
    .addStringOption(opt => opt.setName('choice').setDescription('Your choice').setRequired(true)
      .addChoices({ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' })),
  new SlashCommandBuilder().setName('blackjack').setDescription('🃏 Play Blackjack!'),
  new SlashCommandBuilder().setName('guess').setDescription('🔢 Guess the number (1-100)'),
  new SlashCommandBuilder().setName('balance').setDescription('💰 Check your UV balance'),
  new SlashCommandBuilder().setName('daily').setDescription('📅 Claim your daily reward'),
];

// ============ COMMAND HANDLER ============

async function handleCommand(interaction, webhookSecret) {
  const { commandName, user } = interaction;
  
  try {
    await interaction.deferReply();

    switch (commandName) {
      case 'trivia': {
        const trivia = await games.getTrivia();
        activeTrivia.set(user.id, trivia);
        
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('trivia_answer')
            .setPlaceholder('Choose your answer...')
            .addOptions(trivia.options.map((opt, i) => ({ label: opt, value: i.toString() })))
        );
        
        await interaction.editReply({
          content: `🎯 **Trivia**\n\n${trivia.question}\n\n*Category: ${trivia.category}*`,
          components: [row]
        });
        break;
      }

      case 'slots': {
        const slots = await games.spinSlots();
        const result = slots.payout > 0 ? `🎉 **WIN! +${slots.payout} UV**` : '❌ No match';
        await interaction.editReply(`🎰 **Slots**\n\n${slots.display}\n\n${result}`);
        
        if (slots.payout > 0) {
          await games.sendReward(user.id, slots.payout, 'slots', 'Slots win', webhookSecret);
        }
        break;
      }

      case 'coin': {
        const guess = interaction.options.getString('guess');
        const coin = await games.flipCoin();
        const won = coin.result === guess;
        
        await interaction.editReply(
          `🪙 **Coinflip**\n\n${coin.emoji} The coin landed on **${coin.result}**!\n\n` +
          (won ? '🎉 **You won! +10 UV**' : '❌ Better luck next time!')
        );
        
        if (won) {
          await games.sendReward(user.id, 10, 'coinflip', 'Coinflip win', webhookSecret);
        }
        break;
      }

      case 'rps': {
        const choice = interaction.options.getString('choice');
        const rps = await games.playRPS(choice);
        
        if (rps.error) {
          await interaction.editReply(`❌ Error: ${rps.error}`);
          return;
        }
        
        let resultText = '';
        if (rps.result === 'win') {
          resultText = '🎉 **You won! +15 UV**';
          await games.sendReward(user.id, 15, 'rps', 'RPS win', webhookSecret);
        } else if (rps.result === 'lose') {
          resultText = '❌ You lost!';
        } else {
          resultText = '🤝 It\'s a tie!';
        }
        
        await interaction.editReply(
          `✂️ **Rock Paper Scissors**\n\nYou: ${rps.playerEmoji}  vs  Bot: ${rps.botEmoji}\n\n${resultText}`
        );
        break;
      }

      case 'blackjack': {
        const bj = await games.startBlackjack(50);
        activeBlackjack.set(user.id, bj);
        
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
        );
        
        let content = `🃏 **Blackjack** (Bet: 50 UV)\n\nYour hand: ${bj.playerDisplay} (${bj.playerValue})\nDealer: ${bj.dealerDisplay}`;
        
        if (bj.playerValue === 21) {
          content += '\n\n🎉 **BLACKJACK! +75 UV**';
          await games.sendReward(user.id, 75, 'blackjack', 'Blackjack!', webhookSecret);
          await interaction.editReply({ content, components: [] });
        } else {
          await interaction.editReply({ content, components: [row] });
        }
        break;
      }

      case 'guess': {
        const num = await games.generateNumber();
        activeGuess.set(user.id, { secret: num.secret, attempts: 5 });
        
        await interaction.editReply(
          `🔢 **Guess the Number**\n\nI'm thinking of a number between 1 and 100.\nYou have 5 attempts!\n\nType a number in chat to guess.`
        );
        
        const filter = m => m.author.id === user.id && !isNaN(m.content);
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
        
        collector.on('collect', async (m) => {
          const game = activeGuess.get(user.id);
          if (!game) { collector.stop(); return; }
          
          const guessNum = parseInt(m.content);
          const result = await games.checkGuess(game.secret, guessNum);
          game.attempts--;
          
          if (result.correct) {
            await m.reply(`🎉 **Correct!** The number was ${guessNum}! **+${result.reward} UV**`);
            await games.sendReward(user.id, result.reward, 'guess', 'Number guess', webhookSecret);
            activeGuess.delete(user.id);
            collector.stop();
          } else if (game.attempts === 0) {
            await m.reply(`❌ Out of attempts! The number was ${result.answer}.`);
            activeGuess.delete(user.id);
            collector.stop();
          } else {
            await m.reply(`${result.hint} (${game.attempts} attempts left)`);
          }
        });
        break;
      }

      case 'balance': {
        const balance = await games.getBalance(user.id, webhookSecret);
        if (balance.error) {
          await interaction.editReply(`❌ Error: ${balance.error}`);
        } else {
          await interaction.editReply(`💰 **Your Balance**\n\nBalance: **${balance.balance} UV**\nTotal Earned: ${balance.totalEarned} UV`);
        }
        break;
      }

      case 'daily': {
        const daily = await games.claimDaily(user.id, webhookSecret);
        if (daily.error) {
          await interaction.editReply(`❌ ${daily.error}`);
        } else {
          await interaction.editReply(`📅 **Daily Reward**\n\n🎉 Claimed **${daily.amount} UV**!\n🔥 Streak: ${daily.streak} days\n💰 New Balance: ${daily.newBalance} UV`);
        }
        break;
      }
    }
  } catch (error) {
    console.error('Minigame error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

// ============ BUTTON HANDLER (Blackjack) ============

async function handleButton(interaction, webhookSecret) {
  const { customId, user } = interaction;
  
  if (!customId.startsWith('bj_')) return false;
  
  const game = activeBlackjack.get(user.id);
  if (!game) {
    await interaction.reply({ content: '❌ No active game.', ephemeral: true });
    return true;
  }
  
  await interaction.deferUpdate();
  
  if (customId === 'bj_hit') {
    const result = await games.blackjackHit(game.deck, game.playerHand);
    Object.assign(game, result);
    
    let content = `🃏 **Blackjack** (Bet: 50 UV)\n\nYour hand: ${result.playerDisplay} (${result.playerValue})\nDealer: ${game.dealerDisplay}`;
    
    if (result.busted) {
      content += '\n\n💥 **BUST! You lose!**';
      activeBlackjack.delete(user.id);
      await interaction.editReply({ content, components: [] });
    } else {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
      );
      await interaction.editReply({ content, components: [row] });
    }
  } else if (customId === 'bj_stand') {
    const result = await games.blackjackStand(game.deck, game.dealerHand, game.playerValue);
    
    let content = `🃏 **Blackjack** (Bet: 50 UV)\n\nYour hand: ${game.playerDisplay} (${game.playerValue})\nDealer: ${result.dealerDisplay} (${result.dealerValue})\n\n`;
    
    if (result.result === 'win') {
      content += '🎉 **You win! +100 UV**';
      await games.sendReward(user.id, 100, 'blackjack', 'Blackjack win', webhookSecret);
    } else if (result.result === 'lose') {
      content += '❌ **Dealer wins!**';
    } else {
      content += '🤝 **Push! Bet returned.**';
    }
    
    activeBlackjack.delete(user.id);
    await interaction.editReply({ content, components: [] });
  }
  
  return true;
}

// ============ SELECT MENU HANDLER (Trivia) ============

async function handleSelectMenu(interaction, webhookSecret) {
  const { customId, user, values } = interaction;
  
  if (customId !== 'trivia_answer') return false;
  
  const trivia = activeTrivia.get(user.id);
  if (!trivia) {
    await interaction.reply({ content: '❌ No active trivia.', ephemeral: true });
    return true;
  }
  
  await interaction.deferUpdate();
  
  const selectedAnswer = trivia.options[parseInt(values[0])];
  const result = await games.checkTrivia(trivia.question, selectedAnswer);
  
  let content = `🎯 **Trivia**\n\n${trivia.question}\n\n`;
  
  if (result.correct) {
    content += `✅ **Correct!** +${result.reward} UV`;
    await games.sendReward(user.id, result.reward, 'trivia', 'Trivia correct', webhookSecret);
  } else {
    content += `❌ Wrong! The answer was: **${result.correctAnswer}**`;
  }
  
  activeTrivia.delete(user.id);
  await interaction.editReply({ content, components: [] });
  return true;
}

// ============ EXPORTS ============

module.exports = {
  commands,
  handleCommand,
  handleButton,
  handleSelectMenu,
  // Expose active games if needed
  activeTrivia,
  activeBlackjack,
  activeGuess,
};
