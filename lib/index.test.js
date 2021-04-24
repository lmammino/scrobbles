import t from 'tap'
import nock from 'nock'

import { RecentTracks } from './index.js'
import { page1, page2, page3, page1extended, page2extended, page3extended, last } from './__fixtures__/fixtures.js'

t.test('It traverses multiple pages and collects all songs', async function (t) {
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json'
    })
    .reply(200, page1, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1618998318'
    })
    .reply(200, page2, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1618997200'
    })
    .reply(200, page3, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1618996359'
    })
    .reply(200, last, ['Content-Type', 'application/json'])

  const reader = new RecentTracks({
    apikey: 'atestapikey',
    user: 'loige',
    limit: 4
  })

  const songs = []
  const progressEvents = []

  reader.on('progress', (e) => progressEvents.push(e))

  for await (const page of reader) {
    for (const song of page) {
      songs.push(song)
    }
  }

  t.matchSnapshot(songs, 'songs')
  t.matchSnapshot(progressEvents, 'progressEvents')
})

t.test('It should support getting songs for a given time range', async function (t) {
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey2',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      from: '1618997200',
      to: '1618998074'
    })
    .reply(200, page2, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey2',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      from: '1618997200',
      to: '1618997200'
    })
    .reply(200, last, ['Content-Type', 'application/json'])

  // nock.recorder.rec()

  const reader = new RecentTracks({
    apikey: 'atestapikey2',
    user: 'loige',
    limit: 4,
    from: 1618997200,
    to: 1618998074
  })

  const songs = []

  for await (const page of reader) {
    for (const song of page) {
      songs.push(song)
    }
  }

  t.matchSnapshot(songs, 'songs')
})

t.test('It can fetch extended data and use custom track mappers', async function (t) {
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '1',
      method: 'user.getrecenttracks',
      format: 'json'
    })
    .reply(200, page1extended, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '1',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1619274822'
    })
    .reply(200, page2extended, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '1',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1619273186'
    })
    .reply(200, page3extended, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '1',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1619272067'
    })
    .reply(200, last, ['Content-Type', 'application/json'])

  const reader = new RecentTracks({
    apikey: 'atestapikey',
    user: 'loige',
    extended: true,
    mapTrack: (track) => track.image.find((i) => i.size === 'extralarge')['#text'],
    limit: 4
  })

  const songs = []

  for await (const page of reader) {
    for (const song of page) {
      songs.push(song)
    }
  }

  t.matchSnapshot(songs, 'songs')
})

t.test('It handles authentication errors correctly', async function (t) {
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'abrokenapikey',
      user: 'loige',
      limit: '50',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json'
    })
    .reply(403, {
      error: 10,
      message: 'Invalid API key - You must be granted a valid key by last.fm'
    }, ['Content-Type', 'application/json'])

  const reader = new RecentTracks({
    apikey: 'abrokenapikey',
    user: 'loige'
  })

  try {
    const it = reader[Symbol.asyncIterator]()
    await it.next()
  } catch (e) {
    t.equal(e.message, 'Invalid API key - You must be granted a valid key by last.fm')
  }
})

t.test('It handles retry with fallback as expected', async function (t) {
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .times(7)
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '50',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json'
    })
    .reply(500, {
      error: 1,
      message: 'Unexpected Server Error'
    }, ['Content-Type', 'application/json'])

  const reader = new RecentTracks({
    apikey: 'atestapikey',
    user: 'loige',
    maxRetries: 6,
    retryDelayBaseMs: 1,
    retryBase: 2
  })

  const retryEvents = []

  reader.on('retry', (e) => retryEvents.push(e))

  try {
    const it = reader[Symbol.asyncIterator]()
    await it.next()
  } catch (e) {
    t.matchSnapshot(retryEvents, 'retryEvents')
    t.equal(e.message, 'Failed too many times')
  }
})

t.test('It handles retry with fallback as expected and recover', async function (t) {
  // the first 4 requests will fail
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .times(4)
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json'
    })
    .reply(500, {
      error: 1,
      message: 'Unexpected Server Error'
    }, ['Content-Type', 'application/json'])
  // ...and then it will recover for page 1
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json'
    })
    .reply(200, page2, ['Content-Type', 'application/json'])
  // ...and then it fails again for 2 times
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .times(2)
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1618997200'
    })
    .reply(500, {
      error: 1,
      message: 'Unexpected Server Error'
    }, ['Content-Type', 'application/json'])
    // ...and finally it completes
  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1618997200'
    })
    .reply(200, page3, ['Content-Type', 'application/json'])

  nock('https://ws.audioscrobbler.com:443', { encodedQueryParams: true })
    .get('/2.0/')
    .query({
      api_key: 'atestapikey',
      user: 'loige',
      limit: '4',
      extended: '0',
      method: 'user.getrecenttracks',
      format: 'json',
      to: '1618996359'
    })
    .reply(200, last, ['Content-Type', 'application/json'])

  const reader = new RecentTracks({
    apikey: 'atestapikey',
    user: 'loige',
    limit: 4,
    maxRetries: 6,
    retryDelayBaseMs: 1,
    retryBase: 2
  })

  const retryEvents = []
  const songs = []

  reader.on('retry', (e) => retryEvents.push(e))

  for await (const page of reader) {
    for (const song of page) {
      songs.push(song)
    }
  }

  try {
    const it = reader[Symbol.asyncIterator]()
    await it.next()
  } catch (e) {
    t.matchSnapshot(retryEvents, 'retryEvents')
    t.matchSnapshot(songs, 'songs')
  }
})
