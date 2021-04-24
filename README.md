# Scrobbles

[![npm version](https://img.shields.io/npm/v/scrobbles)](https://npm.im/scrobbles)
[![Node.js CI](https://github.com/lmammino/scrobbles/actions/workflows/node.js.yml/badge.svg)](https://github.com/lmammino/scrobbles/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/lmammino/scrobbles/branch/main/graph/badge.svg?token=om2BOabUg1)](https://codecov.io/gh/lmammino/scrobbles)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)


A Node.js library to fetch [last.fm](https://www.last.fm) "scrobbled" for a given user.

["Scrobble"](https://www.quora.com/How-did-Last-fm-come-with-the-term-scrobble) is a last.fm term to indicate a songs that a user has listened to at a given moment in time. It is effectively a record of a person listening to a specific song!

This library can be useful to explore the entire muscial history of a given user. If you need a few possible use cases, there you go:

  - Do some musical analytics. What the most listened song among your friends?
  - Backup your entire music listening history somewhere "safe" (for some definition of "safe").
  - Search for that one song that you can't fully remember (maybe you just remember the artist or some keyword in the title)!


## Installation

As with any other Node.js package, this is as easy as:

```bash
npm install --save scrobbles
```

## Example

**Note**: In order to use this library you will need to [get an API key from Last.fm](https://www.last.fm/api/account/create).

Print all the musical listening history (from latest to oldest) of the user `loige`:

```javascript
import { RecentTracks } from 'scrobbles'

async function getAllPages () {
  const reader = new RecentTracks({
    apikey: process.env.API_KEY,
    user: 'loige'
  })

  reader.on('retry', ({ error, message, retryNum, retryAfterMs, url }) => {
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

```

More examples available in the [`examples` folder](/examples).


## API & Configuration

The library exposes the `RecentTracks` reader class. This class is both an **event emitter** and an **Async Iterator**.

### Initialization options

You can instantiate a new reader you can use the `RecentTracks` constructor which accepts a configuration object:

```javascript
const reader = new RecentTracks({
  apikey,           // mandatory - the last.fm API key
  user,             // mandatory - the name of the last.fm user
  limit,            // optional - the number of songs to fetch per page. Between 1 and 200. Default: 50
  from,             // optional - a unix timestamp that indicates the earliest point in time to include 
                    //            in the list of results. Default: unbound (earliest song ever scrobbled for that user)
  to,               // optional - a unix timestamp that indicates the latest point in time to include in 
                    //            the list of results. Default: unbound (essentially "now")
  extended,         // optional - a boolean indicating wheter every record should contain extended information 
                    //            (e.g. cover pictures) or not. Default: false
  mapTrack,         // optional - a function to remap the raw response from last.fm. See next sections for more details 
  maxRetries,       // optional - the number of retries in case of failure. Default: 5
  retryDelayBaseMs, // optional - the base delay in milliseconds. Default: 100
  retryBase,        // optional - the exponent to calculate the delay before the next retry: Default: 2
})
```

### Retry logic

Last.fm APIs will sometime throw random errors, so this library provides a built in retry mechanism that can be configured with the options mentioned above.

The wait time before a consecutive retry is calculated with the formula `retryBase ** retryNum * retryDelayBaseMs` (exponential fallback).

If the number of consecutive max retries is reached then an error is thrown.

If a successful response is received after a retry, the retry counter is reset.


### Custom track mapping

By default, iterating over a reader will give you a list of pages. Every page contains a chunk of "scrobbled" tracks. Every track will contain the following fields:

```javascript
{
  "album": "The Music That Died Alone",
  "artist": "The Tangent",
  "date": 1618997643,
  "name": "Up-hill From Here",
  "url": "https://www.last.fm/music/The+Tangent/_/Up-hill+From+Here",
}
```

In reality, last.fm APIs will contain a lot more information (especially if setting the `extended` option to `true`). If you want to provide your own custom mapping you can do that by passing a custom mapping function using the `mapTrack` parameter of the constructor configuration object.

For example:

```javascript
const reader = new RecentTracks({
  apiKey: 'mysupersecretapikey',
  user: 'mariobros',
  mapTrack: (rawTrack) => ({
    date: Number(rawTrack.date.uts),
    artist: rawTrack.artist['#text'],
    name: rawTrack.name,
    album: rawTrack.album['#text'],
    url: rawTrack.url,
    cover: rawTrack.image.find((i) => i.size === 'extralarge')['#text'],
  }),
}
```

To learn more about all the fields exposed by last.fm, check out the official documentation for the [`user.getRecentTracks` API](https://www.last.fm/api/show/user.getRecentTracks).


### Events

A `RecentTracks` instance emits the following events:

#### `progress`

Emitted for every successful api call when a page is fetched. It gives indications about the current progress.

```javascript
reader.on('progress', e => console.log(e))
```

Will print something like this:

```javascript
{
  "perPage": 4, // how many elements per page
  "remainingPages": 2, // how many pages are left to fetch
  "progress": 0.3333333333333333, // the allover progress in percentage
}
```

#### `retry`

In case of error, when a retry is about to happen.

```javascript
reader.on('retry', e => console.log(e))
```

Will print something like this:

```javascript
{
  "error": 1, // error code
  "maxRetries": 6, // the number of max retries configured
  "message": "Unexpected Server Error", // the error message
  "retryAfterMs": 1600, // when the next retry is going to happen
  "retryNum": 4, // the number of consecutive retries so far
  "url": "https://ws.audioscrobbler.com/2.0/?api_key=atestapikey&user=loige&limit=4&extended=0&method=user.getrecenttracks&format=json", // the URL of the request that failed
}
```


## Contributing

Everyone is very welcome to contribute to this project.
You can contribute just by submitting bugs or suggesting improvements by
[opening an issue on GitHub](https://github.com/lmammino/scrobbles/issues).

## License

Licensed under [MIT License](LICENSE). © Luciano Mammino.

