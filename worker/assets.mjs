import Filestor from '../dataaccess/filestor.mjs'
import Imager from '../common/imager.mjs'

export default function(config) {
	const filestor = Filestor(config);
	const imager = Imager(config);

	const prepare_assets = async function({ asset_filename, display_asset_filename }) {
		let asset_buffer = await filestor.read_binary_file({ filename: asset_filename });
		let asset_image = await imager.load_image({ buffer: asset_buffer });

		// We're shrinking the image for fast display if the original image is larger than the specified display size
		// FIXME: add logic to convert small _lossless_ (png, tif) images to jpeg for display, to speed up load times
		let display_asset_image = await imager.resize_to({ image: asset_image, bounding_box: config.display_bounding_box });
		let display_asset_buffer = display_asset_image ? await imager.to_jpeg_buffer(display_asset) : null;
		if (display_asset_buffer) {
			await filestor.write_binary_file({ buffer: display_asset_buffer, filename: display_asset_filename });
		}
		return { asset_buffer, display_asset_buffer };
	};

	return {
		prepare_assets
	};
}
