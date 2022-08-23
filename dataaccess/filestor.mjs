import { promises } from 'fs'

export default function({ assets_folder }) {
	
	const write_binary_file = function({ filename, buffer }) {
		return promises.writeFile(
			`${assets_folder}/${filename}`,
			buffer
			);
	};

	const read_binary_file = function({ filename }) {
		return promises.readFile(`${assets_folder}/${filename}`);
	};

	const write_b64_to_file = function({ filename, b64_data }) {
		let filebuf = Buffer.from(b64_data, 'base64');
		return write_binary_file({ filename, filebuf });
	};


	return {
		read_binary_file,
		write_binary_file,
		write_b64_to_file
	};
}