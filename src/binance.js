import 'dotenv/config';
import ccxt from 'ccxt';
import axios from 'axios';
import dateFormat from 'dateformat';
import gSheet from './gsheet.js';

import { sendMessage } from '../src/telegram.js';
import { _config } from '../data/config.js';

const binanceClient = new ccxt.binance({
	apiKey: process.env.API_KEY,
	secret: process.env.API_SECRET_KEY,
});

if (!process.env.API_KEY && !process.env.API_SECRET_KEY) {
	let message = `Please set API_KEY & API_SECRET_KEY in the .env file! `;
	sendMessage(message);
	throw new Error(message);
}

export const run = async () => {
	// Set-up google sheets
	await gSheet.connect();

	let message = '';
	console.info(`- - -`.repeat(10));
	message = `Starting bot at ${dateFormat(new Date())}`;
	console.log(message);
	sendMessage(message);
	console.info(`- - -`.repeat(10));

	const config = {
		asset: _config.ASSET,
		base: _config.BASE,
		allocation: _config.ALLOCATION,
		spread: _config.SPREAD,
		tickInterval: _config.TICK_INTERVAL,
	};

	let orders = []; //{ order: 1 }, { oredr: 2 }
	message = `Orders in Queue: ${orders.length}`;
	console.log(message);
	sendMessage(message);

	const tick = async () => {
		const { asset, base, spread, allocation } = config;
		const market = `${asset}/${base}`;

		orders = await binanceClient.fetchOpenOrders(market);

		orders.forEach(async (order) => {
			const binance = await binanceClient.cancelOrder(order.id);
			console.log(`Orders Cancelled: `, binance);
		});

		const results = await Promise.all([
			axios.get(
				`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`,
			),
			axios.get(
				`https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd`,
			),
		]);

		let marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd;

		message = `Market Price: ${marketPrice}`;
		console.log(message);
		sendMessage(message);

		const sellPrice = marketPrice * (1 + spread);
		message = `SellPrice: ${sellPrice}`;
		console.log(message);
		sendMessage(message);

		const buyPrice = marketPrice * (1 - spread);
		message = `buyPrice: ${buyPrice}`;
		console.log(message);
		sendMessage(message);

		const balances = await binanceClient.fetchBalance();
		const assetBalance = balances.free[asset];
		const baseBalance = balances.free[base];
		message = `Base Balance: ${config.base}: ${baseBalance} Asset Balance: ${config.asset}: ${assetBalance}`;
		console.log(message);
		sendMessage(message);

		const sellVolume = assetBalance * allocation;

		// FIXME set buyVolume to 0 for testing purposes
		const buyVolume = ((baseBalance * allocation) / marketPrice) * 0;

		const gSheetdata = {
			Date: Date(),
			Time: new Date(),
			Pair: market,
			MarketPrice: marketPrice,
			BuyPrice: buyPrice,
			SellPrice: sellPrice,
			ExpectedProfit: sellPrice - buyPrice,
			// balances: { baseBalance, assetBalance },
		};
		console.log(gSheetdata.ExpectedProfit);
		gSheet.addRows('Spreads', [gSheetdata]);

		if (buyVolume == 0 && sellVolume == 0) {
			(message = `No Trading Volumes: BUY VOLUME is: ${buyVolume} and SELL VOLUME: ${sellVolume}. `),
				console.log(message);
			// sendMessage(message);
			console.info(`- - - - `.repeat(10));

			return;
		}

		if (buyVolume != 0) {
			const buyOrder = await binanceClient.createLimitBuyOrder(
				market,
				buyVolume,
				buyPrice,
			);
			message = `Buy Order: ${buyOrder}`;
			console.log(message);
			sendMessage(message);
		}
		message = `Buy Volume is ${buyVolume}. You have No purchase Power!!`;
		console.log(message);
		sendMessage(message);

		if (sellVolume != 0) {
			const sellOrder = await binanceClient.createLimitSellOrder(
				market,
				sellVolume,
				sellPrice,
			);
			message = `Sell Order ${sellOrder}`;
			console.log(message);
			sendMessage(message);
		}
		message = `Sell volume is ${sellVolume}. You've Nothing to sell!`;
		console.log(message);
		sendMessage(message);

		message = `New tick for ${market}...
		Created limit sell order for ${sellVolume}  @ ${sellPrice}
		Create limit buy order for ${buyVolume} @ ${buyPrice}
		`;
		console.log(message);
		sendMessage(message);
	};

	if (orders.length == 0) {
		message = `No Orders! Placing Order`;
		console.log(message);
		sendMessage(message);
		message = `* * * * `.repeat(10);
		console.info(message);
		// sendMessage(message);
		tick(config, binanceClient);
		setInterval(tick, config.tickInterval, config, binanceClient);
	}
};

export default run;
