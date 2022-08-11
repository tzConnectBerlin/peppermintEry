import ash from 'express-async-handler'
import Business from './business.mjs'

import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const Express = require('express');
const BodyParser = require('body-parser');
const Morgan = require('morgan');

// add timestamps to console.log
require('console-stamp')(console);

const main = async function({ svc_root, port, api_key }) {
	let business = await Business();

	let app = Express();

	app.use(BodyParser.json());

	// logger
	app.use(Morgan('dev'));

	// API key auth
	if (api_key) {
		app.use((req, res, next) => {
			let key_header = req.get('API-Key');
			if (!key_header || key_header !== api_key) {
				res.status(401).json({ error: 'unauthorised' });
			} else {
				next();
			}
		});
	}

	let endpoint_root = svc_root || ""

	// mint request endpoint
	app.post(
		`${endpoint_root}/`,
		ash(async (req, res) => {
			console.log(req.body);
			let response = await business.new_mint_request(req.body);
			res.json(response);
		})
	);
	
	app.get(
		`${endpoint_root}/token_status`,
		ash(async (req, res) => {
			let response = await business.check_token_status(req.query);
			res.json(response);
		})
	);

	app.get(
		`${endpoint_root}/health`,
		ash(async (req, res) => {
			let response = await business.check_system_health();
			res.json(response);
		})
	);

	app.listen(port, () => { console.log(`Service listening on ${port}, at ${endpoint_root}/`)});

};

main({
	api_key: process.env.API_KEY,
	uri_root: process.env.SVC_ROOT,
	port: (process.env.PORT || 5001)
});