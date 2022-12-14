import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const { Pool } = require('pg');

const INSERT_REQUEST_SQL = "INSERT INTO peppermintery.requests(token_id, recipient_address, details) VALUES ($1, $2, $3) RETURNING id";
const INSERT_ASSET_SQL = "INSERT INTO peppermintery.assets(request_id, asset_role, mime_type, filename) VALUES ($1, $2, $3, $4) RETURNING id";
const GET_RECENT_SQL = "SELECT * FROM peppermintery.requests WHERE state <> 'canary' ORDER BY submitted_at DESC LIMIT $1";
const GET_RECENT_BY_STATE_SQL = "SELECT * FROM peppermintery.requests WHERE state = $1 ORDER BY submitted_at DESC LiMIT $2";
const GET_REQUEST_BY_REQUEST_ID_SQL = "SELECT * FROM peppermintery.requests WHERE id = $1";
const GET_REQUEST_BY_TOKEN_ID_SQL = "SELECT * FROM peppermintery.requests WHERE token_id = $1";
const GET_ASSET_SQL = "SELECT * FROM peppermintery.assets WHERE request_id = $1";
const GET_PEPPERMINT_OP_SQL = "SELECT * FROM peppermint.operations WHERE id = $1";
const GET_PEPPERMINT_STATS_SQL = "SELECT state, COUNT(state) AS count FROM peppermint.operations WHERE originator = $1 AND id > $2 AND state <> 'canary' GROUP BY state ORDER BY state";

const CHECKOUT_SQL = "WITH cte AS (SELECT id FROM peppermintery.requests WHERE state='pending' ORDER BY id ASC LIMIT 1) UPDATE peppermintery.requests AS rq SET state = 'processing' FROM cte WHERE cte.id = rq.id RETURNING *";
const SET_STATE_SQL = "UPDATE peppermintery.requests SET state = $2 WHERE id = $1";
const COMPLETE_REQUEST_SQL = "UPDATE peppermintery.requests SET state = 'submitted', peppermint_id = $2 WHERE id = $1";
const INSERT_PEPPERMINT_OP_SQL = "INSERT INTO peppermint.operations (originator, command) VALUES($1, $2) RETURNING id";

const GET_PEPPERMINT_CANARY_SQL = "SELECT * FROM peppermint.operations WHERE state='canary' AND originator = $1 ORDER BY submitted_at ASC LIMIT 1";
const GET_MINTERY_CANARY_SQL = "SELECT * FROM peppermintery.requests WHERE state='canary' ORDER BY submitted_at ASC LIMIT 1";
const INSERT_PEPPERMINT_CANARY_SQL = "INSERT INTO peppermint.operations (originator, state, command) VALUES ($1, 'canary', '{}')";
const INSERT_MINTERY_CANARY_SQL = "INSERT INTO peppermintery.requests(state) VALUES ('canary')";
const KILL_MINTERY_CANARIES_SQL = "DELETE FROM peppermintery.requests WHERE state='canary'";

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

	const insert_request = async function({ token_id, mint_to, token_details }, db = pool) {
		let result = await db.query(INSERT_REQUEST_SQL, [ token_id, mint_to, token_details ]);
		return result.rows[0].id;
	};

	const insert_asset = async function({ request_id, asset_role, mime_type, filename }, db = pool) {
		let result = await db.query(INSERT_ASSET_SQL, [ request_id, asset_role, mime_type, filename ]);
		return result.rows[0].id;
	};

	const get_requests = async function({ limit, state }, db=pool) {
		let result = state ?
			await db.query(GET_RECENT_BY_STATE_SQL, [ state, (limit || DEFAULT_LIMIT) ]) :
			await db.query(GET_RECENT_SQL, [ (limit || DEFAULT_LIMIT) ]);
		return result.rows;
	};

	const get_request_by_request_id = async function({ request_id }, db=pool) {
		let result = await db.query(GET_REQUEST_BY_REQUEST_ID_SQL, [ request_id ]);
		return first_or_null(result.rows);
	};

	const get_request_by_token_id = async function({ token_id }, db=pool) {
		let result = await db.query(GET_REQUEST_BY_TOKEN_ID_SQL, [ token_id ]);
		return first_or_null(result.rows);
	};

	const get_asset_by_request_id = async function({ request_id }, db=pool) {
		let result = await db.query(GET_ASSET_SQL, [ request_id ]);
		return first_or_null(result.rows);
	}

	const get_peppermint_operation = async function({ peppermint_id }, db=pool) {
		let result = await db.query(GET_PEPPERMINT_OP_SQL, [ peppermint_id ]);
		return first_or_null(result.rows);
	}
	
	const get_peppermint_stats = async function({ floor_id, originator_address }, db=pool) {
		let result = await db.query(GET_PEPPERMINT_STATS_SQL, [ originator_address, floor_id ]);
		return result.rows;
	}

	const checkout_request = async function(db=pool) {
		let result = await db.query(CHECKOUT_SQL, []);
		return first_or_null(result.rows);
	};

	const set_request_state = function({ request_id, state }, db=pool) {
		return db.query(SET_STATE_SQL, [ request_id, state ]);
	};

	const complete_request = function({ request_id, peppermint_id }, db=pool) {
		return db.query(COMPLETE_REQUEST_SQL, [ request_id, peppermint_id ]);
	};

	const insert_peppermint_op = async function({ originator_address, command }, db=pool) {
		let result = await db.query(INSERT_PEPPERMINT_OP_SQL, [ originator_address, command ]);
		return result.rows[0].id;
	};

	const get_peppermint_canary = async function({ originator_address }, db=pool) {
		let result = await db.query(GET_PEPPERMINT_CANARY_SQL, [ originator_address ]);
		return first_or_null(result.rows);
	};

	const get_mintery_canary = async function(db=pool) {
		let result = await db.query(GET_MINTERY_CANARY_SQL, []);
		return first_or_null(result.rows);
	};

	const insert_peppermint_canary = function({ originator_address }, db=pool) {
		return db.query(INSERT_PEPPERMINT_CANARY_SQL, [ originator_address ]);
	};

	const insert_mintery_canary = function(db=pool) {
		return db.query(INSERT_MINTERY_CANARY_SQL, []);
	};

	const kill_mintery_canaries = function(db=pool) {
		return db.query(KILL_MINTERY_CANARIES_SQL, []);
	};

	const state = {
		PENDING: 'pending',
		PROCESSING: 'processing',
		COMPLETED: 'submitted',
		REJECTED: 'rejected',
		FAILED: 'failed',
		CANARY: 'canary'
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
		get_asset_by_request_id,
		get_peppermint_operation,
		get_peppermint_stats,
		checkout_request,
		set_request_state,
		complete_request,
		insert_peppermint_op,
		get_peppermint_canary,
		get_mintery_canary,
		insert_peppermint_canary,
		insert_mintery_canary,
		kill_mintery_canaries,
		state
	};
}
