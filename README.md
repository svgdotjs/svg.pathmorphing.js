# svg.pathmorphing.js

A plugin for the [svgjs](https://github.com/svgdotjs/svg.js) library to enable path morphing / animation

The code of this plugin will move to the core when it's out of experimental status and shortened (to much space for one feature).

## Install

Install via npm:

	$ npm install svg.js svg.pathmorphing.js

Or download the plugin from the github project:
[https://github.com/svgdotjs/svg.pathmorphing.js.git](https://github.com/svgdotjs/svg.pathmorphing.js.git).

## Load

To use plugin directly in a web page include after the SVG.js library:

```html
<!DOCTYPE HTML>
<html>
<head>
  <script src="scripts/svg.js"></script>
  <script src="scripts/svg.pathmorphing.js"></script>
</head>
<body>
  <script type="text/javascript">
    // ... your SVG script
  </script>
</body>
</html>
```

or as a module:

```js
const SVG = require('svg.js')
require('svg.pathmorphing.js')

// ... your SVG script
```

## Use

The use is similar to all other animation explained in the svg.js docs:

```javascript
var draw = SVG('drawing').viewbox(0, 0, 300, 300)

// create path
var path = draw.path('M150 0 L75 200 L225 200 Z')

// animate path
path.animate().plot('M100 0 H190 V90 H100 Z')

```

Pretty straight forward, isn't it?

## Dependencies
This module requires svg.js >= v2.1.1
