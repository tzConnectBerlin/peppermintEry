import sharp from 'sharp';

export default function (config) {
	const load_image = async function({ buffer }) {
		let image = sharp(buffer);
		// this part serves a real purpose here beside logging!
		// this way we get an error right here if something is wrong with the file
		let metadata = await image.metadata();
		console.log(`Loaded '${filename}':\n`, metadata);
		return image;
	};

	const to_jpeg_buffer = async function({ image }) {
		return await image.jpeg({
			quality: config.jpeg_quality,
			mozjpeg: true
		}).toBuffer();
	};

	const resize_to = async function({ image, bounding_box }) {
		let metadata = await image.metadata();
		let old_bounding_box = Math.max(metadata.height, metadata.width);
		if (old_bounding_box <= bounding_box) {
			return false;
		}
		let new_image = image.resize({
			width: bounding_box,
			height: bounding_box,
			fit:'inside'
		});
		return new_image;
	}

	return {
		load_image,
		to_jpeg_buffer,
		resize_to
	};
}