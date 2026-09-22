"""Use the local repaired helper with an exact code hash, retaining IPC checks."""
import json
from pathlib import Path

def install(namespace, manifest_path):
    cls=namespace['PyObjCMacOSHelperBackend']
    if getattr(cls,'_yobot_contact_fix_installed',False):return
    config=json.loads(Path(manifest_path).read_text())
    pin=config['cdhash']
    if len(pin)!=40 or any(c not in '0123456789abcdef' for c in pin):raise ValueError('Invalid helper code pin')
    configured=Path(config['helper_path'])
    helper=(configured if configured.is_absolute() else Path(manifest_path).parent/configured).resolve(strict=True)
    identifier=config['identifier']
    original_open=cls.open_connection
    original_requirement=cls._code_requirement
    original_peer=cls._validate_peer_identity
    def open_connection(self, **kwargs):
        kwargs=dict(kwargs)
        kwargs['helper_bundle_path']=helper
        kwargs['expected_helper_identifier']=identifier
        kwargs['expected_helper_bundle_version']=str(config['version'])
        return original_open(self,**kwargs)
    def requirement(security, requested_identifier, team_identifier):
        if requested_identifier!=identifier:
            return original_requirement(security,requested_identifier,team_identifier)
        status,result=security.SecRequirementCreateWithString('identifier "{}" and cdhash H"{}"'.format(identifier,pin),0,None)
        cls._require_success(status,'HELPER_REQUIREMENT_INVALID')
        return result
    def validate_peer(security,peer_pid,requirement,expected_identifier,expected_team_identifier):
        # Original static/dynamic signature and identifier checks still run.
        # This local ad-hoc helper has no Team ID; the requirement pins its
        # exact code hash instead of trusting an arbitrary ad-hoc signature.
        return original_peer(security,peer_pid,requirement,expected_identifier,
                             None if expected_identifier==identifier else expected_team_identifier)
    cls.open_connection=open_connection
    cls._code_requirement=staticmethod(requirement)
    cls._validate_peer_identity=staticmethod(validate_peer)
    cls._yobot_contact_fix_installed=True
