import 'dotenv/config';

export const _config = {
	ASSET: 'BTC',
	BASE: 'USDT',
	ALLOCATION: 1,
	SPREAD: 0.001,
	TICK_INTERVAL: 20000,

	BOT_TOKEN: process.env.BOT_TOKEN,

	WHITELISTED_USERS: ['1361167919'],
};

export default { _config };
