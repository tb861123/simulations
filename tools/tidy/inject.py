# usage: inject.py <sim.html> '<json config>'   (writes the file in place; idempotent)
#        inject.py <sim.html> --typein-only     (just the type-a-value-into-a-slider add-on, no tidy layout)
import sys, json, re, os
D=os.path.dirname(os.path.abspath(__file__))
f = sys.argv[1]; only = sys.argv[2] == '--typein-only'
s=open(f, encoding='utf-8').read()
s=re.sub(r'\n<script id="typeinJs">.*?</script>', '', s, flags=re.S)
if not only:
    cfg = json.loads(sys.argv[2])
    s=re.sub(r'\n<style id="tidyCss">.*?</style>', '', s, flags=re.S)
    s=re.sub(r'\n<script id="tidyCfg">.*?</script>\n<script id="tidyJs">.*?</script>', '', s, flags=re.S)
    css=open(D+'/tidy.css', encoding='utf-8').read(); js=open(D+'/tidy.js', encoding='utf-8').read()
    i=s.rindex('</head>'); s=s[:i]+'<style id="tidyCss">'+css+'</style>\n'+s[i:]
    i=s.rindex('</body>')
    s=s[:i]+'<script id="tidyCfg">window.TIDY = '+json.dumps(cfg, ensure_ascii=False)+';</script>\n<script id="tidyJs">'+js+'</script>\n'+s[i:]
tj=open(D+'/typein.js', encoding='utf-8').read()
i=s.rindex('</body>'); s=s[:i]+'<script id="typeinJs">'+tj+'</script>\n'+s[i:]
open(f,'w', encoding='utf-8').write(s); print('typein only' if only else 'tidied', f)
