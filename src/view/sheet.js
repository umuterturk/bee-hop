export function createSheetLibrary({load,slice}){
  let sheet=null
  const frames=new Map()

  function open(src){
    if(sheet?.src===src)return sheet.pending
    let pending
    pending=Promise.resolve()
      .then(()=>load(src))
      .then(image=>{
        if(!image)throw new Error('Sprite sheet failed to load')
        return image
      })
      .catch(error=>{
        if(sheet?.pending===pending)sheet=null
        throw error
      })
    sheet={src,pending}
    return pending
  }

  function frame(src,name,box){
    const id=`${src}\0${name}`
    const existing=frames.get(id)
    if(existing)return existing.promise
    const entry={url:'',promise:null}
    entry.promise=open(src)
      .then(image=>slice(image,box))
      .then(url=>{
        entry.url=url
        return url
      })
      .catch(error=>{
        if(frames.get(id)===entry)frames.delete(id)
        throw error
      })
    frames.set(id,entry)
    return entry.promise
  }

  function peek(src,name){
    return frames.get(`${src}\0${name}`)?.url||''
  }

  return {frame,peek}
}
