import t from 'tap'
import nock from 'nock'

import { RecentTracks } from './index.js'
import { page1, page2, page3, page1extended, page2extended, page3extended, last } from './__fixtures__/fixtures.js'

t.test('it traverses multiple pages and collects all songs', async function (t) {
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

  for await (const page of reader) {
    for (const song of page) {
      songs.push(song)
    }
  }

  t.matchSnapshot(songs, 'songs')
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
