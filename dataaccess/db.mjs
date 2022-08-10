import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const { Pool } = require('pg');

const INSERT_TOKEN_SQL = "INSERT INTO peppermintery.tokens(recipient_address, token_details) VALUES (%s, %s) RETURNING id";
const INSERT_ASSET_SQL = "INSERT INTO peppermintery.assets(token_id, role, mime_type, file_name) VALUES (%s, %s, %s, %s) RETURNING id";

export default function() {
	// DB connection sourced from env
	let pool = new Pool();

	const insert_token = async function({ mint_to, token_details }) {
		let result = await pool.query(INSERT_SQL, [ mint_to, token_details ]);
		console.log(result.rows[0]);
		return result.rows[0];
	}

	const insert_asset = async function({ token_id, asset_role, mime_type, filename }) {
		let result = await pool.query(INSERT_SQL, [ token_id, asset_role, mime_type, filename ]);
		console.log(result.rows[0]);
		return result.rows[0];
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