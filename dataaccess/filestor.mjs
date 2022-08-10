import fs from 'fs'

export default function() {
	
	const write_b64_to_file = async function({ file_name, b64_data }) {
		let filebuf = Buffer.from(b64_data, 'base64');

		await fs.writeFile(`assets/${file_name}`, b64_data);
	};

	return {
		write_b64_to_file
	};
}