import Discord from 'discord.js';
import { Database, onReady } from './utility/database';
import { fetchTokens, createUpdateInterval, fetchTickerPrice } from './utility/fetch';
import { COLLECTIONS } from './enums/collections';
import { getCommand, propogateCommands } from './service/commands';
import { periodicUpdate } from './utility/periodicUpdate';
import dotenv from 'dotenv';
import { IConfig } from './interfaces/IConfig';

const config: IConfig = dotenv.config().parsed as IConfig;
const cwd = require.main.path;

if (!config.DATABASE_URL) {
    throw new Error(`Missing DATABASE_URL from env variables.`);
}

if (!config.DISCORD_BOT_TOKEN) {
    throw new Error(`Missing DISCORD_BOT_TOKEN from env variables.`);
}

new Database(
    config.DATABASE_URL,
    config.DATABASE_NAME,
    [COLLECTIONS.CRYPTO],
    config.DATABASE_USERNAME,
    config.DATABASE_PASSWORD
);

onReady(finishConnection);

const client = new Discord.Client({ ws: { intents: new Discord.Intents(Discord.Intents.ALL) } });

client.on('ready', async () => {
    await fetchTokens();
    await fetchTickerPrice('BTC');
    await fetchTickerPrice('ETH');
    await fetchTickerPrice('LTC');
    await fetchTickerPrice('LINK');
    await fetchTickerPrice('DOGE');
    await fetchTickerPrice('ADA');
    createUpdateInterval();
    periodicUpdate();
});

client.on('message', (msg: Discord.Message) => {
    if (msg.author.bot) {
        return;
    }

    if (msg.content.includes(`@!`)) {
        return;
    }

    if (!msg.content.startsWith('!')) {
        return;
    }

    // Parse Command
    const messageContent = msg.content.substring(1);
    if (messageContent.length <= 0) {
        msg.reply('Not a command.');
        return;
    }

    const args = messageContent.split(' ');
    const commandName = args.shift();
    const commandRef = getCommand(commandName);

    // Find Command Index
    if (!commandRef) {
        msg.reply('Did not find that command in my index.');
        return;
    }

    // Execute Command with args
    commandRef.command(msg, ...args);
});

export function getDiscordUser(id: string): Discord.User {
    return client.users.cache.get(id);
}

async function finishConnection() {
    client.login(config.DISCORD_BOT_TOKEN);
    propogateCommands(cwd);
}
