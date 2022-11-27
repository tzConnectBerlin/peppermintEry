import ConfLoader from '../common/confloader.mjs'

import Db from '../dataaccess/db.mjs'
import Metadata from '../tezos/metadata.mjs'
import Assets from './assets.mjs'
import Pinata from '../tezos/pinata.mjs'
import Peppermint from '../tezos/peppermint.mjs'

const config = ConfLoader();

const db = Db(config.database);
const meta = Metadata(config.token);
const assets = Assets(config.assets);
const pinata = Pinata(config.pinata);
const peppermint = Peppermint(config.chain, db);

const main = async function() {

	const heartbeat_a = async function() {
		let tx = false;
		let conn = {};
		let create_request = null;
		try {
			create_request = await db.checkout_request();
			if (!create_request) {
				console.log('No pending create requests...')
				return true;
			}
			console.log(`Processing create request with id ${create_request.id}:\n`, create_request);

			let asset_info = await db.get_asset_by_request_id({ request_id: create_request.id });
			if (!asset_info) {
				throw new Error(`No asset record for request ${create_request.id}`);
			}
			console.log(`Loading asset for mint request ${create_request.id}:\n`, asset_info);

			let display_asset_filename = `${create_request.id}-display.jpeg`;
			let { asset_buffer, display_asset_buffer } = await assets.prepare_assets({ asset_filename: asset_info.filename, display_asset_filename });
			// Let's wait for both uploads to finish
			let [ asset_hash, display_asset_hash ] = await Promise.all([
				pinata.upload_file({ buffer: asset_buffer, filename: asset_info.filename }),
				display_asset_buffer ? pinata.upload_file({ buffer: display_asset_buffer, filename: display_asset_filename }) : null
			]);

			console.log(`Uploaded asset ${asset_info.filename} for mint request ${create_request.id} with hash ${asset_hash}`);
			if (display_asset_hash) {
				console.log(`Uploaded asset ${display_asset_filename} for mint request ${create_request.id} with hash ${display_asset_hash}`);
			}

			let token_metadata = meta.generate_metadata({
				token_info: create_request.details,
				asset_hash: asset_hash,
				asset_mimetype: asset_info.mime_type,
				display_hash: display_asset_hash
			});
			console.log(`Metadata generated for mint request ${create_request.id}:\n`, token_metadata);

			let token_metadata_hash = await pinata.upload_json({ data: token_metadata, filename: `${create_request.id}-metadata.json` });
			console.log(`Uploaded token metadata for mint request ${create_request.id} with hash ${token_metadata_hash}`);
			
			// Start the transactional part <3
			conn = await db.get_connection();
			await db.begin_tx(conn);
			tx = true;

			let peppermint_command = peppermint.generate_create_command({
				token_id: create_request.token_id,
				token_metadata_hash
			});
			let peppermint_id = await db.insert_peppermint_op({ originator_address: peppermint.originator_address, peppermint_command });
			await db.complete_request({ request_id: create_request.id, peppermint_id }, conn);
			db.commit_tx(conn);
			tx = false;

			console.log(`Completed processing of request ${create_request.id} with peppermint operation id ${peppermint_id}`)
		} catch(err) {
			if (create_request) {
				console.error(`An error has occurred while attempting to process create request no. ${create_request.id}\n`, err);
				await db.set_request_state({ request_id: create_request.id, state: db.state.FAILED });
			} else {
				console.error('An error has occurred attempting to fetch the next create request...\n', err);
			}
			return false;
		} finally {
			if (tx) {
				await db.rollback_tx(conn);
			}
			if (conn.release) {
				conn.release();
			}
		}
		return true;
	}

	const heartbeat_b = async function() {
		let tx = false;
		let conn = {};
		let recipients = null;
		try {
			recipients = await db.checkout_recipients();
			if (recipients.length === 0) {
				console.log('No pending mint requests...');
				return true;
			}
			let recipient_ids = db.unnest_ids(recipients);
			console.log(`Processing ${recipients.length} mint requests with ids`, recipient_ids);

			let commands = [];
			for (let recipient of recipients) {
				let command = peppermint.generate_mint_command({
					token_id: recipient.token_id,
					address: recipient.address,
					amount: recipient.amount
				});
				commands.push(command);
			}

			// Start the transactional part <3
			conn = await db.get_connection();
			await db.begin_tx(conn);
			tx = true;

			let peppermint_ids = await db.insert_bulk_peppermint_ops({
				originator_address: peppermint.originator_address,
				commands
			});
			await db.complete_recipients({ recipient_ids, peppermint_ids });

			db.commit_tx(conn);
			tx = false;

			console.log('Completed processing of mint requests with ids', recipient_ids);
		} catch(err) {
			if (recipients) {
				console.error('An error has occurred while processing mint requests...\n', err);
				await db.set_recipient_states({ recipient_ids: create_request.id, state: db.state.FAILED });
			} 
			return false;
		} finally {
			if (tx) {
				await db.rollback_tx(conn);
			}
			if (conn.release) {
				conn.release();
			}
		}
		return true;
	}

	let signal = true;
	while (signal) {
		try {
			let [ result, _ ] = await Promise.all([
				heartbeat_a(),
				heartbeat_b(),
				new Promise(_ => setTimeout(_, config.polling_delay))
			]);
			//signal = result;
		} catch (err) {
			console.error("An error has occurred in the main event loop.\n", err);
			signal = false;
		}
	}

}

main().then(() => { console.log("bye!"); }).catch((err) => { console.log("An error has ocurred outside the main event loop.\n", err) });
