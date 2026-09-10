import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHTMLWindow } from 'svgdom'
import {
  registerWindow,
  PathArray,
  Ease,
  Spring,
  Morphable,
  SVG,
} from '@svgdotjs/svg.js'
import '../src/svg.pathmorphing.js'

const win = createHTMLWindow()
registerWindow(win, win.document)

function flat(path) {
  return new PathArray(path).toArray()
}

function morphAt(from, to, pos, stepper = new Ease('-')) {
  return new PathArray().morph(flat(from), flat(to), pos, stepper, [])
}

function near(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} to be near ${b}`)
}

function lettersOf(res) {
  return Array.from(res).map((c) => c[0])
}

test('parses and interpolates two matching L paths', () => {
  const res = morphAt(
    'M10 10 L100 10 L100 100 Z',
    'M50 50 L150 50 L150 150 Z',
    0.5,
  )
  assert.deepEqual(Array.from(res[0]), ['M', 30, 30])
  assert.deepEqual(Array.from(res[1]), ['L', 125, 30])
  assert.deepEqual(Array.from(res[2]), ['L', 125, 125])
})

test('morph at pos 0 returns the from path (shorthand normalized)', () => {
  const res = morphAt(
    'M10 10 L100 10 L100 100 Z',
    'M50 50 L150 50 L150 150 Z',
    0,
  )
  // Z is expanded to an explicit closing L by the alignment
  assert.deepEqual(Array.from(res[0]), ['M', 10, 10])
  assert.deepEqual(Array.from(res[3]), ['L', 10, 10])
})

test('morph at pos 1 returns the to path (shorthand normalized)', () => {
  const res = morphAt(
    'M10 10 L100 10 L100 100 Z',
    'M50 50 L150 50 L150 150 Z',
    1,
  )
  assert.deepEqual(Array.from(res[0]), ['M', 50, 50])
  assert.deepEqual(Array.from(res[3]), ['L', 50, 50])
})

test('synchronizes shorthand H and V commands', () => {
  const res = morphAt(
    'M150 0 L75 200 L225 200 Z',
    'M100 0 H190 V90 H100 Z',
    0.5,
  )
  // all command letters must match so the result is a valid path
  assert.deepEqual(lettersOf(res), ['M', 'L', 'L', 'L', 'C'])
  // halfway between the two corner points
  assert.deepEqual(Array.from(res[1]), ['L', 132.5, 100])
})

test('interpolates quadratic commands directly when types match', () => {
  const res = morphAt('M0 0 Q50 0 100 0', 'M0 0 Q40 -40 100 0', 0.5)
  assert.equal(res[1][0], 'Q')
  near(res[1][1], 45)
  near(res[1][2], -20)
})

test('converts elliptical arc commands to cubic bezier', () => {
  const res = morphAt('M0 0 A40 40 0 0 1 80 0', 'M0 0 A40 40 0 1 1 80 0', 0.5)
  assert.ok(
    lettersOf(res).includes('C'),
    'arc should be converted to cubic beziers',
  )
})

test('morphs multiple subpaths', () => {
  const res = morphAt(
    'M10 10 L20 20 Z M50 50 L60 60 Z',
    'M10 10 L20 20 Z M70 70 L80 80 Z',
    0.5,
  )
  const letters = lettersOf(res)
  assert.ok(letters.filter((l) => l === 'M').length >= 2, 'keeps both subpaths')
})

test('end to end time based animation drives the d attribute', () => {
  const draw = SVG().addTo(win.document.body).viewbox(0, 0, 300, 300)
  const path = draw.path('M150 0 L75 200 L225 200 Z')
  const runner = path.animate(500).ease('-')
  runner.plot('M100 0 H190 V90 H100 Z')

  let guard = 0
  while (!runner.done && guard++ < 1000) runner.step(16)
  assert.equal(
    path.attr('d').trim(),
    'M100 0L190 0L190 90L100 90C100 90 100 0 100 0',
  )
})

test('continuous morphing with Spring converges to the destination', () => {
  const draw = SVG().addTo(win.document.body).viewbox(0, 0, 300, 300)
  const path = draw.path('M150 0 L75 200 L225 200 Z')
  const runner = path.animate(new Spring(700))
  runner.plot('M100 0 L100 200 L200 200 Z')

  let guard = 0
  while (!runner.done && guard++ < 2000) {
    runner.step(16)
    assert.ok(
      typeof path.attr('d') === 'string' && path.attr('d').length > 0,
      'd attribute stays valid',
    )
  }
  assert.ok(guard < 2000, 'spring animation converges')
  assert.equal(path.attr('d').trim(), 'M100 0L100 200L200 200L100 0')
})

test('chained morphs run sequentially on one timeline', () => {
  const draw = SVG().addTo(win.document.body).viewbox(0, 0, 300, 300)
  const path = draw.path('M150 0 L75 200 L225 200 Z')
  path.animate(200).ease('-').plot('M100 0 L100 200 L200 200 Z')
  path.animate(200).ease('-').plot('M200 100 L100 0 L300 0 Z')

  const tl = path.timeline()
  tl.time(0)
  for (let i = 1; i <= 40; i++) tl.time(i * 100)
  // after both 200ms morphs are done the last destination is reached
  assert.equal(path.attr('d').trim(), 'M200 100L100 0L300 0L200 100')
})

test('Morphable drives the custom morph', () => {
  const m = new Morphable(new Ease('-'))
    .type(PathArray)
    .from(flat('M0 0 L100 0'))
    .to(flat('M0 0 L200 0'))
  const res = m.at(0.5)
  assert.deepEqual(Array.from(res[1]), ['L', 150, 0])
})

test('shorthand S right after M mirrors the current point', () => {
  const res = morphAt('M0 0 S10 10 20 20', 'M0 0 S30 30 40 40', 0)
  // no previous curve, so the first control point sits on the current point
  assert.deepEqual(Array.from(res[1]), ['C', 0, 0, 10, 10, 20, 20])
})

test('shorthand T right after M mirrors the current point', () => {
  const res = morphAt('M0 0 T20 20', 'M0 0 T40 40', 0)
  assert.deepEqual(Array.from(res[1]), ['Q', 0, 0, 20, 20])
})

test('shorthand T mirrors the preceding quadratic control point', () => {
  const res = morphAt('M0 0 Q10 10 20 0 T40 0', 'M0 0 Q10 20 20 0 T40 0', 0)
  // reflection of (10, 10) through the current point (20, 0)
  assert.deepEqual(Array.from(res[2]), ['Q', 30, -10, 40, 0])
})

test('shorthand S mirrors the preceding cubic control point', () => {
  const res = morphAt(
    'M0 0 C0 10 10 10 10 0 S30 -10 30 0',
    'M0 0 C0 20 10 20 10 0 S30 -20 30 0',
    0,
  )
  // reflection of (10, 10) through the current point (10, 0)
  assert.deepEqual(Array.from(res[2]), ['C', 10, -10, 30, -10, 30, 0])
})

test('Spring reaches the destination when aligning grows the path', () => {
  const draw = SVG().addTo(win.document.body).viewbox(0, 0, 300, 300)
  const path = draw.path('M0 0 L10 10')
  // the arc expands to several cubics, so the aligned path needs far more
  // stepper contexts than svg.js allocated from the two line segments
  const runner = path.animate(new Spring(300)).plot('M0 0 A50 50 0 1 1 100 100')

  let guard = 0
  while (!runner.done && guard++ < 5000) runner.step(16)

  assert.ok(guard < 5000, 'spring animation converges')
  const last = new PathArray(path.attr('d')).pop()
  near(last[5], 100, 1e-9)
  near(last[6], 100, 1e-9)
})

test('reuses the alignment across frames but not across destinations', () => {
  const morphObj = new PathArray()
  const from = flat('M10 10 L100 10 L100 100 Z')

  const a = morphObj.morph(
    from,
    flat('M50 50 L150 50 L150 150 Z'),
    1,
    new Ease('-'),
    [],
  )
  assert.deepEqual(Array.from(a[0]), ['M', 50, 50])

  // same instance, new destination: the cached alignment must be dropped
  const b = morphObj.morph(
    from,
    flat('M20 20 L80 20 L80 80 Z'),
    1,
    new Ease('-'),
    [],
  )
  assert.deepEqual(Array.from(b[0]), ['M', 20, 20])
  assert.deepEqual(Array.from(b[1]), ['L', 80, 20])
})

test('a running Spring can be retargeted mid flight', () => {
  const draw = SVG().addTo(win.document.body).viewbox(0, 0, 300, 300)
  const path = draw.path('M150 0 L75 200 L225 200 Z')
  const runner = path.animate(new Spring(900))

  // every target aligns to a different length, so the contexts svg.js handed
  // out have to be reused and regrown between destinations
  const targets = [
    'M100 0 L100 200 L200 200 Z',
    'M0 0 A50 50 0 1 1 100 100 A50 50 0 1 1 0 0 Z',
    'M20 20 L60 20 L60 60 L20 60 Z M120 120 L180 120 L180 180 Z',
    'M10 10 Q80 -40 150 10 T290 10',
  ]

  for (const target of targets) {
    const before = path.attr('d')
    runner.plot(target)

    let guard = 0
    while (!runner.done && guard++ < 4000) runner.step(16)
    assert.ok(guard < 4000, `spring converges on ${target}`)

    // the spring settles on the aligned destination
    const settled = flat(path.attr('d'))
    const wanted = morphAt(before, target, 1).toArray()
    assert.equal(settled.length, wanted.length)
    settled.forEach((v, i) => {
      if (typeof v === 'number') near(v, wanted[i], 1e-9)
      else assert.equal(v, wanted[i])
    })
  }
})
