import 'dotenv/config';
import ccxt from 'ccxt';
import axios from 'axios';
import dateFormat from 'dateformat';
import gSheet from './gsheet.js';
import chalk from 'chalk';

import { sendMessage } from '../src/telegram.js';
import { _config } from '../data/config.js';

const binanceClient = new ccxt.binance({
	apiKey: process.env.API_KEY,
	secret: process.env.API_SECRET_KEY,
});

if (!process.env.API_KEY && !process.env.API_SECRET_KEY) {
	let message = `Please set API_KEY & API_SECRET_KEY in the .env file! `;
	sendMessage(message);
	console.log(chalk.red(message));
	throw new Error(message);
}

export const run = async () => {
	// Set-up google sheets
	await gSheet.connect();

	let message = '';
	console.info(`- - -`.repeat(10));
	message = `Starting bot at ${dateFormat(
		new Date(),
		'dddd,mmmm d,yyyy, h:MM:ss TT',
	)}`;
	console.log(chalk.bgGreenBright(message));
	sendMessage(message);
	console.info(`- - -`.repeat(10));

	const config = {
		asset: _config.ASSET,
		base: _config.BASE,
		allocation: _config.ALLOCATION,
		spread: _config.SPREAD,
		tickInterval: _config.TICK_INTERVAL,
	};
	// let orders = ['open' | 'canceled' | 'NEW' | 'filled']; //{ order: 1 }, { oredr: 2 }

	const tick = async () => {
		const { asset, base, spread, allocation } = config;
		const market = `${asset}/${base}`;

		let orders = await binanceClient.fetchOrders(market);
		let orderStatus = JSON.stringify(orders[orders.length - 1].status, null, 2);

		message = `* * * * `.repeat(10);
		console.info(chalk.green.underline.bold(`\n`, message));

		message = `CHECKING ORDERS...`;
		console.log(chalk.blue.bold(message));
		sendMessage(message);

		message = `* * * * `.repeat(10);
		console.info(chalk.green.underline.bold(message));

		message = `Order Status in Queue: ${orderStatus}`;
		console.log(chalk.yellowBright.bold(message));
		sendMessage(message);

		// if (orders.length != 0) {
		// 	orders.forEach(async (order) => {
		// 		const binance = await binanceClient.cancelOrder(order.id);
		// 		console.log(`Orders Cancelled: `, binance);
		// 	});
		// }

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

		// FIXME set buyVolume to 0 for testing purposes
		const buyVolume = (baseBalance * allocation) / marketPrice;
		const sellVolume = buyVolume + assetBalance;

		const gSheetSpreads = {
			Date: dateFormat(Date(), ' dddd, mmmm d, yyyy'),
			Time: dateFormat(new Date(), 'h:MM:ss TT'),
			Pair: market,
			MarketPrice: marketPrice,
			BuyPrice: buyPrice,
			SellPrice: sellPrice,
			ExpectedProfit: sellPrice - buyPrice,
			BaseBalance: baseBalance,
			AssetBalance: assetBalance,
		};
		gSheet.addRows('Spreads', [gSheetSpreads]);

		//TODO Fix values for orders
		const gSheetOrders = {
			Pair: market,
			OrderId: '',
			OrderAmount: '',
			OrderDate: dateFormat(Date(), ' dddd, mmmm d, yyyy '),
			OrderTime: dateFormat(new Date(), 'h:MM:ss TT'),
			Others: '',
		};

		gSheet.addRows('Orders', [gSheetOrders]);

		if (buyVolume === 0 && sellVolume === 0 && orderStatus === 'open') {
			(message = `No Trading: ORDER STATUS is: ${orderStatus} BUY VOLUME is: ${buyVolume} and SELL VOLUME: ${sellVolume}. `),
				console.log(message);
			// sendMessage(message);
			console.info(chalk.greenBright(`- - - - `.repeat(10)));

			return;
		}

		if (!buyVolume > 0.00035 && !orderStatus === 'open') {
			let buyOrder = await binanceClient.createLimitBuyOrder(
				market,
				buyVolume,
				buyPrice,
			);
			//Buy Order: info,id,clientOrderId,timestamp,datetime,lastTradeTimestamp,symbol,type,timeInForce,postOnly,reduceOnly,side,price,stopPrice,amount,cost,average,filled,remaining,status,fee,trades,fees
			message = `Buy Order: ${JSON.stringify(buyOrder, null, 2)}`;
			console.log(message);
			sendMessage(message);
		}

		message = `Buy Volume is ${buyVolume}. Buy Volume less than MIN_NOTIONAL. OR You have an OPEN order!`;
		console.log(chalk.yellowBright.bold(message));
		sendMessage(message);

		if (sellVolume != 0 && !orderStatus === 'open') {
			let side = ['sell', 'buy'];
			const sellOrder = await binanceClient.createLimitSellOrder(
				market,
				// side[0],
				sellVolume,
				sellPrice,
			);
			message = `New tick for ${chalk.blue.bold(market)}...
		Created limit sell order for ${chalk.blue.bold(
			sellVolume,
		)}  @ ${chalk.blue.bold(sellPrice)}
		Create limit buy order for ${chalk.red.bold(buyVolume)} @ ${chalk.green.bold(
				buyPrice,
			)}
		`;
			console.log(message);
			sendMessage(message);
		}
		message = `Sell volume is ${sellVolume}. OR You have an OPEN Order!`;
		console.log(chalk.yellowBright.bold(message));
		sendMessage(message);
	};

	tick(config, binanceClient);
	setInterval(tick, config.tickInterval, config, binanceClient);
};

export default run;
