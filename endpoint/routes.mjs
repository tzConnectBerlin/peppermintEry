import ash from 'express-async-handler'

import Business from './business.mjs'

export default function({ app, config }) {
	let business = Business(config);

	let endpoint_root = config.endpoint.uri_root || ""

  // automatic token id generation is to be explored later
	// app.post(
	// 	`${endpoint_root}/tokens`,
	// 	ash(async (req, res) => {
	// 		let response = await business.new_create_request(req.body);
	// 		res.json(response);
	// 	})
	// );

	app.put(
		`${endpoint_root}/tokens/:tokenid`,
		ash(async (req, res) => {
			let response = await business.new_create_request(req.body, req.params.tokenid);
			res.json(response);
		})
	)

	app.post(
		`${endpoint_root}/tokens/:tokenid/mint`,
		ash(async (req, res) => {
			let response = await business.new_mint_request(req.body, req.params.tokenid);
			res.json(response);
		})
	);

	app.get(
		`${endpoint_root}/tokens`,
		ash(async (req, res) => {
			let response = await business.recent_requests(req.body);
			res.json(response);
		})
	)
	
	app.get(
		`${endpoint_root}/tokens/:tokenid/status`,
		ash(async (req, res) => {
			let response = await business.check_token_status({ token_id: req.params.tokenid });
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

  return endpoint_root;
}