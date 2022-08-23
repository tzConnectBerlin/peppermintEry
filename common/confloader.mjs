import { createRequire } from 'module'
const require = createRequire(import.meta.url);

export default function() {
	let profile = process.env.PEPPERMINT_PROFILE;
	let config_filename = profile ? `../config_${profile}.json` : '../config.json';
	return require(config_filename);
}
