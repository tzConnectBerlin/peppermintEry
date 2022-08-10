import Db from '../dataaccess/db.mjs'
import Filestor from '../dataaccess/filestor.mjs'

export default async function() {
	let db = Db();
	let filestor = Filestor();

	const new_mint_request = async function({ mint_to, token_details, assets }) {
		//FIXME: validate request format

		let token_id = await db.insert_token({ mint_to, token_details });

		for (let asset_role in ['artifact', 'display', 'thumbnail']) {
			// FIXME: validate format
			let asset = assets[asset_role];
			let mime_type = asset.mime_type;
			let filename = `${id}-${asset.role}`;
			await db.insert_asset({	token_id, asset_role, mime_type, filename })
			let content_b64 = asset.content_b64;
			await filestor.write_b64_to_file(filename, content_b64);
		}

		return true;
	}

	return {
		new_mint_request
	}
}