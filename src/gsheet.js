import {
	GoogleSpreadsheet,
	GoogleSpreadsheetWorksheet,
} from 'google-spreadsheet';

import { _config } from '../data/config.js';

const config = {
	GSHEET_ID: _config.GSHEET_ID,
	GSHEET_CLIENT_EMAIL: _config.GSHEET_CLIENT_EMAIL,
	GSHEET_PRIVATE_KEY: _config.GSHEET_PRIVATE_KEY,
};

class GSheet {
	doc = new GoogleSpreadsheet(config.GSHEET_ID);
	constructor(sheetId) {
		this.doc = new GoogleSpreadsheet(sheetId);
	}

	connect = async () => {
		await this.doc.useServiceAccountAuth({
			client_email: config.GSHEET_CLIENT_EMAIL,
			private_key: config.GSHEET_PRIVATE_KEY,
		});

		await this.doc.loadInfo();

		const spreadsheet = this.doc.sheetsByTitle['Spreads'];

		spreadsheet.setHeaderRow([
			'Date',
			'Time',
			'Pair',
			'MarketPrice',
			'BuyPrice',
			'SellPrice',
			'ExpectedProfit',
			'balances',
		]);
	};

	getOrCreateSheet = async (sheetName, headerValues) => {
		const sheet = this.doc.sheetsByTitle[sheetName];
		if (!sheet) {
			await this.doc.addSheet({
				title: sheetName,
				headerValues,
			});
		}
		return this.doc.sheetsByTitle[sheetName];
	};

	addRows = async (sheetName, rows) => {
		let sheet;
		if (sheetName === 'Spreads') {
			sheet = this.doc.sheetsByTitle[sheetName];
		} else {
			let columns = Object.keys(rows[0]);
			sheet = await this.getOrCreateSheet(sheetName, columns);
		}
		if (!sheet) {
			console.log(`Sheet ${sheetName} not found!`);
			return;
		}
		await sheet.addRows(rows);
	};
}

const gSheet = new GSheet(config.GSHEET_ID);
export default gSheet;
