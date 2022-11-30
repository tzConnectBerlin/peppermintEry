import ConfLoader from '../common/confloader.mjs'
import Routes from './routes.mjs'
import { ValidationError } from '../common/errors.mjs'

import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const Express = require('express');
const BodyParser = require('body-parser');
const Morgan = require('morgan');

// add timestamps to console.log
require('console-stamp')(console);

const config = ConfLoader();

const main = async function(config) {
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

	let endpoint_root = Routes({ app, config });

	app.use((err, req, res, next) => {
		if (err instanceof ValidationError) {
			console.log(err);
			res.status(400).json({ error: err.name, message: err.message});
		} else {
			next(err);
		}
	});

	// setInterval(
	// 	business.set_canary,
	// 	config.monitoring.canary_cycle
	// );

	let port = config.endpoint.port || 5001;
	app.listen(port, () => { console.log(`Service listening on ${port}, at ${endpoint_root}/`)});

};

main(config);
