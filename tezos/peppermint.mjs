
export default function(config) {

//{"args": {"amount": 1, "token_id": 7, 
//"to_address": "tz2U4jg4SKPek9DRrXTB5bYAMHsewma3wrxS", 
//"metadata_ipfs": "ipfs://QmYgfCfufyhMjwShHqr1kiH3rrzks8nKeh2fYXaxdXEskL"}, 
//"name": "create_and_mint", "handler": "nft"}

	const generate_create_command = function ({ token_id, token_metadata_hash}) {
		let create_command = {
			handler: config.peppermint_handler,
			name: 'create',
			args: {
				token_id,
				metadata_ipfs: `ipfs://${token_metadata_hash}`
			}
		};
		return create_command;
	};

	const generate_mint_command = function ({ token_id, address, amount }) {
		let mint_command = {
			handler: config.peppermint_handler,
			name: 'mint',
			args: {
				token_id,
				to_address: address,
				amount
			}
		};
		return mint_command;
	}

	return {
		originator_address,
		generate_create_command,
		generate_mint_command
	};
}