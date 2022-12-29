import { createRequire } from 'module'
const require = createRequire(import.meta.url);

const { Pool } = require('pg');

const INSERT_CREATE_REQUEST_SQL = "INSERT INTO peppermintery.requests(token_id, details) VALUES ($1, $2) RETURNING id";
const INSERT_ASSET_SQL = "INSERT INTO peppermintery.assets(request_id, asset_role, mime_type, filename) VALUES ($1, $2, $3, $4) RETURNING id";
const INSERT_MINT_MINT_REQUEST_SQL = "INSERT INTO peppermintery.recipients(request_id, address, amount) VALUES ($1, $2, $3) RETURNING id";
const INSERT_BULK_MINT_MINT_REQUESTS_SQL = "INSERT INTO peppermintery.recipients(request_id, address, amount) VALUES ($1, UNNEST(CAST($2 AS character(36)[])), UNNEST(CAST($3 AS integer[]))) RETURNING id";

const GET_CREATE_REQUEST_SQL = "SELECT * FROM peppermintery.requests WHERE token_id = $1";
const GET_CREATE_REQUEST_STATUSES_SQL = "SELECT req.id AS request_id, req.token_id AS token_id, req.state AS request_state, ops.id AS operation_id, ops.state AS operation_state, ops.included_in AS operation_group_hash, req.submitted_at AS request_submitted_at, COALESCE(ops.last_updated_at, req.last_updated_at) AS last_updated_at FROM peppermintery.requests AS req LEFT OUTER JOIN peppermint.operations AS ops ON ops.id = req.peppermint_id WHERE req.submitted_at < $2 ORDER BY req.submitted_at DESC LIMIT $1";
const GET_CREATE_REQUEST_STATUS_BY_TOKEN_ID_SQL = "SELECT req.id AS request_id, req.token_id AS token_id, req.details AS token_details, req.state AS request_state, ops.id AS operation_id, ops.state AS operation_state, ops.included_in AS operation_group_hash, req.submitted_at AS request_submitted_at, COALESCE(ops.last_updated_at, req.last_updated_at) AS last_updated_at FROM peppermintery.requests AS req LEFT OUTER JOIN peppermint.operations AS ops ON ops.id = req.peppermint_id WHERE req.token_id = $1"
const GET_ASSETS_BY_REQUEST_ID_SQL = "SELECT * FROM peppermintery.assets WHERE request_id = $1";

const GET_MINT_REQUESTS_SQL = "SELECT req.id AS request_id, req.address AS recipient_address, req.amount AS token_amount, req.state AS request_state, ops.id AS operation_id, ops.state AS operation_state, ops.included_in AS operation_group_hash, req.submitted_at AS request_submitted_at, COALESCE(ops.last_updated_at, req.last_updated_at) AS last_updated_at FROM peppermintery.recipients AS req INNER JOIN peppermintery.requests AS tok ON tok.id = req.request_id LEFT OUTER JOIN peppermint.operations AS ops ON ops.id = req.peppermint_id WHERE tok.token_id = $1 AND req.submitted_at < $3 ORDER BY req.submitted_at DESC LIMIT $2";
const GET_MINT_REQUEST_BY_ADDRESS_SQL = "SELECT req.id AS request_id, req.address AS recipient_address, req.amount AS token_amount, req.state AS request_state, ops.id AS operation_id, ops.state AS operation_state, ops.included_in AS operation_group_hash, req.submitted_at AS request_submitted_at, COALESCE(ops.last_updated_at, req.last_updated_at) AS last_updated_at FROM peppermintery.recipients AS req INNER JOIN peppermintery.requests AS tok ON tok.id = req.request_id LEFT OUTER JOIN peppermint.operations AS ops ON ops.id = req.peppermint_id WHERE tok.token_id = $1 AND req.address = $2";

const CHECKOUT_CREATE_REQUEST_SQL = "WITH cte AS (SELECT id FROM peppermintery.requests WHERE state = 'pending' ORDER BY id ASC LIMIT 1) UPDATE peppermintery.requests AS rq SET state = 'processing' FROM cte WHERE cte.id = rq.id RETURNING *";
const SET_REQUEST_STATE_SQL = "UPDATE peppermintery.requests SET state = $2 WHERE id = $1";
const COMPLETE_REQUEST_SQL = "UPDATE peppermintery.requests SET state = 'submitted', peppermint_id = $2 WHERE id = $1";

const CHECKOUT_MINT_REQUESTS_SQL = "WITH cte AS (SELECT rec.id AS id, rec.address AS address, rec.amount AS amount, rq.token_id AS token_id FROM peppermintery.recipients AS rec INNER JOIN peppermintery.requests AS rq ON rq.id = rec.request_id WHERE rec.state = 'pending' AND rq.state = 'submitted' ORDER BY id ASC LIMIT 100) UPDATE peppermintery.recipients AS rec SET state = 'processing' FROM cte WHERE cte.id = rec.id RETURNING cte.id AS id, cte.address AS address, cte.amount AS amount, cte.token_id AS token_id";
const SET_MINT_REQUEST_STATES_SQL = "UPDATE peppermintery.recipients SET state=$2 WHERE id = ANY($1)";
const COMPLETE_MINT_REQUESTS_SQL = "UPDATE peppermintery.recipients AS rec SET state = 'submitted', peppermint_id = data.peppermint_id FROM UNNEST( CAST($1 AS integer[]), CAST($2 AS integer[]) ) AS data(recipient_id, peppermint_id) WHERE rec.id = data.recipient_id";

const INSERT_PEPPERMINT_OP_SQL = "INSERT INTO peppermint.operations (originator, command) VALUES ($1, $2) RETURNING id";
const INSERT_BULK_PEPPERMINT_OPS_SQL = "INSERT INTO peppermint.operations (originator, command) VALUES ($1, UNNEST(CAST($2 AS jsonb[]))) RETURNING id";

const GET_PEPPERMINTERY_HEALTH_SQL = "SELECT * FROM peppermintery.processes ORDER BY process.uuid";
const GET_CREATE_REQUEST_STATS_SQL = "SELECT state, COUNT(state) AS count, MAX(last_updated_at) AS latest_timestamp FROM peppermintery.requests GROUP BY state ORDER BY state";
const GET_MINT_REQUEST_STATS_SQL = "SELECT state, COUNT(state) AS count, MAX(last_updated_at) AS latest_timestamp FROM peppermintery.recipients GROUP BY state ORDER BY state";

const GET_PEPPERMINT_HEALTH_SQL = "SELECT * FROM peppermint.processes WHERE originator = $1";
const GET_PEPPERMINT_STATS_SQL = "SELECT state, COUNT(state) AS count, MAX(last_updated_at) AS latest_timestamp FROM peppermint.operations WHERE originator = $1 GROUP BY state ORDER BY state";

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

	const unnest_ids = function(l) {
		return l.map((row) => (row.id));
}

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

	const insert_create_request = async function({ token_id, token_details }, db = pool) {
		let result = await db.query(INSERT_CREATE_REQUEST_SQL, [ token_id, token_details ]);
		return result.rows[0].id;
	};

	const insert_asset = async function({ request_id, asset_role, mime_type, filename }, db = pool) {
		let result = await db.query(INSERT_ASSET_SQL, [ request_id, asset_role, mime_type, filename ]);
		return result.rows[0].id;
	};

	const insert_mint_recipient = async function({ request_id, address, amount }, db = pool) {
		let result = await db.query(INSERT_MINT_MINT_REQUEST_SQL, [ request_id, address, amount ]);
		return result.rows[0].id;
	};

	const insert_bulk_mint_recipients = async function({ request_id, addresses, amounts }, db = pool) {
		let result = await db.query(INSERT_BULK_MINT_MINT_REQUESTS_SQL, [ request_id, addresses, amounts ]);
		return unnest_ids(result.rows);
	};

	const get_request_by_token_id = async function({ token_id }, db=pool) {
		let result = await db.query(GET_CREATE_REQUEST_SQL, [ token_id ]);
		return first_or_null(result.rows);
	};

	const get_request_statuses = async function({ limit, submitted_before }, db=pool) {
		let result = await db.query(GET_CREATE_REQUEST_STATUSES_SQL, [ (limit || DEFAULT_LIMIT), (submitted_before || new Date()) ]);
		return result.rows;
	};

	const get_request_status_by_token_id = async function({ token_id }, db=pool) {
		let result = await db.query(GET_CREATE_REQUEST_STATUS_BY_TOKEN_ID_SQL, [ token_id ]);
		return first_or_null(result.rows);
	};

	const get_asset_by_request_id = async function({ request_id }, db=pool) {
		let result = await db.query(GET_ASSETS_BY_REQUEST_ID_SQL, [ request_id ]);
		return first_or_null(result.rows);
	};
	
	const get_mint_request_by_address = async function({ token_id, address }, db=pool) {
		let result = await db.query(GET_MINT_REQUEST_BY_ADDRESS_SQL, [ token_id, address ]);
		return result.rows;
	};

	const get_mint_requests = async function({ token_id, limit, submitted_before }, db=pool) {
		let result = await db.query(GET_MINT_REQUESTS_SQL, [ token_id, (limit || DEFAULT_LIMIT), (submitted_before || new Date())]);
		return result.rows;
	};

	const checkout_request = async function(db=pool) {
		let result = await db.query(CHECKOUT_CREATE_REQUEST_SQL, []);
		return first_or_null(result.rows);
	};

	const set_request_state = function({ request_id, state }, db=pool) {
		return db.query(SET_REQUEST_STATE_SQL, [ request_id, state ]);
	};

	const complete_request = function({ request_id, peppermint_id }, db=pool) {
		return db.query(COMPLETE_REQUEST_SQL, [ request_id, peppermint_id ]);
	};

	const checkout_recipients = async function(db=pool) {
		let result = await db.query(CHECKOUT_MINT_REQUESTS_SQL, []);
		return result.rows;
	};

	const set_recipient_states = function({ recipient_ids, state }, db=pool) {
		return db.query(SET_MINT_REQUEST_STATES_SQL, [ recipient_ids, state ]);
	};

	const complete_recipients = function({ recipient_ids, peppermint_ids}, db=pool) {
		return db.query(COMPLETE_MINT_REQUESTS_SQL, [ recipient_ids, peppermint_ids ]);
	};

	const insert_peppermint_op = async function({ originator_address, command }, db=pool) {
		let result = await db.query(INSERT_PEPPERMINT_OP_SQL, [ originator_address, command ]);
		return result.rows[0].id;
	};

	const insert_bulk_peppermint_ops = async function({ originator_address, commands }, db=pool) {
		let result = await db.query(INSERT_BULK_PEPPERMINT_OPS_SQL, [originator_address, commands ]);
		return unnest_ids(result.rows);
	};

	const get_peppermintery_health = async function(db=pool) {
		let result = await db.query(GET_PEPPERMINTERY_HEALTH_SQL, [ originator_address ]);
		return first_or_null(result.rows);
	};

	const get_peppermintery_stats = async function(db=pool) {
		let [create, mint] = await Promise.all([
			db.query(GET_CREATE_REQUEST_STATS_SQL, []),
			db.query(GET_MINT_REQUEST_STATS_SQL, [])
		]);
		return {
			create_requests: create.rows,
			mint_requests: mint.rows
		};
	};

	const get_peppermint_health = async function({ originator_address }, db=pool) {
		let result = await db.query(GET_PEPPERMINT_HEALTH_SQL, [ originator_address ]);
		return first_or_null(result.rows);
	};

	const get_peppermint_stats = async function({ floor_id, originator_address }, db=pool) {
		let result = await db.query(GET_PEPPERMINT_STATS_SQL, [ originator_address, floor_id ]);
		return result.rows;
	};

	const state = {
		PENDING: 'pending',
		PROCESSING: 'processing',
		COMPLETED: 'submitted',
		REJECTED: 'rejected',
		FAILED: 'failed'
	};

	return {
		get_connection,
		begin_tx,
		commit_tx,
		rollback_tx,
		insert_create_request,
		insert_asset,
		insert_mint_recipient,
		insert_bulk_mint_recipients,
		get_request_by_token_id,
		get_request_statuses,
		get_request_status_by_token_id,
		get_asset_by_request_id,
		get_mint_requests,
		get_mint_request_by_address,
		checkout_request,
		set_request_state,
		complete_request,
		checkout_recipients,
		set_recipient_states,
		complete_recipients,
		insert_peppermint_op,
		insert_bulk_peppermint_ops,
		get_peppermint_health,
		get_peppermintery_stats,
		get_peppermintery_health,
		get_peppermint_stats,		
		state
	};
}
