import { PathArray, Stepper } from '@svgdotjs/svg.js'

declare module '@svgdotjs/svg.js' {
  interface Stepper {
    step(
      from: number,
      to: number,
      pos: number,
      context: any,
      allContexts: any[],
    ): number
  }

  interface PathArray {
    morph(
      fromArray: any[],
      toArray: any[],
      pos: number,
      stepper: Stepper,
      context: any[],
    ): PathArray
  }
}

export {}
