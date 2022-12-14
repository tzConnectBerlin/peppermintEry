import Pinata from "@pinata/sdk";
import { json } from "express";
import { Readable } from "stream";

export default function(config) {
	const pinata = Pinata(config.api_key, config.secret_key);

	const prefix_name = function(name) {
		return `${config.asset_name_prefix}_${name}`;
	};

	const upload_file = async function ({ buffer, filename }) {
		let pinata_name = prefix_name(filename);

		let stream = Readable.from(buffer);
		stream.path = pinata_name; // the pinata SDK is a mess, this is required...
		let result = await pinata.pinFileToIPFS(stream, { pinataMetadata: { name: pinata_name } });
		console.log(`File ${pinata_name} pinned:\n`, result);

		return result.IpfsHash;
	};

	const upload_json = async function ({ data, filename }) {
		let pinata_name = prefix_name(filename);
		let result = await pinata.pinJSONToIPFS(data, { pinataMetadata: { name: pinata_name } });
		console.log(`Json document ${pinata_name} pinned:\n`, result);

		return result.IpfsHash;
	};

	return {
		upload_file,
		upload_json
	};
}
