import t from 'tap'
import nock from 'nock'

import { RecentTracks } from './index.js'
import { page1, page2, page3, last } from './__fixtures__/fixtures.js'

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
