import querystring from 'querystring'
import { promisify } from 'util'
import EventEmitter from 'events'
import axios from 'axios'
import _ow from 'ow'

const sleep = promisify(setTimeout)
const ow = _ow.default
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/'
const axiosConfig = {
  validateStatus: () => true,
  headers: { 'User-Agent': 'github.com/lmammino/scrobbles' }
}

const optionsValidation = {
  apikey: ow.string,
  user: ow.string,
  limit: ow.optional.number.is(x => x >= 1 && x <= 200),
  from: ow.optional.number,
  to: ow.optional.number,
  extended: ow.optional.boolean,
  mapTrack: ow.optional.function,
  maxRetries: ow.optional.number,
  retryDelayBaseMs: ow.optional.number,
  retryBase: ow.optional.number
}

function defaultMapTrack (track) {
  return ({
    date: Number(track.date.uts),
    artist: track.artist['#text'],
    name: track.name,
    album: track.album['#text'],
    url: track.url
  })
}

const defaultOptions = {
  limit: 50,
  from: null,
  to: null,
  extended: false,
  mapTrack: defaultMapTrack,
  maxRetries: 5,
  retryDelayBaseMs: 100,
  retryBase: 2
}

export class RecentTracks extends EventEmitter {
  constructor (options) {
    super()
    ow(options, ow.object.exactShape(optionsValidation))
    this.options = { ...defaultOptions, ...options }
    this.nextTo = null
    this.totalPages = null
  }

  makeUrl () {
    const queryOptions = {
      api_key: this.options.apikey,
      user: this.options.user,
      limit: this.options.limit,
      extended: this.options.extended ? '1' : '0',
      method: 'user.getrecenttracks',
      format: 'json'
    }

    if (this.options.from) {
      queryOptions.from = this.options.from
    }

    if (this.options.nextTo || this.options.to) {
      queryOptions.to = this.options.nextTo || this.options.to
    }

    const query = querystring.stringify(queryOptions)

    return `${BASE_URL}?${query}`
  }

  async * [Symbol.asyncIterator] () {
    while (true) {
      const url = this.makeUrl()
      let response = await axios.get(url, axiosConfig)

      if (response.status === 403) {
        // invalid API Key
        throw new Error(response.data.message)
      }

      if (response.data.error) {
        // Retry
        let retries = 0
        while (true) {
          // exponentiall fallback on retry
          const sleepTime = this.options.retryBase ** (retries + 1) * this.options.retryDelayBaseMs
          this.emit('retry', {
            error: response.data.error,
            message: response.data.message,
            retryNum: retries + 1,
            maxRetries: this.options.maxRetries,
            retryAfterMs: sleepTime,
            url
          })
          await sleep(sleepTime)
          response = await axios.get(url, axiosConfig)
          if (!response.data.error) {
            break
          }

          if (retries + 1 >= this.options.maxRetries) {
            throw new Error('Failed too many times')
          }

          retries++
        }
      }

      const stats = response.data.recenttracks['@attr']
      this.totalPages = this.totalPages || Number(stats.totalPages)
      const progress = stats.totalPages === '0' ? 1 : (this.totalPages - Number(stats.totalPages)) / this.totalPages
      this.emit('progress', { progress, remainingPages: Number(stats.totalPages), perPage: Number(stats.perPage) })

      if (stats.total === '0') {
        // this page was empty, we are at the end
        return
      }

      const tracks = response.data.recenttracks.track

      this.options.nextTo = Number(tracks[tracks.length - 1].date.uts)
      yield tracks
        .filter(t => t.date)
        .map(this.options.mapTrack)
    }
  }
}
