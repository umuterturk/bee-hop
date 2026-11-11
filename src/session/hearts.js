export const HEART_CAP=3
export const HEART_REFILL_MS=30*60*1000

export function freshHearts(){
  return {count:HEART_CAP,nextAt:null}
}
export function refillHearts(hearts,now){
  if(!hearts||!Number.isInteger(hearts.count))return freshHearts()
  let count=Math.min(HEART_CAP,Math.max(0,hearts.count))
  if(count>=HEART_CAP)return freshHearts()
  let nextAt=Number.isInteger(hearts.nextAt)?hearts.nextAt:now+HEART_REFILL_MS
  while(count<HEART_CAP&&now>=nextAt){
    count+=1
    nextAt+=HEART_REFILL_MS
  }
  if(count>=HEART_CAP)return freshHearts()
  return {count,nextAt}
}
export function spendHeart(hearts,now){
  const current=refillHearts(hearts,now)
  if(current.count<=0)return current
  return {count:current.count-1,nextAt:current.nextAt??now+HEART_REFILL_MS}
}
export function heartWait(hearts,now){
  const current=refillHearts(hearts,now)
  if(current.nextAt==null)return ''
  const total=Math.max(0,Math.ceil((current.nextAt-now)/1000))
  const minutes=Math.floor(total/60)
  const seconds=total%60
  return `${minutes}:${String(seconds).padStart(2,'0')}`
}
