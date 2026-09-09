# svg.pathmorphing.js

A plugin for [svg.js](https://github.com/svgdotjs/svg.js) to enable path morphing / animation.

It synchronizes two paths with different commands or command counts (e.g. `H`/`V` shorthand, quadratic curves or elliptical arcs) and interpolates between them.

> Requires [svg.js](https://github.com/svgdotjs/svg.js) >= v3.2.0.

## Install

```bash
$ npm install @svgdotjs/svg.js @svgdotjs/svg.pathmorphing.js
```

## Load

As a module (ESM):

```js
import { SVG, Spring } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.pathmorphing.js'

// ... your SVG script
```

Or as a classic script (global build), directly in a web page after the SVG.js library:

```html
<script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js/dist/svg.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.pathmorphing.js/dist/svg.pathmorphing.js"></script>
```

A bundle is also attached to every [release](https://github.com/svgdotjs/svg.pathmorphing.js/releases).

## Use

The use is similar to all other animation explained in the [svg.js docs](https://svgjs.dev/docs/3.2/):

```js
var draw = SVG('drawing').viewbox(0, 0, 300, 300)

// create path
var path = draw.path('M150 0 L75 200 L225 200 Z')

// animate path
path.animate(500).ease('<>').plot('M100 0 H190 V90 H100 Z')
```

Because the plugin registers a custom `morph` on `PathArray`, it also works with [controllers](https://svgjs.dev/docs/3.2/animating/#controllers) for continuous morphing:

```js
path.animate(new Spring(700)).plot('M100 0 L100 200 L200 200 Z')
```

## Development

```bash
$ pnpm install
$ pnpm test              # run the test suite (node:test + svgdom)
$ pnpm lint              # check formatting + lint
$ pnpm fix               # auto-fix both
$ pnpm build             # build dist/
$ pnpm demo              # vite dev server for the demo
```

The source lives in `src/`; `dist/` is generated and not committed. The demo
covers scrubbing, H/V shorthand, quadratic and arc morphs, subpath mismatches
and continuous retargeting with a Spring controller.

## Releases

`pnpm publish` runs `prepublishOnly`, which builds `dist/` and packages
`dist/svg.pathmorphing.js.zip` (LICENSE, README and the global build). Attach
that zip to the GitHub release.
