# PeppermintEry
A webservice interface and token crafter companion to Peppermint

## Service endpoints

The service root is configurable.

### Insert new request

`POST {root}/`

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

If no token_id is specified, a deterministic token id will be generated from the asset IPFS hash.

Note: minting multiple unique tokens with the same asset (eg. numbered editions) is not handled adequately by the current version of this tool. It is on the roadmap for the future, though, and will require a different workflow.

### Get recent requests

GET {root}/{?limit=[limit]}

Get a list of recent requests with all details.

### Query token status

`GET {root}/token_status?request_id=[request_id]`

or

`GET {root}/token_status?token_id=[token_id]`

Get the detailed status of the request, including on-chain token status, if minted.
