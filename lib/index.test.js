import t from 'tap'
import { RecentTracks } from './index.js'

t.test('it workz', async function (t) {
  t.pass('This is fine 🐶🔥')
  t.ok(new RecentTracks({
    apikey: 'somekey',
    user: 'someuser'
  }))
  t.equal(2 + 2, 4)
})
