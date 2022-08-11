import Db from '../dataaccess/db.mjs'
import Filestor from '../dataaccess/filestor.mjs'

export default async function() {
	let db = Db();
	let filestor = Filestor();

	const new_mint_request = async function({ token_id, mint_to, token_details, image_asset }) {
		//FIXME: validate request json
		//FIXME: transactionalize + manage errors

		let request_id = await db.insert_token({ token_id, mint_to, token_details });
		console.log(request_id);

		let filename = `${request_id}-${image_asset.filename}`;
		await db.insert_asset({
			request_id,
			asset_role: 'artwork',
			mime_type: image_asset.mime_type,
			filename
		});

		await filestor.write_b64_to_file({
			filename,
			b64_data: image_asset.b64_data
		});

		return {
			filename,
			request_id
		};
	}

	const check_token_status = async function({ request_id, token_id }) {
		//FIXME

		return {
			dummy: true,
			processed: true,
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
		check_token_status,
		check_system_health
	}
}