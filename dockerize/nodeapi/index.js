const exifr = require('exifr')
const path = require('path')
const md5File = require('md5-file')
const fs = require('fs')

const pool = require('./Database')

/**
 * Get full path of the file
 * @param {*} obj -
 * @param {*} filepath -
 * @returns {Object}
 */
function getFullPath (obj, filepath) {
  var absolutePath = path.resolve(filepath)
  return Object.assign(obj, {
    'filepath_origin': absolutePath
  })
}

/**
 * Generate MD5 of file
 * @param {*} obj -
 * @param {*} filepath -
 * @returns {Object}
 */
function getMD5 (obj, filepath) {
  const hash = md5File.sync(filepath)
  return Object.assign(obj, {
    'MD5': hash
  })
}

/**
 * Get metadata of file: EXIF, ...etc
 * @param {*} obj -
 * @param {*} filepath -
 * @returns {Object}
 */
async function getExif (obj, filepath) {
  let output = await exifr.parse(filepath)

  return Object.assign(obj, output)
}

/**
 * Get last modified time
 * @param {*} obj -
 * @param {*} filepath -
 * @returns {Object}
 */
function getFileStat (obj, filepath) {
  const stats = fs.statSync(filepath)
  const mtime = stats.mtime
  return Object.assign(obj, {
    'last_modified': mtime.toISOString().slice(0, -1)
  })
}

async function main () {
  // Extract file info
  const filepath = './example/sample.png'

  var obj1 = getFullPath({}, filepath)
  var obj2 = await getExif(obj1, filepath)
  var obj3 = getMD5(obj2, filepath)
  var obj4 = getFileStat(obj3, filepath)

  var fin_obj = Object.assign({}, obj4)
  console.log(fin_obj)

  // Database operation
  await pool.query(`set local timezone to 'UTC'`)
  pool.query('SELECT NOW()', (err, res) => {
    console.log(err, res)
    pool.end()
  })

  // Delete table
  const drop_table = `
  DROP TABLE IF EXISTS tbl_entries
  `
  if (0) {
    pool.query(drop_table, [], (err, res) => {
      if (err) {
        throw err
      }
      console.log('drop_table:', res.rows[0])
    })
  }

  // Create table
  const create_tbl_entries = `
    CREATE TABLE IF NOT EXISTS tbl_entries (
    "uuid" uuid DEFAULT gen_random_uuid(),
    "filepath_origin" TEXT,
    "time_added" TIMESTAMP,
    "last_modified" TIMESTAMP,
    "image_width" INT,
    "image_height" INT,
    "md5" TEXT,
    "meta" jsonb NOT NULL,
    PRIMARY KEY ("uuid")
  );`
  pool.query(create_tbl_entries, [], (err, res) => {
    if (err) {
      throw err
    }
    console.log('create_tbl_entries:', res.rows[0])
  })

  // Insert row
  const insertEntryText = `INSERT INTO tbl_entries(
    filepath_origin,
    time_added,
    last_modified,
    image_width,
    image_height,
    md5,
    meta)
  VALUES (
    '${fin_obj['filepath_origin']}',
    NOW(),
    '${fin_obj['last_modified']}',
    ${fin_obj['ImageWidth']},
    ${fin_obj['ImageHeight']},
    '${fin_obj['MD5']}',
    '{}');`
  if (!0) {
    pool.query(insertEntryText, [], (err, res) => {
      if (err) {
        throw err
      }
      console.log('INSERT:', res.rows[0])
    })
  }

  // Query database
  pool.query(`SELECT
    *,
    timezone('UTC'::text, last_modified) AS last_modified_utc,
    timezone('UTC'::text, time_added) AS time_added_utc
  FROM tbl_entries`, [], (err, res) => {
    if (err) {
      throw err
    }
    console.log('user:', res.rows)
  })
}

main()
