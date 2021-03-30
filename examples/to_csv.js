import { Readable, Transform, pipeline } from 'stream'
import csv from 'csv'
import { RecentTracks } from '../index.js'

const reader = new RecentTracks({
  apikey: process.env.API_KEY,
  user: 'loige',
  limit: 200
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

process.stdout.write('"ts","artist","name","album","url"\n')
pipeline(
  source,
  pageToRecords,
  recordToCsv,
  process.stdout,
  (err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    console.error('Completed!')
  }
)

source.on('data', _ => console.error(reader.stats))
