import { Sharp } from "sharp";

import { createRequire } from 'module'
const require = createRequire(import.meta.url);

import Db from '../dataaccess/db.mjs'
const config = require('../config.json');

const db = Db(config.database);

const heartbeat = async function() {
	
}