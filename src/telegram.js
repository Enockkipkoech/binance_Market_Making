import { Context as ctx, Telegraf } from 'telegraf';
import 'dotenv/config';

const config = {
	WHITELISTED_USERS: [process.env.WHITELISTED_USERS],
	BOT_TOKEN: process.env.BOT_TOKEN,
};
const bot = new Telegraf(config.BOT_TOKEN);

const normalizeMessage = (message) => {
	return message
		.replaceAll('_', '\\_')
		.replaceAll('|', '\\|')
		.replaceAll('.', '\\.')
		.replaceAll('{', '\\{')
		.replaceAll('}', '\\}')
		.replaceAll('=', '\\=')
		.replaceAll('+', '\\+')
		.replaceAll('>', '\\>')
		.replaceAll('<', '\\<')
		.replaceAll('-', '\\-')
		.replaceAll('!', '\\!');
};

bot.use(async (ctx, next) => {
	try {
		let userId = ctx.message.from.id || '';

		if (process.env.WHITELISTED_USERS.includes(userId.toString())) {
			await next();
			return;
		} else {
			return ctx.reply('You are NOT allowed to use this BotChannel!');
		}
	} catch (error) {
		console.log(error);
	}
});

export const sendMessage = async (message) => {
	try {
		for (const id of config.WHITELISTED_USERS) {
			await bot.telegram.sendMessage(id, normalizeMessage(message), {
				parse_mode: 'MarkdownV2',
				disable_web_page_preview: true,
			});
		}
	} catch (error) {
		console.log(error);
	}
};
export default { bot, sendMessage };
