const { Client, GatewayIntentBits, Partials, Collection, Routes } = require('discord.js');
const fs = require('fs');
const express = require('express');
const { REST } = require('@discordjs/rest');
const { token, clientId, guildId } = require('./config.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Tiny web server for UptimeRobot
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// === Bot setup ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const ROLE_ID = '1482764400149528777';

// === Collections for commands/data ===
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// === XP / Leveling ===
let xpData = {};
if (fs.existsSync('xp.json')) xpData = JSON.parse(fs.readFileSync('xp.json'));

client.on('messageCreate', message => {
  if (message.author.bot) return;
  const id = message.author.id;
  xpData[id] = (xpData[id] || 0) + Math.floor(Math.random() * 10) + 5;
  fs.writeFileSync('xp.json', JSON.stringify(xpData, null, 2));
});

// === Slash Command Handler ===
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Role restriction for admin commands
  const adminCommands = ['warn', 'kick', 'mute', 'nuke', 'gstart', 'giverole', 'removerole', 'announce', 'modmailreply'];
  if (adminCommands.includes(interaction.commandName)) {
    if (!interaction.member.roles.cache.has(ROLE_ID)) {
      return interaction.reply({ content: '❌ You do not have permission!', ephemeral: true });
    }
  }

  try {
    await command.execute(interaction, client, ROLE_ID);
  } catch (error) {
    console.error(error);
    interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
  }
});

// === Auto QOTD ===
const questions = [
  'What is your favorite color?',
  'Best movie you watched recently?',
  'Dream job?',
  'Favorite game?'
];
const QOTD_CHANNEL = 'general'; // change to your channel name
setInterval(async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  const channel = guild.channels.cache.find(c => c.name === QOTD_CHANNEL && c.isTextBased());
  if (!channel) return;
  const question = `❓ **QOTD:** ${questions[Math.floor(Math.random() * questions.length)]}`;
  channel.send(question);
}, 24 * 60 * 60 * 1000); // every 24h

client.once('ready', () => {
  console.log(`Bot online as ${client.user.tag}`);
});

client.login(token);