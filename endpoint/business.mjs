import Db from '../dataaccess/db.mjs'
import Filestor from '../dataaccess/filestor.mjs'
import { ValidationError } from '../common/errors.mjs';

export default function(config) {
	let db = Db(config.database);
	let filestor = Filestor(config.assets);

	const process_recipient_record = function(recipient) {
		switch (typeof recipient) {
			case "string":
				return { recipient, amount: 1 };
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
		if (typeof recipients != "array") {
			return db.insert_mint_recipient(process_recipient_record(recipients), conn);
		} else {
			let addresses = [];
			let amounts = [];
			for (let recipient of recipients) {
				let { address, amount } = process_recipient_record(recipient);
				addresses.push(address);
				amounts.push(amount);
			}
			return db.insert_bulk_mint_recipients({ request_id, addresses, amounts}, conn);
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

			let request_id = await db.insert_request({ token_id, mint_to, token_details }, conn);

			let filename = `${request_id}-${image_asset.filename}`;

			let [ asset_id, recipient_ids ] = await Promise.all([
				db.insert_asset({
					request_id,
					asset_role: 'artwork',
					mime_type: image_asset.mime_type,
					filename
				}, conn),
				recipients ? insert_mint_recipients({ request_id, recipients }, conn) : null,
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
			throw new ValidationError("No such token id");
		}
		return insert_mint_recipients({ request_id: request.id, recipients });
	};

	const recent_requests = function({ limit }) {
		return db.get_requests({ limit });
	}

	const check_token_status = async function({ /*request_id,*/ token_id }) { 
		// let request = null;
		// if (request_id && token_id) {
		// 	throw new ValidationError('Ambiguous query. Specify either request_id or token_id.')
		// } else if (token_id) {
		request = await db.get_request_by_token_id({ token_id });
		// } else if (request_id) {
		// 	request = await db.get_request_by_request_id({ request_id });
		// } else {
		// 	throw new ValidationError('Specify either request_id or token_id in query string.')
		// }

		if (!request) {
			return {
				requested: false,
				processed: false,
				minted: false
			};
		}

		if (!request.peppermint_id) {
			return {
				requested: true,
				processed: false,
				minted: false,
				minting_request: request
			};
		}		
		
		let peppermint_operation = await db.get_peppermint_operation({ peppermint_id: request.peppermint_id });
		let minted = (peppermint_operation.state === 'confirmed');

		return {
			requested: true,
			processed: true,
			minted,
			minting_request: request,
			minting_operation: peppermint_operation
		};
	}

	const check_system_health = async function() {
		let up = true;
		let warning = false;
		let errors = [];

		let [ mintery_canary, peppermint_canary, peppermint_stat_rows ] = await Promise.all([
			db.get_mintery_canary(),
			db.get_peppermint_canary({ originator_address: config.chain.peppermint_originator }),
			db.get_peppermint_stats({
				originator_address: config.chain.peppermint_originator,
				floor_id: config.monitoring.floor_peppermint_id 
			}) ]);
		
		let now = Date.now();
		if (mintery_canary) {
			let delay = now - mintery_canary.submitted_at;
			if (delay > config.monitoring.mintery_canary_timeout) {
				errors.push(`Mintery canary timed out by ${delay}`);
				up = false;
				warning = true;
			}
		}
		if (peppermint_canary) {
			let delay = now - peppermint_canary.submitted_at;
			if (delay > config.monitoring.peppermint_canary_timeout) {
				errors.push(`Peppermint canary timed out by ${delay}`)
				up = false;
				warning = true;
			}
		}

		let peppermint_stats = peppermint_stat_rows.reduce((obj, cur) => ({...obj, [cur.state]: cur.count}), {});
		if (peppermint_stats.unknown > 0) {
			errors.push(`Found ${peppermint_stats.unknown} operations with 'unknown' state`);
			warning = true;
		}
		if (peppermint_stats.failed > 0) {
			errors.push(`Found ${peppermint_stats.failed} operations with 'failed' state`);
			warning = true;
		}
		if (peppermint_stats.rejected > 0) {
			errors.push(`Found ${peppermint_stats.failed} operations with 'rejected' state`);
			warning = true;
		}

		return {
			up,
			warning,
			errors
		};
	}

	const set_canary = async function() {
		// we do error management here because this will be called from a setinterval
		try {
			await Promise.all([
				db.insert_peppermint_canary({
					originator_address: config.chain.peppermint_originator
				}),
				db.insert_mintery_canary()
			]);
			console.info("Health monitoring canary set.")
		} catch (e) {
			console.error("Error encountered while setting health monitoring canary:\n", e);
		}
	}

	return {
		new_create_request,
		new_mint_request,
		recent_requests,
		check_token_status,
		check_system_health,
		set_canary
	}
}
