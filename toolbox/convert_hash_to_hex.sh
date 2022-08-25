#!/bin/bash

# This tool is for use in deploying FA2 contracts, to convert
# the contract metadata ipfs link into the hex string that
# needs to be inserted into contract storage

ADDRESS=ipfs://${1}
echo ${ADDRESS}
echo -n ${ADDRESS} | xxd -p -c 70

