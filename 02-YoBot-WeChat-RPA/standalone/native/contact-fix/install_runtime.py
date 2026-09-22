"""Install the local Python bootstrap hook; keep a pristine rollback archive."""
from pathlib import Path
import marshal,zipfile,shutil,sys
root=Path(__file__).resolve().parent
runtime=Path.home()/'Library/Application Support/YoBot-Recovered/plugins/wechat-rpa/versions/2.0.0/YokoWebot RPA Control.app/Contents/Resources/base_library.zip'
pristine=root.parents[1]/'vendor/wechat-rpa/2.0.0/YokoWebot RPA Control.app/Contents/Resources/base_library.zip'
source='''
import sys as _recovery_sys
def _recovery_profile(frame,event,arg):
    module=frame.f_globals.get('__name__')
    if event=='return' and frame.f_code.co_name=='<module>' and module=='WeRobotCore.adapters.wechat.macos_ax.driver':
        # The first page scans the entire contact manager before publishing
        # anything. A 3,000+ contact directory exceeded the shipped 360s cap.
        frame.f_globals['MACOS_CONTACT_FIRST_PAGE_TIMEOUT_SECONDS']=3600.0
    if event=='return' and frame.f_code.co_name=='<module>' and module=='WeRobotCore.adapters.wechat.macos_ax.native_transport':
        import os as _recovery_os
        scope={}
        directory=_recovery_os.environ.get('YOBOT_CONTACT_FIX_ROOT',DEFAULT_ROOT)
        bridge_path=_recovery_os.path.join(directory,'runtime_bridge.py')
        manifest_path=_recovery_os.path.join(directory,'manifest.json')
        with open(bridge_path) as stream: exec(compile(stream.read(),bridge_path,'exec'),scope)
        scope['install'](frame.f_globals,manifest_path)
    if event=='call' and frame.f_code.co_name=='__init__' and module=='WeRobotCore.adapters.wechat.macos_ax.ipc':
        code=frame.f_locals.get('helper_code')
        if isinstance(code,str):
            try:
                with open('/tmp/yobot-native-error-code.log','a') as stream: stream.write(code+'\\n')
            except Exception: pass
_recovery_sys.setprofile(_recovery_profile)
'''.replace('DEFAULT_ROOT',repr(str(root/'build')))
with zipfile.ZipFile(pristine) as z:entries=[(i,z.read(i.filename)) for i in z.infolist()]
target=root/'build/base_library.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for info,data in entries:
        if info.filename=='encodings/__init__.pyc':
            old=marshal.loads(data[16:])
            new=compile('import marshal as _recovery_marshal\nexec(_recovery_marshal.loads('+repr(marshal.dumps(old))+'))\n'+source,old.co_filename,'exec')
            data=data[:16]+marshal.dumps(new)
        z.writestr(info,data)
shutil.copyfile(root/'runtime_bridge.py',root/'build/runtime_bridge.py')
if '--prepare-only' not in sys.argv:
    shutil.copyfile(target,runtime)
    print('Installed exact-hash helper bridge; pristine rollback remains in vendor.')
