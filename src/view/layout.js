/** Odd-row honeycomb with logical columns running across the screen.
 * Pointy hexes stay upright, so each field uses its width as columns and
 * sits wider than it is tall. Puzzle cells stay in their original order. */
const HEX_RATIO=2/Math.sqrt(3);

function span(width,height){
  return {columns:width+.5,rows:1+(height-1)*.75};
}

export function boardFrame(width,height){
  const {columns,rows}=span(width,height);
  return {
    aspect:columns/(rows*HEX_RATIO),
    hexWidth:`${100/columns}%`,
    hexHeight:`${100/rows}%`
  };
}

export function cellStyle(cell,width,height){
  const row=Math.floor(cell/width),col=cell%width;
  const {columns,rows}=span(width,height);
  return {
    left:`${(col+(row%2)*.5)/columns*100}%`,
    top:`${row*.75/rows*100}%`,
    '--cell-i':row*width+col
  };
}

/** Center in units where a pointy hex is 1 wide and HEX_RATIO tall. */
export function cellCenter(cell,width){
  const row=Math.floor(cell/width),col=cell%width;
  return {
    x:col+(row%2)*.5+.5,
    y:(row*.75+.5)*HEX_RATIO
  };
}

/** Visual row runs down the phone. Visual column runs across it. */
export function placeLabel(cell,width){
  const row=Math.floor(cell/width),col=cell%width;
  return `row ${row+1}, column ${col+1}`;
}
