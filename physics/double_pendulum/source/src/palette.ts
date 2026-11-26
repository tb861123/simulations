function channel(n:number,hue:number,l:number,chroma:number){const k=(n+hue*12)%12;return Math.round(255*(l-chroma*Math.max(-1,Math.min(k-3,9-k,1))));}
// Violet, indigo, blue, green, yellow, orange, red; linear time anchors.
export function roygbiv(q:number):[number,number,number]{const stops=[[148,0,211],[75,0,130],[0,0,255],[0,255,0],[255,255,0],[255,127,0],[255,0,0]],x=Math.max(0,Math.min(1,q))*6,i=Math.min(5,Math.floor(x)),f=x-i;return stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*f)) as [number,number,number];}
// The requested zero-time anchor is blue (violet/indigo are between blue and green).
export function flipSpectrum(q:number):[number,number,number]{const stops=[[0,[0,0,255]],[1/12,[75,0,130]],[1/6,[148,0,211]],[.5,[0,255,0]],[2/3,[255,255,0]],[5/6,[255,127,0]],[1,[255,0,0]]] as const;const x=Math.max(0,Math.min(1,q));let i=0;while(i<stops.length-2&&x>stops[i+1][0])i++;const [a,c]=stops[i],[b,d]=stops[i+1],f=(x-a)/(b-a);return c.map((v,k)=>Math.round(v+(d[k]-v)*f)) as [number,number,number];}
export const flipScale=(fraction:number,palette:string)=>palette==='ROYGBIV'?fraction:fraction*fraction;
export function writeRGB(a:number,b:number,palette:string,out:Uint8ClampedArray|number[],o=0) {
 const h=((a+.8*Math.sin(b))/(2*Math.PI)%1+1)%1;
 if(palette==='ROYGBIV'){const c=roygbiv(h);out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];return;}
 const l=palette==='Spectrum'?.48+.16*Math.sin(b):.45+.18*Math.cos(h*Math.PI*2)+.07*Math.sin(b),s=palette==='Ember'?.88:.72;
 const hue=palette==='Ember'? .055+.05*Math.sin(h*Math.PI*2):palette==='Ocean'?.57+.07*Math.sin(h*Math.PI*2):h;
 const chroma=s*Math.min(l,1-l);out[o]=channel(0,hue,l,chroma);out[o+1]=channel(8,hue,l,chroma);out[o+2]=channel(4,hue,l,chroma);
}
export function rgb(a:number,b:number,palette:string):[number,number,number]{const out:[number,number,number]=[0,0,0];writeRGB(a,b,palette,out);return out;}
export function writeFlipRGB(t:number,max:number,out:Uint8ClampedArray|number[],o=0,palette='Spectrum'){if(t<0){out[o]=232;out[o+1]=237;out[o+2]=239;return;}if(palette==='ROYGBIV'){const c=flipSpectrum(t/max);out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];return;}const q=Math.sqrt(Math.min(1,t/max));writeRGB((.72-q*.72)*Math.PI*2,0,palette,out,o);}
export function flipRGB(t:number,max:number,palette='Spectrum'):[number,number,number]{const out:[number,number,number]=[0,0,0];writeFlipRGB(t,max,out,0,palette);return out;}
export function growthRGB(g:number,palette='Spectrum'):[number,number,number]{return rgb((.72-Math.max(0,Math.min(8,g))/8*.72)*Math.PI*2,0,palette);}
export function driftRGB(d:number,palette='Spectrum'):[number,number,number]{if(!Number.isFinite(d)||d>.1)return [255,70,170];const q=Math.max(0,Math.min(1,(Math.log10(Math.max(d,1e-8))+8)/7));return rgb((.65-q*.65)*Math.PI*2,0,palette);}

