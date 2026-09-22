"""Extract YoBot's installed ASAR without executing application code."""
import hashlib,json,pathlib,shutil,struct
src=pathlib.Path('/Applications/YoBot.app/Contents/Resources/app.asar')
out=pathlib.Path(__file__).resolve().parents[1]/'recovered'/'app'
out.mkdir(parents=True,exist_ok=True)
records=[]
with src.open('rb') as f:
    _,header_size,_,json_size=struct.unpack('<4I',f.read(16))
    header=json.loads(f.read(json_size)); base=8+header_size
    def visit(tree,prefix=pathlib.PurePosixPath()):
        for name,item in tree.get('files',{}).items():
            rel=prefix/name
            dest=out/rel
            if not dest.resolve().is_relative_to(out.resolve()): raise ValueError(rel)
            if 'files' in item:
                visit(item,rel); continue
            if 'link' in item:
                records.append({'path':str(rel),'link':item['link']}); continue
            dest.parent.mkdir(parents=True,exist_ok=True)
            if item.get('unpacked'):
                data=pathlib.Path(str(src)+'.unpacked').joinpath(rel).read_bytes()
            else:
                f.seek(base+int(item['offset'])); data=f.read(item['size'])
            if not item.get('unpacked'): assert len(data)==item['size'],str(rel)
            digest=hashlib.sha256(data).hexdigest()
            expected=item.get('integrity',{}).get('hash')
            if expected and not item.get('unpacked'): assert digest==expected,str(rel)
            dest.write_bytes(data)
            if item.get('executable'): dest.chmod(0o755)
            records.append({'path':str(rel),'size':len(data),'sha256':digest})
    visit(header)
report={'source':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'entries':records}
(out.parents[1]/'analysis'/'extraction-manifest.json').write_text(json.dumps(report,indent=2))
print('Extracted',len(records),'entries to',out)
