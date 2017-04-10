SVG.extend(SVG.PathArray, {
  morph: function(array) {

    var startArr = this.value
      ,  destArr = this.parse(array)

    var startOffsetM = 0
      ,  destOffsetM = 0

    while(true){
      // stop if there is no M anymore
      if(startOffsetM === false && destOffsetM === false) break

      // find the next M in path array
      startOffsetNextM = findNextM(startArr, startOffsetM === false ? false : startOffsetM+1)
       destOffsetNextM = findNextM( destArr,  destOffsetM === false ? false :  destOffsetM+1)

      // We have to add one M to the startArray
      if(startOffsetM === false){
        var bbox = new SVG.PathArray(result.start).bbox()

        // when the last block had no bounding box we simply take the first M we got
        if(bbox.height == 0 || bbox.width == 0){
          startOffsetM =  startArr.push(startArr[0]) - 1
        }else{
          // we take the middle of the bbox instead when we got one
          startOffsetM = startArr.push( ['M', bbox.x + bbox.width/2, bbox.y + bbox.height/2 ] ) - 1
        }
      }

      // We have to add one M to the destArray
      if( destOffsetM === false){
        var bbox = new SVG.PathArray(result.dest).bbox()

        if(bbox.height == 0 || bbox.width == 0){
          destOffsetM =  destArr.push(destArr[0]) - 1
        }else{
          destOffsetM =  destArr.push( ['M', bbox.x + bbox.width/2, bbox.y + bbox.height/2 ] ) - 1
        }
      }

      // handle block from M to next M
      var result = handleBlock(startArr, startOffsetM, startOffsetNextM, destArr, destOffsetM, destOffsetNextM)

      // update the arrays to their new values
      startArr = startArr.slice(0, startOffsetM).concat(result.start, startOffsetNextM === false ? [] : startArr.slice(startOffsetNextM))
       destArr =  destArr.slice(0,  destOffsetM).concat(result.dest ,  destOffsetNextM === false ? [] :  destArr.slice( destOffsetNextM))

      // update offsets
      startOffsetM = startOffsetNextM === false ? false : startOffsetM + result.start.length
       destOffsetM =  destOffsetNextM === false ? false :  destOffsetM + result.dest.length

    }

    // copy back arrays
    this.value = startArr
    this.destination = destArr

    return this
  }
, at: function(pos) {
    // make sure a destination is defined
    if (!this.destination) return this

    // generate morphed path array
    for (var i = 0, il = this.value.length, array = []; i < il; ++i){

      // path array values have different length. so we need another loop
      for (var j = 1, len = this.value[i].length, el = [this.value[i][0]]; j < len; ++j) {

        el.push( this.value[i][j] + (this.destination[i][j] - this.value[i][j]) * pos )

      }

      array.push(el)
    }

    return new SVG.PathArray(array)
  }

})



// sorry for the long declaration
// slices out one block (from M to M) and syncronize it so the types and length match
function handleBlock(startArr, startOffsetM, startOffsetNextM, destArr, destOffsetM, destOffsetNextM, undefined){

  // slice out the block we need
  var startArrTemp = startArr.slice(startOffsetM, startOffsetNextM || undefined)
    ,  destArrTemp =  destArr.slice( destOffsetM,  destOffsetNextM || undefined)

  var i = 0
    , posStart = {pos:[0,0], start:[0,0]}
    , posDest  = {pos:[0,0], start:[0,0]}

  do{

    // convert shorthand types to long form
    startArrTemp[i] = simplyfy.call(posStart, startArrTemp[i])
     destArrTemp[i] = simplyfy.call(posDest ,  destArrTemp[i])

    // check if both shape types match
    if(startArrTemp[i][0] != destArrTemp[i][0] || startArrTemp[i][0] == 'M') {

      // if not, convert shapes to beziere
      startArrTemp[i] = toBeziere.call(posStart, startArrTemp[i])
       destArrTemp[i] = toBeziere.call(posDest ,  destArrTemp[i])

    } else {

      // only update positions otherwise
      startArrTemp[i] = setPosAndReflection.call(posStart, startArrTemp[i])
       destArrTemp[i] = setPosAndReflection.call(posDest ,  destArrTemp[i])

    }

    // we are at the end at both arrays. stop here
    if(++i == startArrTemp.length && i == destArrTemp.length) break

    // destArray is longer. Add one element
    if(i == startArrTemp.length){
      startArrTemp.push([
        'C',
        posStart.pos[0],
        posStart.pos[1],
        posStart.pos[0],
        posStart.pos[1],
        posStart.pos[0],
        posStart.pos[1],
      ])
    }

    // startArr is longer. Add one element
    if(i == destArrTemp.length){
      destArrTemp.push([
        'C',
        posDest.pos[0],
        posDest.pos[1],
        posDest.pos[0],
        posDest.pos[1],
        posDest.pos[0],
        posDest.pos[1]
      ])
    }


  }while(true)

  // return the updated block
  return {start:startArrTemp, dest:destArrTemp}
}

// converts shorthand types to long form
function simplyfy(val){

  switch(val[0]){
    case 'z': // shorthand line to start
    case 'Z':
      val[0] = 'L'
      val[1] = this.start[0]
      val[2] = this.start[1]
      break
    case 'H': // shorthand horizontal line
      val[0] = 'L'
      val[2] = this.pos[1]
      break
    case 'V': // shorthand vertical line
      val[0] = 'L'
      val[2] = val[1]
      val[1] = this.pos[0]
      break
    case 'T': // shorthand quadratic beziere
      val[0] = 'Q'
      val[3] = val[1]
      val[4] = val[2]
      val[1] = this.reflection[1]
      val[2] = this.reflection[0]
      break
    case 'S': // shorthand cubic beziere
      val[0] = 'C'
      val[6] = val[4]
      val[5] = val[3]
      val[4] = val[2]
      val[3] = val[1]
      val[2] = this.reflection[1]
      val[1] = this.reflection[0]
      break
  }

  return val

}

// updates reflection point and current position
function setPosAndReflection(val){

  var len = val.length

  this.pos = [ val[len-2], val[len-1] ]

  if('SCQT'.indexOf(val[0]) != -1)
    this.reflection = [ 2 * this.pos[0] - val[len-4], 2 * this.pos[1] - val[len-3] ]

  return val
}

// converts all types to cubic beziere
function toBeziere(val){

  switch(val[0]){
    case 'M': // special handling for M
      this.pos = this.start = [val[1], val[2]]
      return val
    case 'L':
      val[5] = val[3] = val[1]
      val[6] = val[4] = val[2]
      val[1] = this.pos[0]
      val[2] = this.pos[1]
      break
    case 'Q':
      val[6] = val[4]
      val[5] = val[3]
      val[4] = val[4] * 1/3 + val[2] * 2/3
      val[3] = val[3] * 1/3 + val[1] * 2/3
      val[2] = this.pos[1] * 1/3 + val[2] * 2/3
      val[1] = this.pos[0] * 1/3 + val[1] * 2/3
      break
    case 'A':
      throw new Error('Cant morph arcs to beziere')
      break
  }

  val[0] = 'C'
  this.pos = [val[5], val[6]]
  this.reflection = [2 * val[5] - val[3], 2 * val[6] - val[4]]

  return val

}

// finds the next position of type M
function findNextM(arr, offset){

  if(offset === false) return false

  for(var i = offset, len = arr.length;i < len;++i){

    if(arr[i][0] == 'M') return i

  }

  return false
}