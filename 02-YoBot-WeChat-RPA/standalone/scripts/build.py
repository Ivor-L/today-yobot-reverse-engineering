"""Build an independent macOS app from editable recovered JS + vendored runtime.
ASAR is rebuilt deterministically. Pristine vendor binaries are retained;
the optional contact fix includes a separately signed, exact-hash-pinned Helper.
No internet connection or original /Applications/YoBot.app is needed after prepare.
"""
from pathlib import Path
import hashlib,json,os,plistlib,shutil,struct,subprocess,copy
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app'; TEMPLATE=ROOT/'vendor/runtime/YoBot.app'; OUT=ROOT/'dist/YoBot Recovered.app'
if not TEMPLATE.exists():raise SystemExit('Run scripts/prepare.py first')
# Reapply and validate the renderer-shell changes before packaging.  This is
# idempotent and fails closed if a future recovered bundle changes shape.
subprocess.run(['python3',str(ROOT/'scripts/patch_main_shell.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/patch_native_titlebar.py')],check=True)
OUT.parent.mkdir(exist_ok=True)
if OUT.exists():
    # Keep the rollback copy outside the .app namespace so LaunchServices does
    # not register two bundles with the same identifier.
    previous=ROOT/'dist/YoBot Recovered.previous'
    if previous.exists():shutil.rmtree(previous)
    OUT.rename(previous)
subprocess.run(['ditto',str(TEMPLATE),str(OUT)],check=True)
res=OUT/'Contents/Resources'
# Start from original ASAR metadata, preserving unpacked/package/link semantics.
with (TEMPLATE/'Contents/Resources/app.asar').open('rb') as f:
    _,_,_,n=struct.unpack('<4I',f.read(16));header=json.loads(f.read(n))
header['files']['recovery-bootstrap.js']={'size':0,'offset':'0'}
header['files']['recovery-local-rpa.js']={'size':0,'offset':'0'}
header['files']['recovery-rpa-flat.css']={'size':0,'offset':'0'}
header['files']['recovery-main-flat.css']={'size':0,'offset':'0'}
header['files']['recovery-rpa-errors.js']={'size':0,'offset':'0'}
header['files']['recovery-mcp.js']={'size':0,'offset':'0'}
blob_path=res/'app.asar.data-tmp'; manifest=[]
def walk(tree,prefix=Path()):
    for name,entry in tree['files'].items():
        rel=prefix/name
        if 'files' in entry:yield from walk(entry,rel)
        else:yield rel,entry
with blob_path.open('wb') as blob:
    for rel,entry in walk(header):
        if 'link' in entry:continue
        source=APP/rel
        if not source.is_file():raise FileNotFoundError(source)
        data=source.read_bytes();digest=hashlib.sha256(data).hexdigest()
        entry['size']=len(data)
        block_size=entry.get('integrity',{}).get('blockSize',4194304)
        entry['integrity']={'algorithm':'SHA256','hash':digest,'blockSize':block_size,
                            'blocks':[hashlib.sha256(data[i:i+block_size]).hexdigest() for i in range(0,len(data),block_size)]}
        if not data:entry['integrity']['blocks']=[hashlib.sha256(b'').hexdigest()]
        if entry.get('unpacked'):
            target=res/'app.asar.unpacked'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        else:
            entry['offset']=str(blob.tell());blob.write(data)
        manifest.append({'path':str(rel),'sha256':digest,'size':len(data)})
raw=json.dumps(header,separators=(',',':'),ensure_ascii=False).encode()
padded=raw+b'\0'*((-len(raw))%4)
header_pickle=struct.pack('<II',len(padded)+4,len(raw))+padded
with (res/'app.asar').open('wb') as f:
    f.write(struct.pack('<II',4,len(header_pickle)));f.write(header_pickle)
    with blob_path.open('rb') as body:shutil.copyfileobj(body,f)
blob_path.unlink()
# Independent embedded plugin; no private data or runtime state included.
subprocess.run(['ditto',str(ROOT/'vendor/wechat-rpa'),str(res/'embedded-rpa')],check=True)
web_patch=ROOT/'native/rpa-web-patch'
subprocess.run(['python3',str(web_patch/'build.py')],check=True)
subprocess.run(['ditto',str(web_patch/'build'),str(res/'rpa-web-patch')],check=True)
fix=ROOT/'native/contact-fix/build'
if (fix/'manifest.json').exists():
    subprocess.run(['python3',str(fix.parent/'install_runtime.py'),'--prepare-only'],check=True)
    dest=res/'contact-fix';dest.mkdir()
    subprocess.run(['ditto',str(fix/'YoBot Contact Helper.app'),str(dest/'YoBot Contact Helper.app')],check=True)
    for name in ['runtime_bridge.py','base_library.zip']:
        shutil.copyfile(fix/name,dest/name)
    config=json.loads((fix/'manifest.json').read_text());config['helper_path']='YoBot Contact Helper.app'
    (dest/'manifest.json').write_text(json.dumps(config,indent=2))
info_path=OUT/'Contents/Info.plist'; info=plistlib.loads(info_path.read_bytes())
info['CFBundleIdentifier']='local.yobot.recovered';info['CFBundleDisplayName']='YoBot Recovered';info['CFBundleName']='YoBot'
info['CFBundleURLTypes']=[{'CFBundleURLName':'local.yobot.recovered','CFBundleURLSchemes':['yobot-recovered']}]
info['ElectronAsarIntegrity']={'Resources/app.asar':{'algorithm':'SHA256','hash':hashlib.sha256(raw).hexdigest()}}
info_path.write_bytes(plistlib.dumps(info,sort_keys=False))
entitlements=ROOT/'scripts/entitlements.plist'
entitlements.write_bytes(plistlib.dumps({'com.apple.security.cs.allow-jit':True,'com.apple.security.cs.allow-unsigned-executable-memory':True}))
# Sign the outer bundle, including the separately signed contact repair.
subprocess.run(['codesign','--force','--sign','-','--options=0','--entitlements',str(entitlements),str(OUT)],check=True)
subprocess.run(['codesign','--verify','--deep','--strict',str(OUT)],check=True)
(ROOT/'dist/build-manifest.json').write_text(json.dumps({'app':str(OUT),'header_sha256':hashlib.sha256(raw).hexdigest(),'files':manifest},indent=2))
print('Built:',OUT)
