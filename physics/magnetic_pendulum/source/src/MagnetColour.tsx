import {useEffect,useState} from 'react';
import {parseColour} from './magnet-colour';
export function MagnetColour({label,value,onChange}:{label:string;value:string;onChange:(color:string)=>void}){
 const [text,setText]=useState(value),[error,setError]=useState('');
 useEffect(()=>{setText(value);setError('');},[value]);
 function commit(){const color=parseColour(text);if(color){onChange(color);setText(color);setError('');}else setError('Enter Hex (#12ab34) or RGB (18, 171, 52), with channels from 0 to 255.');}
 return <details className="magnet-colour"><summary><span style={{display:'inline-block',width:16,height:16,background:value,marginRight:8,border:'1px solid #8797af'}}/>Choose colour · {value}</summary><div className="section-content"><label className="field"><span>{label} spectrum</span><input aria-label={`${label} spectrum`} type="color" value={value} onChange={e=>onChange(e.target.value)}/></label><label className="field"><span>Hex or RGB</span><input aria-label={`${label} Hex or RGB`} value={text} onChange={e=>setText(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}}}/></label><p className="help">RGB: {value.slice(1).match(/../g)!.map(c=>parseInt(c,16)).join(', ')}. Click the swatch to open the spectrum picker.</p>{error&&<p role="alert" className="amber">{error}</p>}</div></details>;
}
