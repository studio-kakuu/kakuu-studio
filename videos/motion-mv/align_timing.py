import numpy as np, json
V=np.load('V.npy'); t=np.load('Vt.npy')
E=np.log1p(V.sum(0)*50)
beat=60/86.03; s16=beat/4; g0=0.645-4*beat
cells=np.arange(g0,110.0,s16)
val=[]
for a in cells:
    m=(t>=a-0.03)&(t<a+s16-0.03); val.append(E[m].mean() if m.any() else 0)
val=np.array(val); lo,hi=np.percentile(val,20),np.percentile(val,98); vn=np.clip((val-lo)/(hi-lo),0,1.2)
rise=np.clip(vn-np.r_[0,vn[:-1]],0,None)
strength=0.6*rise+0.4*vn*(np.r_[0,vn[:-1]]<vn+0.05)
# 単語(歌われた順・Gemini の秒は目安)
W=[]
def add(sec,en,g,syl,tech=True,sig=0.55):
    W.append(dict(sec=sec,en=en,g=g,syl=syl,tech=tech,sig=sig))
I='Intro'
add(I,'Fade In',5.3,2);add(I,'Slide In',5.9,2);add(I,'Pop In',6.7,2);add(I,'Bounce',7.2,1)
for i,c in enumerate(['3','2','2','1']): add(I,c,8.2+0.35*i,1,False)
add(I,'Animation Overdrive',9.7,8,False)
V1='Verse 1'
for r in range(2):
    o=2.9*r
    add(V1,'Fade In',11.2+o,2);add(V1,'Slide Up',11.85+o,2);add(V1,'Slide Down',12.6+o,2);add(V1,'Left',13.15+o,1);add(V1,'Right',13.5+o,1)
for r in range(2):
    o=2.9*r
    add(V1,'Pop In',17.0+o,2);add(V1,'Bounce',17.4+o,1);add(V1,'Zoom In',17.8+o,2);add(V1,'Blur In',18.2+o,2);add(V1,'Typewriter',18.6+o,3)
add(V1,'Text Reveal',22.3,3);add(V1,'Mask Reveal',23.6,3);add(V1,'Stagger In',24.3,3);add(V1,'Count Up',24.9,2)
add(V1,'Flip X',25.3,2);add(V1,'Flip Y',25.8,2);add(V1,'Split Reveal',26.6,3);add(V1,'Drop In',27.2,2);add(V1,'Spin In',27.6,2)
for r in range(2):
    o=2.9*r
    add(V1,'Ink Splash',28.1+o,2);add(V1,'Glitch In',28.7+o,2);add(V1,'Line Drawing',29.5+o,3,sig=0.55 if r==0 else 0.9);add(V1,'Curtain Reveal',30.1+o,4,sig=0.55 if r==0 else 0.9)
P='Pre-Chorus'
add(P,'Fade Out',34.0,2);add(P,'Slide Out',34.6,2);add(P,'Shrink Out',35.4,2);add(P,'Zoom Out',36.0,2)
add(P,'Blur Out',39.5,2);add(P,'Flip Out',40.1,2);add(P,'Drop Out',40.8,2);add(P,'Spin Out',41.4,2)
add(P,'Cross Dissolve',45.0,4);add(P,'Push',46.0,1);add(P,'Zoom Pan',46.6,2);add(P,'Whip Pan',47.2,2);add(P,'Morphing',48.0,3);add(P,'Parallax',48.8,3);add(P,'Seamless Zoom',49.5,4)
C='Chorus'
for en,g,s in [('Pulse',53.0,1),('Shake',53.7,1),('Loop Bounce',54.4,2),('Hover Scale',55.2,3),('Shine',58.7,1),('Ripple',59.4,2),('Floating',60.1,3),('Swing',61.3,1),
 ('Blink',64.3,1),('Heartbeat',65.0,2),('Glitch Loop',65.6,2),('Spin',66.8,1),('Gradient Shift',67.5,4),('Neon Glow',68.8,3),('Wave',70.1,1)]:
    add(C,en,g,s)
add(C,'Bring the motion,',72.3,4,False);add(C,'bring the noise,',73.5,3,False);add(C,'SYNC & LIVE!',74.8,3,False)
V2=['Paper Tear','Film Roll','RGB Split','Mosaic','Page Turn','Shatter','Accordion','Lens Flash','Distortion Wave','3D Cube','Split Slide','Match Cut','Progress Line','Circular Progress','3D Tilt','Magnet']
sy=[3,2,4,3,2,2,4,2,5,3,2,2,3,5,3,2]
tot=sum(sy); acc=0
for en,s in zip(V2,sy):
    add('Verse 2',en,80.85+ (98.0-80.85)*acc/tot,s,sig=2.2); acc+=s
O=[('Countdown',2,False),('3',1,False),('2',1,False),('1',1,False),('Bubble Pop',3,True),('Smoke Diffusion',5,True),('Tooltip Pop',4,True),('Error',2,False),('Shutdown',2,False)]
tot=sum(o[1] for o in O); acc=0
for en,s,tech in O:
    add('Outro',en,100.2+(107.0-100.2)*acc/tot,s,tech,sig=1.6); acc+=s
# DP
N=len(W); K=len(cells)
INF=1e18
cost=np.full((N,K),INF); back=np.zeros((N,K),int)
def local(j,k):
    w=W[j]; d=(cells[k]-w['g'])/w['sig']
    return 0.5*d*d - 2.2*strength[k]
for k in range(K): cost[0,k]=local(0,k)
for j in range(1,N):
    gap=max(1,W[j-1]['syl'])
    best=np.full(K,INF); arg=np.zeros(K,int)
    run=INF; ra=0
    for k in range(K):
        kk=k-gap
        if kk>=0 and cost[j-1,kk]<run: run=cost[j-1,kk]; ra=kk
        best[k]=run; arg[k]=ra
    for k in range(K):
        if best[k]<INF:
            cost[j,k]=best[k]+local(j,k); back[j,k]=arg[k]
k=int(np.argmin(cost[N-1])); path=[k]
for j in range(N-1,0,-1):
    k=back[j,k]; path.append(k)
path=path[::-1]
for w,k in zip(W,path): w['t']=round(float(cells[k]),3); w['str']=round(float(strength[k]),2)
json.dump(W,open('align.json','w'),ensure_ascii=False,indent=0)
for i,w in enumerate(W):
    print(f"{i+1:3d} {w['sec']:10s} {w['en']:20s} gem {w['g']:6.2f} -> {w['t']:6.2f}  d={w['t']-w['g']:+.2f} s={w['str']}")
