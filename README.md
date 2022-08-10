# PeppermintEry
A webservice interface and token crafter companion to Peppermint

## Token minting request:

Call the minting endpoint, POSTing the following payload format:

```
{
	"mint_to": <Wallet Hash>,
	"token_details": {
        "title": "Hello World",
        "description": "the Hello World nft",
        "attributes": {
            <stringKey>: <value>,
            ...
        }
    },
    "assets": {
		"artifact": {
       		"mime_type": "image/png",
       		"filename": "hello.png",
       		"b64_data": <Base64 image>
    	},
    	"display":  {
    		"mime_type": "image/jpeg",
       		"filename": "hello-400x400.jpg",
       		"b64_data": <Base64 image>
    	},

		"thumbnail": <..>
	}
}
```
