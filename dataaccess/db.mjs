import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const { Pool } = require('pg');

const INSERT_REQUEST_SQL = "INSERT INTO peppermintery.requests(token_id, recipient_address, details) VALUES ($1, $2, $3) RETURNING id";
const INSERT_ASSET_SQL = "INSERT INTO peppermintery.assets(request_id, asset_role, mime_type, filename) VALUES ($1, $2, $3, $4) RETURNING id";
const GET_RECENT_SQL = "SELECT * FROM peppermintery.requests WHERE state <> 'canary' ORDER BY submitted_at DESC LIMIT $1";
const GET_REQUEST_BY_REQUEST_ID = "SELECT * FROM peppermintery.requests WHERE id = $1";
const GET_REQUEST_BY_TOKEN_ID = "SELECT * FROM peppermintery.requests WHERE token_id = $1";

const CHECKOUT_SQL = "WITH cte AS (SELECT id FROM peppermintery.requests WHERE state='pending' ORDER BY id ASC LIMIT 1) UPDATE peppermintery.requests AS rq SET state = 'processing' FROM cte WHERE cte.id = rq.id RETURNING *";

const DEFAULT_LIMIT = 100;

const first_or_null = function(l) {
	if (l.length > 0) {
		return l[0];
	} else {
		return null;
	}
};

export default function(connection) {
	let pool = new Pool(connection);

	const insert_request = async function({ token_id, mint_to, token_details }, db = pool) {
		let result = await db.query(INSERT_REQUEST_SQL, [ token_id, mint_to, token_details ]);
		return result.rows[0].id;
	};

	const insert_asset = async function({ request_id, asset_role, mime_type, filename }, db = pool) {
		let result = await db.query(INSERT_ASSET_SQL, [ request_id, asset_role, mime_type, filename ]);
		return result.rows[0].id;
	};

	const get_requests = async function({ limit }, db=pool) {
		let result = await db.query(GET_RECENT_SQL, [ (limit || DEFAULT_LIMIT) ]);
		return result.rows;
	};

	const get_request_by_request_id = async function({ request_id }, db=pool) {
		let result = await db.query(GET_REQUEST_BY_REQUEST_ID, [ request_id ]);
		return first_or_null(result.rows);
	};

	const get_request_by_token_id = async function({ token_id }, db=pool) {
		let result = await db.query(GET_REQUEST_BY_TOKEN_ID, [ token_id ]);
		return first_or_null(result.rows);
	};

	const checkout = async function(db=pool) {
		let result = await db.query(CHECKOUT_SQL, []);
		return first_or_null(result.rows);
	};

	const set_state = async function({ request_id, state }, db=pool) {

	} ;

	const state = {
		PENDING: 'pending',
		PROCESSING: 'processing',
		COMPLETED: 'submitted',
		REJECTED: 'rejected',
		CANARY: 'canary'
	};

	const get_connection = function() {
		return pool.connect();
	};

	const begin_tx = function(db) {
		return db.query('BEGIN');
	};

	const commit_tx = function(db) {
		return db.query('COMMIT');
	};

	const rollback_tx = function(db) {
		return db.query('ROLLBACK');
	};

	return {
		get_connection,
		begin_tx,
		commit_tx,
		rollback_tx,
		insert_request,
		insert_asset,
		get_requests,
		get_request_by_request_id,
		get_request_by_token_id,
		checkout,
		state
	};
}
