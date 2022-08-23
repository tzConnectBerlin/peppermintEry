import Db from '../dataaccess/db.mjs'
import Filestor from '../dataaccess/filestor.mjs'
import { ValidationError } from '../common/errors.mjs';

export default async function(config) {
	let db = Db(config.database);
	let filestor = Filestor(config);

	const new_mint_request = async function({ token_id, mint_to, token_details, image_asset }) {
		//FIXME: validate request json
		
		let tx = false;
		let conn = {};
		try {
			conn = await db.get_connection();
			await db.begin_tx(conn);
			tx = true;

			let request_id = await db.insert_request({ token_id, mint_to, token_details }, conn);

			let filename = `${request_id}-${image_asset.filename}`;
			await Promise.all([
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
			
			return { filename, request_id };
		} finally {
			if (tx) {
				await db.rollback_tx(conn);
			}
			if (conn.release) {
				conn.release();
 			}
		}
	}

	const recent_requests = function({ limit }) {
		return db.get_requests({ limit });
	}

	const check_token_status = async function({ request_id, token_id }) { 
		let request = null;
		if (request_id && token_id) {
			throw new ValidationError('Ambiguous query. Specify either request_id or token_id.')
		} else if (token_id) {
			request = await db.get_request_by_token_id({ token_id });
		} else if (request_id) {
			request = await db.get_request_by_request_id({ request_id });
		} else {
			throw new ValidationError('Specify either request_id or token_id in query string.')
		}

		return {
			dummy: true,
			request,
			minted: false
		};
	}

	const check_system_health = async function() {
		//FIXME

		return {
			dummy: true,
			up: true
		};
	}

	return {
		new_mint_request,
		recent_requests,
		check_token_status,
		check_system_health
	}
}
