export function polarPosition(x:number,y:number):[number,number]{return [Math.hypot(x,y),(Math.atan2(y,x)*180/Math.PI+360)%360];}
export function cartesianPosition(r:number,theta:number):[number,number]{const a=((theta%360+360)%360)*Math.PI/180;return [r*Math.cos(a),r*Math.sin(a)];}
