export const palettes=[
 {id:'soft',name:'Soft coastal',stops:['#79aaa4','#a6b9cc','#c5a9b8']},
 {id:'ocean',name:'Ocean blues',stops:['#608d9e','#8cb8bd','#b6cbd7']},
 {id:'forest',name:'Sage & moss',stops:['#6e9282','#a3b69a','#d0c9a7']},
 {id:'dusk',name:'Lavender dusk',stops:['#858cae','#b0a1c2','#d0b7be']},
 {id:'earth',name:'Warm earth',stops:['#a17e70','#c3a18c','#d2c5a5']},
 {id:'slate',name:'Slate monochrome',stops:['#64778b','#99a9ba','#d3dbe2']},
] as const;
export function schemeColour(id:string,t:number){
 const stops=(palettes.find(p=>p.id===id)??palettes[0]).stops;
 const scaled=Math.max(0,Math.min(1,t))*(stops.length-1),i=Math.min(stops.length-2,Math.floor(scaled)),f=scaled-i;
 return '#'+[1,3,5].map(k=>Math.round(parseInt(stops[i].slice(k,k+2),16)*(1-f)+parseInt(stops[i+1].slice(k,k+2),16)*f).toString(16).padStart(2,'0')).join('');
}
export function recolour<T extends {color?:string}>(magnets:T[],id:string):T[]{return magnets.map((m,i)=>({...m,color:schemeColour(id,magnets.length===1?.5:i/(magnets.length-1))}));}
export function schemeGradient(id:string){return `linear-gradient(90deg,${[0,.25,.5,.75,1].map(t=>schemeColour(id,t)).join(',')})`;}
