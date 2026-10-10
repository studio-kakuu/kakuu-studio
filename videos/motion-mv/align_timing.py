import numpy as np, json, sys
D=sys.argv[1] if len(sys.argv)>1 else '.'
E=np.load(D+'/E.npy'); t=np.load(D+'/Et.npy')
lo,hi=np.percentile(E,20),np.percentile(E,98)
def v(a,b):
    m=(t>=a)&(t<b); return (E[m].mean()-lo)/(hi-lo) if m.any() else 0
g8=0.25; cells=np.arange(0.044,117.5,g8)
on=np.array([v(c-0.02,c+0.2) for c in cells]); pre=np.array([v(c-0.25,c-0.05) for c in cells])
strength=np.clip(on-pre,0,None)*0.7+np.clip(on,0,1)*0.3
LY={
'Intro':['Three','two','one','Animation Overdrive!'],
'Verse 1':'Fade In/Slide In/Pop In/Bounce/Slide Up/Slide Down/Slide Left/Slide Right/Zoom In/Blur In/Typewriter/Text Reveal/Mask Reveal/Stagger In/Count Up/Flip In X/Flip In Y/Split Reveal/Drop In/Spin In/Ink Splash/Glitch In/Line Drawing/Curtain Reveal/Wipe In/Iris In/Elastic In/Pixel In/Scramble Text/Letter Spacing'.split('/'),
'Pre-Chorus':'Fade Out/Slide Out/Shrink Out/Zoom Out/Blur Out/Flip Out/Drop Out/Spin Out/Wipe Out/Iris Out/Slice Out/Pixel Out/Evaporate/Cross Dissolve/Push/Zoom Pan/Whip Pan/Morphing/Parallax/Seamless Zoom'.split('/'),
'Chorus':'Pulse/Shake/Loop Bounce/Hover Scale/Shine/Ripple/Floating/Swing/Blink/Heartbeat/Glitch Loop/Spin/Gradient Shift/Neon Glow/Wave/Jello/Wobble/Rubber Band/Squash and Stretch/Breathing/Orbit/Marquee'.split('/'),
'Chorus2':['Sync and Live!'],
'Verse 2':'Paper Tear/Film Roll/RGB Split/Mosaic/Page Turn/Shatter/Accordion/Lens Flash/Distortion Wave/3D Cube/Split Slide/Match Cut/Progress Line/Circular Progress/3D Tilt/Magnet/Clock Wipe/Venetian Blinds/Kaleidoscope/Zoom Blur/Light Leak/Domino'.split('/'),
'Outro':'Bubble Pop/Smoke Diffusion/Tooltip Pop/Particle Burst/Confetti/Rewind'.split('/'),
'Outro2':['Shutdown.'],
}
START={'Intro':0.294,'Verse 1':4.294,'Pre-Chorus':34.294,'Chorus':54.294,'Chorus2':78.294,'Verse 2':82.294,'Outro':106.294,'Outro2':114.294}
NONTECH={'Three','two','one','Animation Overdrive!','Sync and Live!','Shutdown.'}
W=[]
for sec,words in LY.items():
    for i,w in enumerate(words):
        W.append(dict(sec={'Chorus2':'Chorus','Outro2':'Outro'}.get(sec,sec),en=w,g=START[sec]+i,tech=w not in NONTECH))
N=len(W);K=len(cells);INF=1e18
sig=0.45
def local(j,k): d=(cells[k]-W[j]['g'])/sig; return 0.5*d*d-2.0*strength[k]
cost=np.full((N,K),INF); back=np.zeros((N,K),int)
for k in range(K): cost[0,k]=local(0,k)
gap=3  # 0.75 s
for j in range(1,N):
    run=INF;ra=0
    for k in range(K):
        kk=k-gap
        if kk>=0 and cost[j-1,kk]<run: run=cost[j-1,kk];ra=kk
        if run<INF: cost[j,k]=run+local(j,k); back[j,k]=ra
k=int(np.argmin(cost[N-1]));path=[k]
for j in range(N-1,0,-1): k=back[j,k];path.append(k)
path=path[::-1]
for w,k in zip(W,path):
    w['t']=round(float(cells[k]),3); w['d']=round(w['t']-w['g'],2); w['s']=round(float(strength[k]),2)
json.dump(W,open(D+'/align.json','w'),ensure_ascii=False,indent=0)
print('words',N,'techs',sum(w['tech'] for w in W))
from collections import Counter
print(Counter(w['d'] for w in W))
for i,w in enumerate(W):
    if w['d']!=0: print(i+1,w['sec'],w['en'],w['g'],'->',w['t'],w['d'],w['s'])
