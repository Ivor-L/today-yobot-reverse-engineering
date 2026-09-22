"""Materialize an editable app and original signed runtime dependencies.
This only reads the installed app/plugin; no user credentials are copied.
"""
from pathlib import Path
import shutil,subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT.parent
source=Path('/Applications/YoBot.app')
plugin=Path('/Users/Admin/Library/Application Support/YoBot/plugins/wechat-rpa/versions/1.9.19')
if not (ROOT/'app').exists():
    shutil.copytree(WORK/'recovered/app',ROOT/'app',symlinks=True)
if not (ROOT/'vendor/runtime/YoBot.app').exists():
    (ROOT/'vendor/runtime').mkdir(parents=True,exist_ok=True)
    subprocess.run(['ditto',str(source),str(ROOT/'vendor/runtime/YoBot.app')],check=True)
if not (ROOT/'vendor/wechat-rpa/1.9.19').exists():
    (ROOT/'vendor/wechat-rpa').mkdir(parents=True,exist_ok=True)
    subprocess.run(['ditto',str(plugin),str(ROOT/'vendor/wechat-rpa/1.9.19')],check=True)
# Signing keeps this pair unchanged. No runtime.json, active process, token or chat DB is copied.
manifest=ROOT/'vendor/wechat-rpa/1.9.19/manifest.v2.json'
(ROOT/'vendor/provenance.json').write_text(json.dumps({
 'runtime_origin':str(source),'rpa_origin':str(plugin),
 'rpa_manifest_sha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),
 'app_origin_sha256':hashlib.sha256((source/'Contents/Resources/app.asar').read_bytes()).hexdigest(),
 'private_data_copied':False},indent=2))
print('Prepared editable JS, Electron runtime, signed RPA plugin')
