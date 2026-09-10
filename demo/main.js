import { SVG, Morphable, PathArray, Ease, Spring } from '@svgdotjs/svg.js'
import '../src/svg.pathmorphing.js'

// ---- scenarios ---------------------------------------------------------

const blobA = 'M150 60 L250 110 L260 190 L180 260 L80 240 L60 150 Z'
const blobB = 'M150 90 L220 60 L280 150 L260 230 L120 250 L70 120 Z'

const scenarios = [
  {
    name: 'Blob morph (issue #9)',
    from: blobA,
    to: blobB,
    spring: true
  },
  {
    name: 'H / V shorthand',
    from: 'M150 0 L75 200 L225 200 Z',
    to: 'M100 0 H190 V90 H100 Z',
    spring: false
  },
  {
    name: 'Quadratic → quadratic',
    from: 'M30 150 Q120 40 210 150',
    to: 'M30 150 Q150 250 210 150',
    spring: false
  },
  {
    name: 'Elliptical arc → cubic bezier',
    from: 'M30 150 A50 50 0 0 1 270 150',
    to: 'M30 150 A60 40 15 1 1 270 150',
    spring: false
  },
  {
    name: 'Subpath count mismatch',
    from: 'M40 60 L110 60 L110 130 L40 130 Z M160 200 L230 200 L230 270 L160 270 Z',
    to: 'M100 60 L200 60 L200 140 L100 140 Z',
    spring: false
  },
  {
    name: 'Line rectangle → curved blob',
    from: 'M40 40 L260 40 L260 260 L40 260 Z',
    to: 'M40 40 Q260 40 260 260 L40 260 Z',
    spring: false
  }
]

// ---- canvas ------------------------------------------------------------

const draw = SVG('#scene').viewbox(0, 0, 300, 300)

// grid backdrop
const grid = draw
  .group()
  .fill('none')
  .stroke('#262b33')
  .attr('stroke-width', 0.5)
for (let i = 30; i < 300; i += 30) {
  grid.line(0, i, 300, i).attr('stroke-dasharray', '2 4')
  grid.line(i, 0, i, 300).attr('stroke-dasharray', '2 4')
}

const path = draw
  .path()
  .fill('rgba(77,163,255,.12)')
  .stroke('#4da3ff')
  .attr('stroke-width', 3)
  .attr('stroke-linecap', 'round')
  .attr('stroke-linejoin', 'round')

const startDot = draw.circle(8).fill('#ff6b6b')
const endDot = draw.circle(8).fill('#52d273')

// ---- helpers -----------------------------------------------------------

function flat(d) {
  return new PathArray(d).toArray()
}

let current = null
let currentScenario = scenarios[0]
let springRunner = null
let playing = false

function rebuildMorphable() {
  current = new Morphable(new Ease('<>'))
    .type(PathArray)
    .from(flat(currentScenario.from))
    .to(flat(currentScenario.to))
}

const dAttr = document.getElementById('dAttr')
const status = document.getElementById('status')

function setPath(d) {
  path.plot(d)
  dAttr.textContent = 'd="' + path.attr('d').trim() + '"'
}

function scrub(pos) {
  setPath(current.at(pos))
}

function markEndpoints(d) {
  const arr = new PathArray(d)
  const first = arr[0]
  startDot.cx(first[1]).cy(first[2])
  const last = arr[arr.length - 1]
  if (last.length > 2) {
    endDot.cx(last[last.length - 2]).cy(last[last.length - 1])
  }
}

function randomBlob(cx, cy) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    pts.push(
      (cx + (Math.random() - 0.5) * 120).toFixed(0) +
        ' ' +
        (cy + (Math.random() - 0.5) * 120).toFixed(0)
    )
  }
  return 'M' + pts.join(' L') + ' Z'
}

// ---- controls ----------------------------------------------------------

const scene = document.getElementById('scene')
const posEl = document.getElementById('pos')
const posLabel = document.getElementById('posLabel')
const playBtn = document.getElementById('play')
const reverseBtn = document.getElementById('reverse')
const springEl = document.getElementById('spring')

const scenariosEl = document.getElementById('scenarios')
scenarios.forEach((s, i) => {
  const b = document.createElement('button')
  b.textContent = s.name
  b.addEventListener('click', () => selectScenario(i))
  scenariosEl.appendChild(b)
})

function selectScenario(i) {
  currentScenario = scenarios[i]
  playing = false
  playBtn.textContent = '▶ Play morph'
  Array.prototype.forEach.call(scenariosEl.children, (b, j) => {
    b.className = j === i ? 'active' : ''
  })
  springEl.checked = currentScenario.spring
  rebuildMorphable()
  posEl.value = 0
  scrub(0)
  markEndpoints(currentScenario.from)
  status.textContent = 'scenario: ' + currentScenario.name
}

posEl.addEventListener('input', () => {
  if (!current) return
  playing = false
  playBtn.textContent = '▶ Play morph'
  const p = Number(posEl.value) / 100
  posLabel.textContent = Math.round(p * 100) + '%'
  scrub(p)
})

playBtn.addEventListener('click', () => {
  if (!current) return
  playing = !playing
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play morph'
  if (!playing) return

  const from = currentScenario.from
  const to = currentScenario.to
  const runner = path.animate(1200).ease('<>')
  runner.plot(to)

  runner.after(() => {
    if (!playing) return
    // ping-pong
    const next = path.animate(1200).ease('<>')
    next.plot(from)
    next.after(() => {
      if (playing) playBtn.click()
    })
  })
})

reverseBtn.addEventListener('click', () => {
  if (!current) return
  playing = false
  playBtn.textContent = '▶ Play morph'
  posEl.value = 0
  posLabel.textContent = '0%'
  scrub(0)
})

springEl.addEventListener('change', () => {
  status.textContent = springEl.checked
    ? 'spring mode: click the canvas to retarget mid-flight'
    : 'ready'
})

// continuous retarget on canvas click (issue #9 style)
const viewBox = draw.viewbox()
const w = viewBox.width
const h = viewBox.height

scene.addEventListener('click', (e) => {
  if (!current || !springEl.checked) return
  const rect = scene.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * w
  const y = ((e.clientY - rect.top) / rect.height) * h

  if (!springRunner) {
    springRunner = path.animate(new Spring(900))
    springRunner.plot(currentScenario.from)
  }
  const target = randomBlob(x, y)
  springRunner.plot(target)
  currentScenario = {
    name: 'continuous retarget',
    from: currentScenario.from,
    to: target,
    spring: true
  }
  status.textContent = 'spring mode: click the canvas to retarget mid-flight'
})

// ---- init --------------------------------------------------------------

selectScenario(0)
