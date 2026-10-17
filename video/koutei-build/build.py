import json,subprocess
S=json.load(open('scenes.json',encoding='utf8'))
ENC=['-c:v','libx264','-pix_fmt','yuv420p','-r','30','-crf','20','-preset','medium','-an']
def run(a): subprocess.run(['ffmpeg','-y','-loglevel','error']+a,check=True)
segs=[]
for s in S:
    d=s['dur']; out=f"seg_{s['id']}.mp4"
    if s['kind']=='part':
        if s['dev']=='pc':
            sc="scale=1080:-2"; xy="x=0:y=720"
        else:
            sc="scale=-2:1170,pad=iw+4:ih+4:2:2:color=0x3A444D"; xy="x=(W-w)/2:y=420"
        fc=(f"color=c=0x0E0E0E:s=1080x1920:r=30:d={d}[bg];"
            f"[0:v]fps=30,{sc},tpad=stop_mode=clone:stop_duration=5,trim=duration={d},setpts=PTS-STARTPTS[v];"
            f"[bg][v]overlay={xy}:shortest=1[b2];[b2][1:v]overlay=0:0,"
            f"fade=t=in:st=0:d=0.2,fade=t=out:st={d-0.2}:d=0.2,format=yuv420p[o]")
        run(['-i',f"vid/{s['clip']}.mp4",'-loop','1','-i',f"ov_{s['id']}.png",'-filter_complex',fc,'-map','[o]','-t',str(d)]+ENC+[out])
    else:
        fc=(f"color=c=0x0E0E0E:s=1080x1920:r=30:d={d}[bg];[bg][0:v]overlay=0:0,"
            f"fade=t=in:st=0:d={0 if s['id']=='hook' else 0.25},fade=t=out:st={d-0.25}:d=0.25,format=yuv420p[o]")
        if s['id']!='hook': fc=fc
        run(['-loop','1','-i',f"ov_{s['id']}.png",'-filter_complex',fc,'-map','[o]','-t',str(d)]+ENC+[out])
    segs.append(s['id'])
body=[x for x in segs if not x.startswith('end_')]
for p in ['instagram','tiktok','x']:
    open(f'list_{p}.txt','w').write(''.join(f"file 'seg_{x}.mp4'\n" for x in body+[f'end_{p}']))
    run(['-f','concat','-safe','0','-i',f'list_{p}.txt','-c','copy','-movflags','+faststart',f'{p}.mp4'])
