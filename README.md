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

`POST {root}/tokens/{token id}/recipients`

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

### Monitoring

Peppermintery also offers a service endpoint for monitoring the health of the minting setup:

`GET {root}/health`

This returns HTTP 200 if everything is found in order, and HTTP 503 Service Unavailable if issues have been found. The following checks are executed:

- A canary / watchdog logic checks for the last time the Peppermintery worker process attempted to pull a job, and the check fails if this returns a timeout.
- A canary / watchdog logic checks for the last time Peppermint attempted to pull a job, and the check fails if this returns a timeout.
- The count of different Peppermint operation states is queried from a 'floor' id up, and the check fails if any error states (`unknown`, `failed`, `rejected`) are found.

The health monitoring system can be adjusted by the `monitoring` section in the config. The meaning of the settings here:

- `canary_cycle`: milliseconds between inserting a new canary record into both the Peppermint and Peppermintery job queues; these are rows which the Peppermint and Peppermintery worker processes respectively delete every time they pull a new job
- `peppermint_canary_timeout`: timeout in milliseconds for the Peppermint canary
- `mintery_canary_timeout`: timeout in milliseconds for the Peppermintery canary
- `floor_peppermint_id`: operation stats are checked from this Peppermint id up; this can be set to the current id to 'zero out' the health check after past errors had been investigated
