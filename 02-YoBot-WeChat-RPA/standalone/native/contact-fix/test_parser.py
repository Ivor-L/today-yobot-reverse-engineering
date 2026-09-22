from pathlib import Path
import shutil,struct,subprocess,tempfile
root=Path(__file__).resolve().parent
app=root/'build/YoBot Contact Helper.app'
with tempfile.TemporaryDirectory(prefix='yobot-parser-') as folder:
    tmp=Path(folder);(tmp/'MacOS').mkdir();shutil.copytree(app/'Contents/Frameworks',tmp/'Frameworks')
    b=bytearray((app/'Contents/MacOS/YokoRpaDistributionHelper').read_bytes());h=list(struct.unpack_from('<8I',b));o=32;commands=[]
    for _ in range(h[4]):
        c,n=struct.unpack_from('<II',b,o);d=b[o:o+n];o+=n
        if c in (0xe,0x80000028,0x1d):continue
        if c==0x19 and d[8:24].rstrip(b'\0')==b'__PAGEZERO':continue
        commands.append(d)
    name=b'yobot-parser-test.dylib\0';n=(24+len(name)+7)//8*8
    commands.append(struct.pack('<6I',0xd,n,24,0,0x10000,0x10000)+name+b'\0'*(n-24-len(name)))
    packed=b''.join(commands);assert len(packed)<=h[5]
    b[32:32+h[5]]=packed+b'\0'*(h[5]-len(packed));h[3]=6;h[4]=len(commands);h[5]=len(packed);h[6]&=~0x200000;struct.pack_into('<8I',b,0,*h)
    lib=tmp/'yobot-parser-test.dylib';lib.write_bytes(b)
    subprocess.run(['codesign','--force','--sign','-',str(lib)],check=True)
    harness=tmp/'MacOS/parser-tests'
    subprocess.run(['swiftc',str(root/'ParserRegression.swift'),'-o',str(harness)],check=True)
    subprocess.run([str(harness),str(lib)],check=True)
