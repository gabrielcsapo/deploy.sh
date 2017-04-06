const test = require('tape');
const events = require('../lib/events');

test('events', (t) => {
  t.plan(1);

  t.test('should get back an event emitter', (t) => {
    t.equal(events.constructor.name, 'EventEmitter');
  });

  t.end();
});
