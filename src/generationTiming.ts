/**
 * Timing only: counts characters emitted by the streaming interface.
 * A string chunk is NOT necessarily one tokenizer token. Reporting
 * "tokens/sec" from chunk events would be misleading.
 */
export type GenerationTiming={
  elapsedMs:number;firstTextMs:number|null;
  emittedCharacters:number;charactersPerSecond:number;
};
export class GenerationMeter{
  private first:number|null=null;
  private chars=0;
  private readonly begunAt:number;
  constructor(begunAt:number){this.begunAt=begunAt;}
  noteText(text:string,now:number):void{
    if(!text)return;
    if(this.first===null)this.first=now;
    this.chars+=text.length;
  }
  result(now:number):GenerationTiming{
    const elapsed=Math.max(0,now-this.begunAt);
    return {
      elapsedMs:Math.round(elapsed),
      firstTextMs:this.first===null?null:Math.round(Math.max(0,this.first-this.begunAt)),
      emittedCharacters:this.chars,
      charactersPerSecond:elapsed>0?Number((this.chars*1000/elapsed).toFixed(1)):0
    };
  }
}
export function formatGenerationTiming(timing:GenerationTiming):string{
  const first=timing.firstTextMs===null?'no text received'
    :(timing.firstTextMs/1000).toFixed(1)+' s until first text';
  return first+'; '+(timing.elapsedMs/1000).toFixed(1)+' s total; '+
    timing.charactersPerSecond.toFixed(1)+' characters/s end-to-end.';
}
