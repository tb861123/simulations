import {wrap,type Params,type State} from './physics.ts';
export function stateEnergy(s:Float64Array|State,o:number,p:Params){const a=s[o],b=s[o+1],u=s[o+2],v=s[o+3];return .5*(p.m1+p.m2)*p.l1*p.l1*u*u+.5*p.m2*p.l2*p.l2*v*v+p.m2*p.l1*p.l2*u*v*Math.cos(a-b)-(p.m1+p.m2)*p.g*p.l1*Math.cos(a)-p.m2*p.g*p.l2*Math.cos(b);}
export function separation(a:Float64Array|State,b:Float64Array|State,o:number,p:Params){const omega=Math.sqrt(p.g/p.l1);return Math.hypot(wrap(b[o]-a[o]),wrap(b[o+1]-a[o+1]),(b[o+2]-a[o+2])/omega,(b[o+3]-a[o+3])/omega);}
export function growth(a:Float64Array,b:Float64Array,o:number,p:Params,epsilon:number){return Math.log10(Math.max(separation(a,b,o,p),1e-300)/epsilon);}

