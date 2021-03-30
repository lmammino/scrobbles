import { RecentTracks } from '../index.js'

async function getAllPages () {
  const reader = new RecentTracks({
    apikey: process.env.API_KEY,
    user: 'loige'
  })

  for await (const page of reader) {
    for (const song of page) {
      console.log(song)
    }
    console.log(reader.stats)
  }
}

getAllPages().catch((err) => {
  console.error(err)
  process.exit(1)
})
