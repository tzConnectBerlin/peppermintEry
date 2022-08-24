
export default function(config) {

	const validate_token_info = function({ title, description }) {
		return;
	};

	const generate_metadata = function({ token_info, asset_hash, asset_mimetype, display_hash }) {
		let artifactUri = `ipfs://${asset_hash}`;
		let displayUri = `ipfs://${display_hash || asset_hash}`;

		let metadata = {
			...token_info,
			...config.collection_info,
			symbol: config.symbol,
			isTransferable: true,
			isBooleanAmount: true, // current version is for minting unique 1 of 1 nfts
			shouldPreferSymbol: false,
			decimals: 0,
			artifactUri,
			displayUri,
			thumbnailUri: displayUri,
			formats: [
				{
					uri: artifactUri,
					mimeType: asset_mimetype
				}
			]
		};
		if (display_hash) {
			metadata.formats.push({
				uri: displayUri,
				mimeType: 'image/jpeg' // currently display is always jpeg if there is one
			});
		}

		return metadata;
	}

	return {
		validate_token_info,
		generate_metadata
	}
}
