"""Reproducible, version-pinned repair of the owned 20260918.2 contact helper."""
from pathlib import Path
import hashlib,json,plistlib,re,shutil,struct,subprocess
root=Path(__file__).resolve().parent
source=root.parents[1]/'vendor/wechat-rpa/2.0.0/YokoWebot RPA Control.app/Contents/Helpers/YokoRpaDistributionHelper.app'
output=root/'build/YoBot Contact Helper.app'
original=(source/'Contents/MacOS/YokoRpaDistributionHelper').read_bytes()
assert hashlib.sha256(original).hexdigest()=='3ca4ae33a574c90507f0037bc45a31759fe1044c15232897b897b1b3cfe37f73', 'Unsupported helper build'
shutil.copytree(source,output,dirs_exist_ok=True)
frameworks=output/'Contents/Frameworks';frameworks.mkdir(exist_ok=True)
subprocess.run(['clang','-c',str(root/'initialize.c'),'-o',str(root/'build/initialize.o')],check=True)
lib=frameworks/'YoBotContactFix.dylib'
subprocess.run(['swiftc','-emit-library',str(root/'ContactTitleFix.swift'),str(root/'build/initialize.o'),'-o',str(lib),'-Xlinker','-install_name','-Xlinker','@rpath/YoBotContactFix.dylib'],check=True)
b=bytearray(original);h=list(struct.unpack_from('<8I',b))
def branch(a,z,link=False):
    assert (z-a)%4==0 and -(1<<27)<=z-a<(1<<27)
    return struct.pack('<I',(0x94000000 if link else 0x14000000)|(((z-a)//4)&0x3ffffff))
assert b[0x98710:0x98714]==bytes.fromhex('fc0f1df8')
assert b[0xd4614:0xd4618]==branch(0xd4614,0xb015c,True)
# Only this AXValue read preserves the empty string. Role/focus/window/row
# verification remains exactly as shipped.
b[0xd4614:0xd4618]=branch(0xd4614,0x237020,True)
# Unused padding verified against this exact build, outside all sections.
cave,slot=0x237000,0x257ff0
assert not any(b[cave:cave+44])
imm=((slot>>12)-(cave>>12))&0x1fffff
b[cave:cave+12]=struct.pack('<III',0x90000010|((imm&3)<<29)|((imm>>2)<<5),0xf9400210|(((slot&0xfff)//8)<<10),0xd61f0200)
b[cave+16:cave+24]=b[0x98710:0x98714]+branch(cave+20,0x98714)
b[cave+32:cave+44]=struct.pack('<III',0x90000010|((imm&3)<<29)|((imm>>2)<<5),0xf9400210|((((slot+8)&0xfff)//8)<<10),0xd61f0200)
b[0x98710:0x98714]=branch(0x98710,cave)
name=b'@executable_path/../Frameworks/YoBotContactFix.dylib\0';n=(24+len(name)+7)//8*8
assert 32+h[5]+n<=0x1840
b[32+h[5]:32+h[5]+n]=struct.pack('<6I',0xc,n,24,0,0x10000,0x10000)+name+b'\0'*(n-24-len(name))
h[4]+=1;h[5]+=n;struct.pack_into('<8I',b,0,*h)
(output/'Contents/MacOS/YokoRpaDistributionHelper').write_bytes(b)
p=output/'Contents/Info.plist';info=plistlib.loads(p.read_bytes());info['CFBundleDisplayName']='YoBot 好友同步修复';info['CFBundleIdentifier']='local.yobot.contact-helper';p.write_bytes(plistlib.dumps(info))
subprocess.run(['codesign','--force','--sign','-',str(lib)],check=True)
subprocess.run(['codesign','--force','--sign','-','--identifier',info['CFBundleIdentifier'],str(output)],check=True)
subprocess.run(['codesign','--verify','--strict','--deep',str(output)],check=True)
r=subprocess.run(['codesign','-dv','--verbose=4',str(output)],capture_output=True,text=True,check=True)
pin=re.search(r'^CDHash=([0-9a-f]{40})$',r.stderr,re.M).group(1)
config={'helper_path':str(output),'identifier':info['CFBundleIdentifier'],'version':info['CFBundleVersion'],'cdhash':pin}
(root/'build/manifest.json').write_text(json.dumps(config,indent=2))
print(json.dumps(config,indent=2))
