"""Generate quarantined candidates and assess exact code-object agreement.
Run with Python 3.9. Never import/execute recovered application modules.
"""
import ast, concurrent.futures, hashlib, json, marshal, pathlib, subprocess, types, warnings
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'recovered/wechat-rpa'
TOOL=pathlib.Path('/tmp/yobot-pycdc/pycdc')
OUT=BASE/'decompiled-candidates'
def fingerprint(c):
    if isinstance(c,types.CodeType):
        return (c.co_code,c.co_names,c.co_varnames,c.co_argcount,c.co_posonlyargcount,c.co_kwonlyargcount,c.co_flags,c.co_freevars,c.co_cellvars,tuple(fingerprint(x) for x in c.co_consts))
    if isinstance(c,tuple):return tuple(fingerprint(x) for x in c)
    return (type(c).__name__,repr(c))
def run(path):
    rel=path.relative_to(BASE/'bytecode').with_suffix('.py');target=OUT/rel;target.parent.mkdir(parents=True,exist_ok=True)
    row={'module':str(rel),'input_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    try:
        proc=subprocess.run([str(TOOL),'-c','-v','3.9',str(path)],capture_output=True,text=True,timeout=20)
        target.write_text('# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.\n'+proc.stdout)
        target.with_suffix('.stderr.txt').write_text(proc.stderr)
        row.update(returncode=proc.returncode,diagnostics=bool(proc.stderr.strip()))
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            compiled=compile(proc.stdout,str(target),'exec')
        row['syntax_valid']=True
        row['compile_warnings']=[str(w.message) for w in caught]
        original=marshal.loads(path.read_bytes());row['exact_code_match']=fingerprint(original)==fingerprint(compiled)
        row['has_incomplete_marker']=any(s in proc.stdout for s in ('Decompyle incomplete','<NODE:','Unsupported'))
    except (SyntaxError,ValueError,subprocess.TimeoutExpired) as e:row.update(syntax_valid=False,error=str(e)[:200],exact_code_match=False)
    return row
paths=sorted((BASE/'bytecode/WeRobotCore').rglob('*.marshal'))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: rows=list(pool.map(run,paths))
report={'tool_commit':subprocess.check_output(['git','-C',str(TOOL.parent),'rev-parse','HEAD'],text=True).strip(),'files':rows}
(ROOT/'analysis/python-decompilation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'total':len(rows),'syntax_valid':sum(x.get('syntax_valid',False) for x in rows),'exact_code_match':sum(x.get('exact_code_match',False) for x in rows)}))
