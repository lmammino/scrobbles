import { RecentTracks } from '../lib/index.js'

async function getAllPages () {
  const reader = new RecentTracks({
    apikey: process.env.API_KEY,
    user: 'loige'
  })

  reader.on('retry', ({ message, retryNum, retryAfterMs, url }) => {
    console.error(`Failure (${retryNum}) ${url}: ${message}. Retrying in ${retryAfterMs}`)
  })

  reader.on('progress', console.log)

  for await (const page of reader) {
    for (const song of page) {
      console.log(song)
    }
  }
}

getAllPages().catch((err) => {
  console.error(err)
  process.exit(1)
})
