#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Readable, Transform, pipeline } from 'stream'
import csv from 'csv'
import cliProgress from 'cli-progress'
import { RecentTracks } from '../lib/index.js'

const { argv } = yargs(hideBin(process.argv))
  .example(
    'SCROBBLES_APIKEY=xxx $0 -u loige -f 1998-01-01 -t 2022-03-14 -F csv',
    'exports all the tracks from 1998-01-01 to 2022-03-14 for user loige in CSV format'
  )
  .env('SCROBBLES')
  .help('help')
  .option('u', {
    description: 'The last.fm username',
    alias: 'user',
    type: 'string',
    required: true
  })
  .option('a', {
    description: 'The last.fm API KEY (https://www.last.fm/api/account/create)',
    alias: 'apikey',
    type: 'string',
    required: true
  })
  .option('f', {
    description: 'An ISO timestamp used as a starting point to get tracks from',
    alias: 'from',
    type: 'string'
  })
  .option('t', {
    description: 'An ISO timestamp used as to decide when to stop fetching data',
    alias: 'to',
    type: 'string'
  })
  .option('s', {
    description: 'skip the header when outputting the data in CSV format',
    alias: 'skipheader',
    type: 'boolean',
    default: false
  })
  .option('F', {
    alias: 'format',
    default: 'ndjson',
    choices: ['csv', 'ndjson']
  })

const options = {
  apikey: argv.apikey,
  user: argv.user
}
if (argv.limit) {
  options.limit = argv.limit
}
if (argv.from) {
  const from = new Date(argv.from)
  options.from = from.getTime() / 1000
}
if (argv.to) {
  const to = new Date(argv.to)
  options.to = to.getTime() / 1000
}
const reader = new RecentTracks(options)

reader.on('retry', ({ error, retryNum, retryAfterMs, url }) => {
  console.error(`Failure (${retryNum}) ${url}: ${error}. Retrying in ${retryAfterMs}`)
})

const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
let progressStarted = false
reader.on('progress', (e) => {
  if (!progressStarted) {
    progress.start(reader.totalPages, 0)
    progressStarted = true
  }

  if (e.remainingPages === 0) {
    progress.stop()
  } else {
    progress.update(reader.totalPages - e.remainingPages)
  }
})

const source = Readable.from(reader, { objectMode: true })
const pageToRecords = new Transform({
  objectMode: true,
  transform: function (page, _, done) {
    for (const record of page) {
      this.push(record)
    }
    done()
  }
})

const recordToCsv = csv.stringify({
  quoted: true
})

const recordToNdJson = new Transform({
  objectMode: true,
  transform: function (record, _, done) {
    this.push(`${JSON.stringify(record)}\n`)
    done()
  }
})

if (argv.format === 'csv' && !argv.skipheader) {
  process.stdout.write('"ts","artist","name","album","url"\n')
}

pipeline(
  source,
  pageToRecords,
  argv.format === 'csv' ? recordToCsv : recordToNdJson,
  process.stdout,
  (err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    console.error('\n\nCompleted!')
    process.exit(0)
  }
)
