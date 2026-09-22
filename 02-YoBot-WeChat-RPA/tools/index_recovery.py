"""Index original symbols and restore first-party frontend paths from source maps."""
import hashlib,json,marshal,pathlib,types
ROOT=pathlib.Path(__file__).resolve().parents[1]
rows=[]
for source in sorted((ROOT/'recovered/wechat-rpa/bytecode/WeRobotCore').rglob('*.marshal')):
    code=marshal.loads(source.read_bytes())
    def walk(c,prefix=''):
        for child in c.co_consts:
            if isinstance(child,types.CodeType):
                name=prefix+child.co_name
                yield {'name':name,'original_line':child.co_firstlineno,
                       'arguments':list(child.co_varnames[:child.co_argcount+child.co_kwonlyargcount]),
                       'positional_args':child.co_argcount,'keyword_only_args':child.co_kwonlyargcount,
                       'flags':child.co_flags,'names':list(child.co_names)}
                yield from walk(child,name+'.')
    rows.append({'module':str(source.relative_to(ROOT/'recovered/wechat-rpa/bytecode')),
                 'original_filename':code.co_filename,'symbols':list(walk(code))})
(ROOT/'analysis/python-symbol-index.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
entries=json.loads((ROOT/'analysis/frontend-sources.json').read_text())
out=ROOT/'restored/frontend'; mapped=[]; conflicts=[]
for item in entries:
    name=item['source']; rawname=name.split('?',1)[0]
    # Webpack source URLs vary, but first-party sources are rooted at /src/.
    if not name.startswith('webpack://webot/./src/') or '?' in name:continue
    rel=pathlib.PurePosixPath('src')/rawname.split('/src/',1)[1]
    dest=out/rel
    if not dest.resolve().is_relative_to(out.resolve()):raise ValueError(name)
    data=(ROOT/item['file']).read_bytes()
    digest=hashlib.sha256(data).hexdigest()
    if dest.exists() and dest.read_bytes()!=data:
        # Vue loader can include transformed views alongside original SFC sources.
        conflicts.append({'source':name,'target':str(rel),'candidate':item['file']})
        # Keep the existing file, preserve every conflict in the original candidates.
        continue
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    mapped.append({'source':name,'file':str(dest.relative_to(ROOT)),'sha256':digest})
(ROOT/'analysis/frontend-restoration.json').write_text(json.dumps({'mapped':mapped,'conflicts':conflicts},ensure_ascii=False,indent=2))
print('Indexed modules:',len(rows),'Frontend unique files:',len({r['file'] for r in mapped}),'Conflicts:',len(conflicts))
