/** Portrait view of the odd-row honeycomb. Logical columns run down the
 * screen and logical rows run across it, so a 7 by 5 field draws 7 tall
 * and 5 wide. Puzzle cells stay in their original order. */
const HEX_RATIO=2/Math.sqrt(3);

function span(width,height){
  return {columns:width+.5,rows:1+(height-1)*.75};
}

export function boardFrame(width,height){
  const {columns,rows}=span(width,height);
  return {
    aspect:(rows*HEX_RATIO)/columns,
    hexWidth:`${100/rows}%`,
    hexHeight:`${100/columns}%`
  };
}

export function cellStyle(cell,width,height){
  const row=Math.floor(cell/width),col=cell%width;
  const {columns,rows}=span(width,height);
  return {
    left:`${row*.75/rows*100}%`,
    top:`${(col+(row%2)*.5)/columns*100}%`,
    '--cell-i':row*width+col
  };
}

/** Center in units where a flat hex is HEX_RATIO wide and 1 tall. */
export function cellCenter(cell,width){
  const row=Math.floor(cell/width),col=cell%width;
  return {
    x:(row*.75+.5)*HEX_RATIO,
    y:col+(row%2)*.5+.5
  };
}

/** Visual row runs down the phone. Visual column runs across it. */
export function placeLabel(cell,width){
  const row=Math.floor(cell/width),col=cell%width;
  return `row ${col+1}, column ${row+1}`;
}
