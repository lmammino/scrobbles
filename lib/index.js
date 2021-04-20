import querystring from 'querystring'
import { promisify } from 'util'
import EventEmitter from 'events'
import axios from 'axios'
import _ow from 'ow'

const sleep = promisify(setTimeout)
const ow = _ow.default
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/'
const axiosIgnoreErrors = { validateStatus: () => true }

const optionsValidation = {
  apikey: ow.string,
  user: ow.string,
  limit: ow.optional.number.is(x => x >= 1 && x <= 200),
  from: ow.optional.number,
  to: ow.optional.number,
  extended: ow.optional.boolean,
  max_retries: ow.optional.number,
  retry_delay_base_ms: ow.optional.number,
  retry_base: ow.optional.number
}

const defaultOptions = {
  limit: 50,
  from: null,
  to: null,
  extended: false,
  max_retries: 5,
  retry_delay_base_ms: 100,
  retry_base: 2
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

    if (this.options.to) {
      queryOptions.to = this.options.to
    }
    const query = querystring.stringify(queryOptions)

    return `${BASE_URL}?${query}`
  }

  async * [Symbol.asyncIterator] () {
    while (true) {
      const url = this.makeUrl()
      let response = await axios.get(url, axiosIgnoreErrors)

      if (response.data.error) {
        // Retry
        let retries = 0
        while (true) {
          // exponentiall fallback on retry
          const sleepTime = this.options.retry_base ** (retries + 1) * this.options.retry_delay_base_ms
          this.emit('retry', { error: response.data.error, retryNum: retries + 1, retryAfterMs: sleepTime, url })
          await sleep(sleepTime)
          response = await axios.get(url, axiosIgnoreErrors)
          if (!response.data.error) {
            break
          }

          if (retries > this.options.max_retries) {
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
        return
      }

      const tracks = response.data.recenttracks.track

      this.options.nextTo = Number(tracks[tracks.length - 1].date.uts)
      yield tracks
        .filter(t => t.date)
        .map(t => ({
          date: Number(t.date.uts),
          artist: t.artist['#text'],
          name: t.name,
          album: t.album['#text'],
          url: t.url
        }))
    }
  }
}
