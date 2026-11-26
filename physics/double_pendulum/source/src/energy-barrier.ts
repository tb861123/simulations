import {energy,type State,type Params} from './physics.ts';
// V=-A cos(theta1)-B cos(theta2). Minimise V on each inversion surface.
export function energyBarrier(s:State,p:Params){
 const A=(p.m1+p.m2)*p.g*p.l1,B=p.m2*p.g*p.l2,E=energy(s,p).total;
 const first=A-B,second=B-A,threshold=Math.min(first,second);
 const margin=64*Number.EPSILON*Math.max(1,Math.abs(E),A+B);
 const inside=Math.abs(s[0])<=Math.PI&&Math.abs(s[1])<=Math.PI;
 return {energy:E,firstThreshold:first,secondThreshold:second,threshold,
  firstForbidden:inside&&E<first-margin,secondForbidden:inside&&E<second-margin,
  neitherCanFlip:inside&&E<threshold-margin};
}
