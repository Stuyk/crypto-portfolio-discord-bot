import { ICommand } from '../interfaces/ICommand';
import * as path from 'path';
import * as fs from 'fs';
import * as Discord from 'discord.js';

const commands: Array<ICommand> = [
    {
        name: 'help',
        command: help,
        description: '- Stop it. Get some help.',
    },
];

export function registerCommand(command: ICommand) {
    if (command.name.includes(' ')) {
        throw new Error(`Commands cannot contain spaces.`);
    }

    commands.push(command);
    console.log(`[BOT] Registered Command ${command.name}`);
}

export function getCommand(commandName: string): ICommand {
    return commands.find((cmd) => cmd.name === commandName);
}

export async function propogateCommands(cwd: string) {
    const commandsDir = path.join(cwd, 'commands');
    const files = fs.readdirSync(commandsDir);

    for (let i = 0; i < files.length; i++) {
        await import(path.join(commandsDir, files[i]));
    }
}

function help(msg: Discord.Message): void {
    let data = 'Here are some commands... \r\n ```';

    commands.forEach((cmd) => {
        data += `!${cmd.name} - ${cmd.description} \r\n`;
    });

    data += '\r\n```';
    msg.reply(data);
}
