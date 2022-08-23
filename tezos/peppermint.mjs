
export default function(config, db=null) {

//{"args": {"amount": 1, "token_id": 7, 
//"to_address": "tz2U4jg4SKPek9DRrXTB5bYAMHsewma3wrxS", 
//"metadata_ipfs": "ipfs://QmYgfCfufyhMjwShHqr1kiH3rrzks8nKeh2fYXaxdXEskL"}, 
//"name": "create_and_mint", "handler": "nft"}

	const insert_create_and_mint_op = function ({ recipient_address, token_id, token_metadata_hash}, conn=undefined) {
		const create_and_mint_command = {
			handler: config.peppermint_handler,
			name: 'create_and_mint',
			args: {
				token_id,
				metadata_ipfs: `ipfs://${token_metadata_hash}`,
				to_address: recipient_address,
				amount: 1
			}
		};

		return db.insert_peppermint_op({ originator_address: config.peppermint_originator, command: create_and_mint_command }, conn);
	};

	return {
		insert_create_and_mint_op
	};
}