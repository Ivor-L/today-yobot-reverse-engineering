import pathlib,struct,zlib,json,marshal,types,dis,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
src=pathlib.Path('/Users/Admin/Library/Application Support/YoBot/plugins/wechat-rpa/versions/1.9.19/YokoWebot RPA Control.app/Contents')
out=root/'recovered'/'wechat-rpa'; out.mkdir(parents=True,exist_ok=True)
# Restore embedded frontend source content, preserving distinct map entries.
index=[]
for mp in (src/'Resources/webot/dist').rglob('*.map'):
 obj=json.loads(mp.read_text())
 for i,(name,content) in enumerate(zip(obj.get('sources',[]),obj.get('sourcesContent',[]))):
  if content is None: continue
  dest=out/'frontend-sources'/mp.stem/(str(i)+'_'+pathlib.PurePosixPath(name.split('?')[0]).name)
  dest.parent.mkdir(parents=True,exist_ok=True); dest.write_text(content)
  index.append({'source':name,'file':str(dest.relative_to(root))})
(root/'analysis/frontend-sources.json').write_text(json.dumps(index,ensure_ascii=False,indent=2))
data=(src/'MacOS/YokoWebotRpaControl').read_bytes(); magic=b'MEI\014\013\012\013\016'; pos=data.rfind(magic)
assert pos>=0,'No PyInstaller cookie'
_,size,tocpos,toclen,pyver,lib=struct.unpack('!8sIIII64s',data[pos:pos+88]); start=pos+88-size
entries=[]; cursor=start+tocpos
while cursor<start+tocpos+toclen:
 length,off,packed,unpacked,flag,kind=struct.unpack('!IIIIBc',data[cursor:cursor+18]); name=data[cursor+18:cursor+length].split(b'\0')[0].decode(); cursor+=length
 blob=data[start+off:start+off+packed]; blob=zlib.decompress(blob) if flag else blob
 dest=out/'archive'/name
 if not dest.resolve().is_relative_to(out.resolve()): raise ValueError(name)
 dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(blob)
 entries.append({'name':name,'type':kind.decode(),'size':len(blob)})
 if kind==b'z':
  assert blob[:4]==b'PYZ\0'; toc=marshal.loads(blob[struct.unpack('!I',blob[8:12])[0]:]); toc=dict(toc)
  for mod,(typ,offset,count) in toc.items():
   if typ not in (0,1):continue
   raw=zlib.decompress(blob[offset:offset+count]); dest=out/'bytecode'/(mod.replace('.','/')+'.marshal'); dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
   if mod.startswith(('WeRobotCore','scripts','app','webot','wechat','rpa','main','services','api','core','utils','config','models','control')):
    code=marshal.loads(raw)
    if isinstance(code,types.CodeType):
     target=out/'disassembly'/(mod+'.txt');target.parent.mkdir(parents=True,exist_ok=True)
     with target.open('w') as f: dis.dis(code,file=f)
(root/'analysis/plugin-archive.json').write_text(json.dumps({'python_version':pyver,'sha256':hashlib.sha256(data).hexdigest(),'entries':entries},indent=2))
print('Frontend sources:',len(index),'Archive entries:',len(entries),'Python:',pyver)
