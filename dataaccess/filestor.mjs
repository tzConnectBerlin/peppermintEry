import { promises } from 'fs'

export default function() {
	
	const write_b64_to_file = async function({ filename, b64_data }) {
		let filebuf = Buffer.from(b64_data, 'base64');

		await promises.writeFile(
			`assets/${filename}`,
			b64_data,
			);
	};

	return {
		write_b64_to_file
	};
}