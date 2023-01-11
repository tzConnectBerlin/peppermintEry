import Db from '../dataaccess/db.mjs'
import Filestor from '../dataaccess/filestor.mjs'
import { NotFoundError, ValidationError } from '../common/errors.mjs';

export default function(config) {
	let db = Db(config.database);
	let filestor = Filestor(config.assets);

	const process_recipient_record = function(recipient) {
		switch (typeof recipient) {
			case "string":
				return { address: recipient, amount: 1 };
			case "object":
				if (!recipient.address) {
					throw new ValidationError("Missing recipient address");
				}
				if (!recipient.amount) {
					recipient.amount = 1;
				}
				return recipient;
			default:
				throw new ValidationError("Invalid recipient record type");
		}
	}

	const insert_mint_recipients = async function({ request_id, recipients }, conn=undefined) {
		if (Array.isArray(recipients)) {
			let addresses = [];
			let amounts = [];
			for (let recipient of recipients) {
				let { address, amount } = process_recipient_record(recipient);
				addresses.push(address);
				amounts.push(amount);
			}
			return db.insert_bulk_mint_recipients({ request_id, addresses, amounts}, conn);
		} else {
			return db.insert_mint_recipient(process_recipient_record(recipients), conn);
		}
	};

	const new_create_request = async function({ token_details, image_asset, recipients }, token_id) {
		//FIXME: validate request json
		
		let tx = false;
		let conn = {};
		try {
			conn = await db.get_connection();
			await db.begin_tx(conn);
			tx = true;

			let request_id = await db.insert_create_request({ token_id, token_details }, conn);

			let filename = `${request_id}-${image_asset.filename}`;

			let recipient_ids = recipients ? (await insert_mint_recipients({ request_id, recipients }, conn)) : null;

			let [ asset_id ] = await Promise.all([
				db.insert_asset({
					request_id,
					asset_role: 'artwork',
					mime_type: image_asset.mime_type,
					filename
				}, conn),
				filestor.write_b64_to_file({
					filename,
					b64_data: image_asset.b64_data
				})
			]);

			await db.commit_tx(conn);
			tx = false;
			
			return { request_id, asset_id, filename, recipient_ids };
		} finally {
			if (tx) {
				await db.rollback_tx(conn);
			}
			if (conn.release) {
				conn.release();
 			}
		}
	};

	const new_mint_request = async function(recipients, token_id) {
		let request = await db.get_request_by_token_id({ token_id });
		if (!request) {
			throw new NotFoundError("No such token id");
		}
		return insert_mint_recipients({ request_id: request.id, recipients });
	};

	const parse_request_status = function(request) {
		let status = {
			processed: !!request.operation_id,
			minted: (request.operation_state === 'confirmed'),
		};
		return {
			id: request.request_id,
			status,
			details: request
		};
	};

	const process_date = function(date_string) {
		let parsed_date = new Date(date_string);
		if (isNaN(parsed_date)) {
			throw new ValidationError("Invalid date string");
		}
		return parsed_date;
	}

	const get_create_requests = async function({ limit, before }) {
		let submitted_before = before ? process_date(before) : null;
		let result = await db.get_request_statuses({ limit, submitted_before });
		return result.map(parse_request_status);
	};

	const get_create_request = async function(token_id) { 
		let request = await db.get_request_status_by_token_id({ token_id });
		if (!request) {
			throw new NotFoundError("No such token id");
		}
		return parse_request_status(request);
	};

	const get_mint_requests = async function({ limit, before }, token_id) {
		let submitted_before = before ? process_date(before) : null;
		let result = await db.get_mint_requests({ token_id, limit, submitted_before });
		return result.map(parse_request_status);
	};

	const get_mint_requests_for_address = async function(address, token_id) {
		let result = await db.get_mint_request_by_address({ token_id, address });
		return result.map(parse_request_status);
	};

	const check_system_health = async function() {
	 	let up = true;
	 	let warning = false;
	 	let errors = [];

		 const {
			 chain: {
				 peppermint_originator: originator
			 },
			 monitoring: {
				 last_pull_timeout
			 }
		 } = config;

		let [ mintery_last_epoch, peppermint_last_epoch ] = await Promise.all([
			db.get_last_pull_mintery({ originator }),
			db.get_last_pull_peppermint({ originator })
		]);

		// 	let [ mintery_canary, peppermint_canary, peppermint_stat_rows ] = await Promise.all([
		// 		db.get_mintery_canary(),
		// 		db.get_peppermint_canary({ originator_address: config.chain.peppermint_originator }),
		// 		db.get_peppermint_stats({
		// 			originator_address: config.chain.peppermint_originator,
		// 			floor_id: config.monitoring.floor_peppermint_id
		// 		}) ]);

		let now = Date.now();
		if (mintery_last_epoch) {
			const mintery_epoch_delay = now - mintery_last_epoch;
			if (mintery_epoch_delay > last_pull_timeout) {
				errors.push(`Mintery last pull timed out by ${mintery_epoch_delay}`);
				up = false;
				warning = true;
			}
		}

		if (peppermint_last_epoch) {
			const peppermint_epoch_delay = now - peppermint_last_epoch;
			if (peppermint_epoch_delay > last_pull_timeout) {
				errors.push(`Peppermint last pull timed out by ${peppermint_epoch_delay}`);
				up = false;
				warning = true;
			}
		}

	// 	if (mintery_canary) {
	// 		let delay = now - mintery_canary.submitted_at;
	// 		if (delay > config.monitoring.mintery_canary_timeout) {
	// 			errors.push(`Mintery canary timed out by ${delay}`);
	// 			up = false;
	// 			warning = true;
	// 		}
	// 	}
	// 	if (peppermint_canary) {
	// 		let delay = now - peppermint_canary.submitted_at;
	// 		if (delay > config.monitoring.peppermint_canary_timeout) {
	// 			errors.push(`Peppermint canary timed out by ${delay}`)
	// 			up = false;
	// 			warning = true;
	// 		}
	// 	}

	// 	let peppermint_stats = peppermint_stat_rows.reduce((obj, cur) => ({...obj, [cur.state]: cur.count}), {});
	// 	if (peppermint_stats.unknown > 0) {
	// 		errors.push(`Found ${peppermint_stats.unknown} operations with 'unknown' state`);
	// 		warning = true;
	// 	}
	// 	if (peppermint_stats.failed > 0) {
	// 		errors.push(`Found ${peppermint_stats.failed} operations with 'failed' state`);
	// 		warning = true;
	// 	}
	// 	if (peppermint_stats.rejected > 0) {
	// 		errors.push(`Found ${peppermint_stats.failed} operations with 'rejected' state`);
	// 		warning = true;
	// 	}

	 	return {
	 		up,
	 		warning,
	 		errors
	 	};
	}

	return {
		new_create_request,
		new_mint_request,
		get_create_request,
		get_create_requests,
		get_mint_requests_for_address,
		get_mint_requests,
		check_system_health,
	}
}
