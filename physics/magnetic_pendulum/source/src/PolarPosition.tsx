import {useEffect,useState} from 'react';
import {polarPosition,cartesianPosition} from './polar';
export function PolarPosition({label,x,y,maxRadius,onChange}:{label:string;x:number;y:number;maxRadius?:number;onChange:(x:number,y:number)=>void}){
 const [r,theta]=polarPosition(x,y),[radius,setRadius]=useState(String(r)),[angle,setAngle]=useState(String(theta));
 useEffect(()=>{setRadius(String(r));setAngle(String(theta));},[r,theta]);
 function commit(key:'r'|'theta'){
  const text=key==='r'?radius:angle,parsed=text.trim()===''?NaN:Number(text);
  const next=Number.isFinite(parsed)?parsed:key==='r'?r:theta;
  if(next===(key==='r'?r:theta)){setRadius(String(r));setAngle(String(theta));return;}
  const rr=key==='r'?Math.max(0,Math.min(maxRadius??Infinity,next)):r;
  const aa=key==='theta'?((next%360)+360)%360:theta;
  setRadius(String(rr));setAngle(String(aa));onChange(...cartesianPosition(rr,aa));
 }
 return <div className="fields"><label className="field"><span>{label} r <small>m</small></span><input aria-label={`${label} r`} type="number" step="any" min={0} max={maxRadius} value={radius} onChange={e=>setRadius(e.target.value)} onBlur={()=>commit('r')} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label><label className="field"><span>{label} θ <small>degrees</small></span><input aria-label={`${label} theta`} type="number" step="any" value={angle} onChange={e=>setAngle(e.target.value)} onBlur={()=>commit('theta')} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label></div>;
}
