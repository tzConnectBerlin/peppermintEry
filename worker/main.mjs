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

	const heartbeat = async function() {
		let tx = false;
		let conn = {};
		let mint_request = null;
		try {
			mint_request = await db.checkout_request();
			if (!mint_request) {
				console.log('No pending requests...')
				return;
			}
			console.log(`Processing mint request with id ${mint_request.id}:\n`, mint_request);

			let asset_info = await db.get_asset_by_request_id({ request_id: mint_request.id });
			if (!asset_info) {
				throw new Error(`No asset record for request ${mint_request.id}`);
			}

			let display_asset_filename = `${mint_request.id}-display.jpeg`;
			let { asset_buffer, display_asset_buffer } = await assets.prepare_assets({ asset_filename: asset_info.filename, display_asset_filename });
			// Let's wait for both uploads to finish
			let [ asset_hash, display_asset_hash ] = await Promise.all([
				pinata.upload_file({ buffer: asset_buffer, filename: asset_info.filename }),
				display_asset_buffer ? pinata.upload_file({ buffer: display_asset_buffer, filename: display_asset_filename }) : null
			]);

			console.log(`Uploaded asset ${asset_info.filename} for mint request ${mint_request.id} with hash ${asset_hash}`);
			if (display_asset_hash) {
				console.log(`Uploaded asset ${display_asset_filename} for mint request ${mint_request.id} with hash ${display_asset_hash}`);
			}

			let token_metadata = meta.generate_metadata({
				token_info: mint_request.details,
				asset_hash: asset_hash,
				asset_mimetype: asset_info.mime_type,
				display_hash: display_asset_hash
			});
			console.log(`Metadata generated for mint request ${mint_request.id}:\n`, token_metadata);

			let token_metadata_hash = await pinata.upload_json({ data: token_metadata, filename: `${mint_request.id}-metadata.json` });
			console.log(`Uploaded token metadata for mint request ${mint_request.id} with hash ${token_metadata_hash}`);
			
			// Start the transactional part <3
			conn = await db.get_connection();
			await db.begin_tx(conn);
			tx = true;

			let peppermint_id = await peppermint.insert_create_and_mint_op({
				recipient_address: mint_request.recipient_address,
				token_id: mint_request.token_id,
				token_metadata_hash
			}, conn);
			await db.complete_request({ request_id, peppermint_id }, conn);
			db.commit_tx(conn);
			tx = false;

			console.log(`Commpleted processing of request ${mint_request.id} with peppermint operation id ${peppermint_id}`)
		} catch(err) {
			console.error('An error has occurred while processing token assets...\n', err);
			await db.set_request_state({ request_id: mint_request.id, state: db.state.FAILED });
			return;
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
				heartbeat(),
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
