import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const { Pool } = require('pg');

const INSERT_TOKEN_SQL = "INSERT INTO peppermintery.requests(token_id, recipient_address, details) VALUES ($1, $2, $3) RETURNING id";
const INSERT_ASSET_SQL = "INSERT INTO peppermintery.assets(request_id, asset_role, mime_type, filename) VALUES ($1, $2, $3, $4) RETURNING id";

export default function() {
	// DB connection sourced from env
	let pool = new Pool();

	const insert_token = async function({ token_id, mint_to, token_details }) {
		let result = await pool.query(INSERT_TOKEN_SQL, [ token_id, mint_to, token_details ]);
		return result.rows[0].id;
	}

	const insert_asset = async function({ request_id, asset_role, mime_type, filename }) {
		let result = await pool.query(INSERT_ASSET_SQL, [ request_id, asset_role, mime_type, filename ]);
		console.log(result.rows[0]);
		return result.rows[0].id;
	}

	// const checkout = async function() {
	// 	let result = await pool.query(CHECKOUT_SQL, []);
	// 	return result.rows[0];
	// };

	const state = {
		PENDING: 'pending',
		PROCESSING: 'processing',
		COMPLETED: 'submitted',
		REJECTED: 'rejected'
	};

	return {
			insert_token,
			insert_asset,
//			checkout,
			state
	};
}