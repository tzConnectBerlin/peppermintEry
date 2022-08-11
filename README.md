# PeppermintEry
A webservice interface and token crafter companion to Peppermint

## Token minting request:

Call the minting endpoint, POSTing the following payload format:

```
{
	"token_id": <unique token id>,
	"mint_to": <Wallet Hash>,
	"token_details": {
        "title": "Hello World",
        "description": "the Hello World nft",
        "attributes": {
            <stringKey>: <value>,
            ...
        }
    },
    "image_asset": {
       	"mime_type": "image/png",
       	"filename": "hello.png",
       	"b64_data": <Base64 image>
	}
}
```
