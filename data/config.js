import 'dotenv/config';

export const _config = {
	ASSET: 'BTC',
	BASE: 'USDT',
	ALLOCATION: 0.2,
	SPREAD: 0.001,
	TICK_INTERVAL: 20000 * 60,
	TIMEOUT_BEFORE_SELL: 1000 * 60,

	BOT_TOKEN: process.env.BOT_TOKEN,

	WHITELISTED_USERS: ['1361167919'],

	GSHEET_ID: process.env.GSHEET_ID,
	GSHEET_CLIENT_EMAIL: process.env.GSHEET_CLIENT_EMAIL,
	GSHEET_PRIVATE_KEY: process.env.GSHEET_PRIVATE_KEY,
};

export default { _config };
