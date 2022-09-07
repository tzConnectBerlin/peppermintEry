import ash from 'express-async-handler'

import Business from './business.mjs'
import ConfLoader from '../common/confloader.mjs'

import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const Express = require('express');
const BodyParser = require('body-parser');
const Morgan = require('morgan');

// add timestamps to console.log
require('console-stamp')(console);

const config = ConfLoader();

const main = async function(config) {
	let business = await Business(config);

	let app = Express();

	app.use(BodyParser.json({ limit: '50mb' }));

	// logger
	app.use(Morgan('combined'));

	// API key auth
	let api_key = config.endpoint.api_key;
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

	let endpoint_root = config.endpoint.uri_root || ""

	// mint request endpoint
	app.post(
		`${endpoint_root}/`,
		ash(async (req, res) => {
			let response = await business.new_mint_request(req.body);
			res.json(response);
		})
	);

	app.get(
		`${endpoint_root}/`,
		ash(async (req, res) => {
			let response = await business.recent_requests(req.body);
			res.json(response);
		})
	)
	
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

	let port = config.endpoint.port || 5001;
	app.listen(port, () => { console.log(`Service listening on ${port}, at ${endpoint_root}/`)});

};

main(config);
