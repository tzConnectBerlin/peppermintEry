# PeppermintEry
A webservice interface and token crafter companion to Peppermint

## Configuration

Configuration happens via a single JSON file, for both the service endpoint and the worker process(es). For the possible settings, refer to `config.example.json`.

When loading the configuration, the process looks at the environment variable `PEPPERMINT_PROFILE`. If this variable is not set, the file `config.json` is loaded. If profile is set, the process looks for the file `config_{profile}.json`. This variable is intended to be shared with Peppermint.

## Service endpoints

### Insert new create request

`PUT {root}/tokens/{token id}`

Insert a new token creation request, PUTting the following payload format:

```
{
	"token_details": {
                "name": "Hello World",
                "description": "the Hello World nft",
                "tags": [ "<tag>", "<tag>", ... ]
                "attributes": [
                        {
                                "name": "<stringKey>"
                                "value": "<value>"
                        },
                        ...
                ],
                ...
        },
        "image_asset": {
                "mime_type": "image/png",
                "filename": "hello.png",
                "b64_data": <Base64 image>
        },
        "recipients": <Optional mint recipients record, see mint endpoint description>
}
```

The `token_details` field is partial token metadata, subject to the TZIP-21 standard: https://tzip.tezosagora.org/proposal/tzip-21/

Note: minting multiple unique tokens with the same asset (eg. numbered editions) is not handled adequately by the current version of this tool. It is on the roadmap for the future, though, and will require a different workflow.

### Insert new mint request

`POST {root}/tokens/{token id}/mint`

Insert new mint requests for a token. The request body has to be one of the following:

- JSON string of a valid tezos address; in this case, an amount of 1 token will be minted
- A JSON object of the format `{ address, amount }`
- A JSON array containing entries of the former two variants

### Get recent requests

`GET {root}/tokens[?limit={limit}]`

Get a list of recent requests with all details.

### Query token status

`GET {root}/tokens/{token id}`

Get the detailed status of the request, including on-chain token status, if minted.

### Query token mint recipient status (in progress)

`GET {root}/tokens/{token id}/recipients/{address}`

Get detailed status of the mint operation with the specified recipient.