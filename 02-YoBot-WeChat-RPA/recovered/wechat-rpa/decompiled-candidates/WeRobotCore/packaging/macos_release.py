# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_release.marshal (Python 3.9)

'''Fail-closed release orchestration for the YokoAgent macOS RPA plugin.

The builder accepts no channel or capability-wave switches: this first joint
artifact is always the official arm64 ``production/none`` Control.  All output
is written below one new caller-owned directory outside the source checkout.
No credential value is written to the handoff report.
'''
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import time
from typing import Callable, Mapping, Optional, Sequence
from urllib.parse import urlsplit
from WeRobotCore.bootstrap.macos_product import MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER, MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER, MACOS_PRODUCT_HELPER_RELATIVE_PATH, MACOS_PRODUCT_TEAM_IDENTIFIER
from WeRobotCore.packaging.macos_control import MACOS_CONTROL_EXECUTABLE_NAME, MACOS_CONTROL_FRONTEND_RELATIVE_PATH, MACOS_PRODUCTION_BUILD_CHANNEL, assemble_unsigned_macos_control_bundle, inspect_macos_control_bundle
from WeRobotCore.packaging.macos_helper import MACOS_HELPER_APP_NAME, MACOS_HELPER_EXECUTABLE_NAME, MacOSHelperBuildRequest, build_signed_macos_helper
MACOS_AGENT_PLUGIN_HANDOFF_KIND = 'yokoagent-macos-rpa-plugin-handoff'
MACOS_AGENT_PLUGIN_RELEASE_CHANNEL = 'agent_generic'
MACOS_AGENT_PLUGIN_BUILD_CHANNEL = MACOS_PRODUCTION_BUILD_CHANNEL
MACOS_AGENT_PLUGIN_CAPABILITY_WAVE = 'none'
MACOS_AGENT_PLUGIN_ARCHITECTURE = 'arm64'
MACOS_AGENT_PLUGIN_MINIMUM_SYSTEM_VERSION = '13.0'
MACOS_AGENT_PLUGIN_RUNTIME_CONTRACT_VERSION = '1.0'
MACOS_AGENT_PLUGIN_DRIVER_API_VERSION = '1.0'
MACOS_CONTROL_APP_NAME = 'YokoWebot RPA Control.app'
MACOS_RELEASE_STATE_NAME = 'release-state.json'
MACOS_RELEASE_REPORT_NAME = 'handoff-report.json'
_APP_VERSION = re.compile('^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$')
_BUILD_VERSION = re.compile('^[A-Za-z0-9][A-Za-z0-9.-]{0,63}$')
_SOURCE_COMMIT = re.compile('^[0-9a-f]{40}$')
_SOURCE_REF = re.compile('^origin/[A-Za-z0-9][A-Za-z0-9._/-]{0,190}$')
_NOTARY_PROFILE = re.compile('^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$')
_DEVELOPER_IDENTITY = re.compile('^Developer ID Application: .+ \\(' + re.escape(MACOS_PRODUCT_TEAM_IDENTIFIER) + '\\)$')
_MACHO_MAGICS = frozenset((b'\xfe\xed\xfa\xce', b'\xce\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'\xcf\xfa\xed\xfe', b'\xca\xfe\xba\xbe', b'\xbe\xba\xfe\xca', b'\xca\xfe\xba\xbf', b'\xbf\xba\xfe\xca'))

class MacOSAgentPluginReleaseError(RuntimeError):
    '''A sanitized source, build, signing, notarization or package failure.'''
    pass

CommandRunner = Callable[(..., subprocess.CompletedProcess)]
EnvironmentChecker = Callable[(..., Mapping[(str, object)])]
FrontendPreparer = Callable[([
    Path,
    Path], Mapping[(str, object)])]
FrontendBuilder = Callable[(..., Mapping[(str, object)])]
HelperBuilder = Callable[(..., Mapping[(str, object)])]
ControlBuilder = Callable[(..., None)]
TestGate = Callable[(..., Mapping[(str, object)])]
MACOS_RELEASE_TEST_PATTERNS = ('test_runtime_lease_*.py', 'test_runtime_contract_*.py', 'test_runtime_product_contract.py', 'test_runtime_capability_catalog.py', 'test_control_access*.py', 'test_*control*.py', 'test_unified_scheduler_shutdown.py', 'test_macos*.py')
MACOS_FRONTEND_NODE_VERSION = 'v20.18.0'
MACOS_FRONTEND_NPM_VERSION = '10.8.2'
MACOS_FRONTEND_TEST_SCRIPTS = ('test:runtime-capabilities', 'test:session-ordering', 'test:startup')
MacOSAgentPluginReleaseRequest = dataclass(True, **('frozen',))(<NODE:12>)

def _run_command(runner = None, arguments = None, *, cwd, timeout):
    pass
# WARNING: Decompyle incomplete


def _validate_stapled_bundle(runner = None, bundle_path = None, *, cwd, attempts, sleeper):
    """Retry only Apple's read-only ticket validation with a strict bound."""
    if attempts < 1 or attempts > 5:
        raise ValueError('stapler validation attempts must be between 1 and 5')
# WARNING: Decompyle incomplete


def _write_json(path = None, value = None):
    temporary = path.with_name('.{}.tmp'.format(path.name))
    encoded = json.dumps(dict(value), False, 2, True, **('ensure_ascii', 'indent', 'sort_keys')) + '\n'
    temporary.write_text(encoded, 'utf-8', **('encoding',))
    os.replace(str(temporary), str(path))


def _sha256(path = None):
    digest = sha256()
    with None(None, None, None):
        stream = path.open('rb')
        for chunk in None((lambda : stream.read(1048576)), b''):
            digest.update(chunk)
    with None:
        if not None:
            pass
    return digest.hexdigest()


def _require_external_output(project_root = None, output_root = None):
    output = output_root.resolve()
    root = project_root.resolve(True, **('strict',))
# WARNING: Decompyle incomplete


def _verify_source(request = None, runner = None):
    project_root = request.project_root.resolve(True, **('strict',))
    head = _run_command(runner, ('git', 'rev-parse', 'HEAD'), project_root, **('cwd',)).stdout.strip()
    remote = _run_command(runner, ('git', 'rev-parse', '--verify', request.source_ref), project_root, **('cwd',)).stdout.strip()
    if head != request.source_commit or remote != request.source_commit:
        raise MacOSAgentPluginReleaseError('release source commit is not the pinned pushed ref')
    status = _run_command(runner, ('git', 'status', '--porcelain', '--untracked-files=normal'), project_root, **('cwd',)).stdout
    if status.strip():
        raise MacOSAgentPluginReleaseError('release source checkout is dirty')
    _run_command(runner, ('git', 'diff', '--check'), project_root, **('cwd',))


def _default_environment_checker(project_root = None):
    check_macos_build_environment = check_macos_build_environment
    import scripts.check_macos_build_environment
    return check_macos_build_environment(project_root, **('project_root',))


def _default_frontend_preparer(source = None, output = None):
    prepare_macos_product_frontend = prepare_macos_product_frontend
    import scripts.prepare_macos_product_frontend
    return prepare_macos_product_frontend(source, output)


def _validate_frontend_dependency_lock(package_json = None, package_lock = None):
    pass
# WARNING: Decompyle incomplete


def _default_frontend_builder(*, project_root, source_commit, work_dir, output_dir, command_runner):
    if work_dir.exists() or output_dir.exists():
        raise MacOSAgentPluginReleaseError('frontend build paths must not already exist')
    if not work_dir.parent.is_dir() or output_dir.parent.is_dir():
        raise MacOSAgentPluginReleaseError('frontend build path parent is unavailable')
    work_dir.mkdir(448, **('mode',))
    checkout = work_dir / 'checkout'
    checkout.mkdir(448, **('mode',))
    archive = work_dir / 'webot-source.tar'
    _run_command(command_runner, ('git', 'archive', '--format=tar', '--output', str(archive), source_commit, 'webot'), project_root, **('cwd',))
    if archive.is_file() or archive.stat().st_size <= 0:
        raise MacOSAgentPluginReleaseError('pinned frontend source archive was not created')
    _run_command(command_runner, ('tar', '-xf', str(archive), '-C', str(checkout)), project_root, **('cwd',))
    frontend_root = checkout / 'webot'
    package_json = frontend_root / 'package.json'
    package_lock = frontend_root / 'package-lock.json'
    if any((lambda .0: for path in .0:
if not not path.is_file():
passpath.is_symlink())((package_json, package_lock))):
        raise MacOSAgentPluginReleaseError('pinned frontend dependency contract is unavailable')
    dependency_count = _validate_frontend_dependency_lock(package_json, package_lock)
    node_version = _run_command(command_runner, ('node', '--version'), frontend_root, **('cwd',)).stdout.strip()
    npm_version = _run_command(command_runner, ('npm', '--version'), frontend_root, **('cwd',)).stdout.strip()
    if node_version != MACOS_FRONTEND_NODE_VERSION or npm_version != MACOS_FRONTEND_NPM_VERSION:
        raise MacOSAgentPluginReleaseError('formal frontend Node/npm toolchain is invalid')
    _run_command(command_runner, ('npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'), frontend_root, 1800, **('cwd', 'timeout'))
    for test_script in MACOS_FRONTEND_TEST_SCRIPTS:
        _run_command(command_runner, ('npm', 'run', test_script), frontend_root, 1800, **('cwd', 'timeout'))
    _run_command(command_runner, ('npm', 'run', 'build', '--', '--dest', str(output_dir)), frontend_root, 1800, **('cwd', 'timeout'))
    if not output_dir.is_dir():
        raise MacOSAgentPluginReleaseError('formal frontend build produced no output')
    return {
        'schemaVersion': 1,
        'sourceCommit': source_commit,
        'nodeVersion': node_version,
        'npmVersion': npm_version,
        'packageJsonSha256': _sha256(package_json),
        'packageLockSha256': _sha256(package_lock),
        'dependencyCount': dependency_count,
        'installMode': 'npm-ci-ignore-scripts',
        'testScripts': list(MACOS_FRONTEND_TEST_SCRIPTS) }


def _default_test_gate(*, project_root, command_runner):
    for pattern in MACOS_RELEASE_TEST_PATTERNS:
        _run_command(command_runner, (sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', pattern), project_root, 3600, **('cwd', 'timeout'))
    return {
        'status': 'passed',
        'patterns': list(MACOS_RELEASE_TEST_PATTERNS) }


def _default_control_builder(*, request, frontend_dir, dist_dir, work_dir, command_runner):
    _run_command(command_runner, (sys.executable, str(request.project_root / 'build_macos_control.py'), '--app-version', request.app_version, '--build-version', request.build_version, '--architecture', request.architecture, '--signing-mode', 'developer-id', '--signing-identity', request.signing_identity, '--frontend-dir', str(frontend_dir), '--dist-dir', str(dist_dir), '--work-dir', str(work_dir)), request.project_root, 1800, **('cwd', 'timeout'))


def _macho_files(bundle = None):
    result = []
# WARNING: Decompyle incomplete


def _verify_signature_output(completed = None):
    text = '{}\n{}'.format(completed.stdout, completed.stderr)
    if 'TeamIdentifier={}'.format(MACOS_PRODUCT_TEAM_IDENTIFIER) not in text and 'Authority=Developer ID Application:' not in text and 'flags=0x10000(runtime)' not in text or 'Timestamp=' not in text:
        raise MacOSAgentPluginReleaseError('release code signature is invalid')


def _verify_signed_bundle(bundle = None, *, project_root, runner):
    _run_command(runner, ('codesign', '--verify', '--deep', '--strict', str(bundle)), project_root, **('cwd',))
    _verify_signature_output(_run_command(runner, ('codesign', '--display', '--verbose=4', str(bundle)), project_root, **('cwd',)))
    helper = bundle / MACOS_PRODUCT_HELPER_RELATIVE_PATH
    _verify_signature_output(_run_command(runner, ('codesign', '--display', '--verbose=4', str(helper)), project_root, **('cwd',)))
    macho_files = _macho_files(bundle)
    for code_path in macho_files:
        architecture = _run_command(runner, ('lipo', '-archs', str(code_path)), project_root, **('cwd',)).stdout.strip()
        if architecture != MACOS_AGENT_PLUGIN_ARCHITECTURE:
            raise MacOSAgentPluginReleaseError('release contains code outside the arm64 policy')
        _verify_signature_output(_run_command(runner, ('codesign', '--display', '--verbose=4', str(code_path)), project_root, **('cwd',)))
    return len(macho_files)


def _parse_notary_result(value = None):
    pass
# WARNING: Decompyle incomplete


def _require_product_contract(report = None, request = None):
    expected = {
        'controlBundleIdentifier': MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER,
        'teamIdentifier': MACOS_PRODUCT_TEAM_IDENTIFIER,
        'controlBundleVersion': request.build_version,
        'helperBundleVersion': request.build_version,
        'appVersion': request.app_version,
        'architecture': request.architecture,
        'buildChannel': MACOS_AGENT_PLUGIN_BUILD_CHANNEL,
        'capabilityWave': MACOS_AGENT_PLUGIN_CAPABILITY_WAVE }
    if None((lambda .0 = None: for key, value in .0:
report.get(key) != value)(expected.items())):
        raise MacOSAgentPluginReleaseError('assembled product does not match the pinned release contract')


def build_macos_agent_plugin_release(request = None, *, command_runner, environment_checker, test_gate, frontend_builder, frontend_preparer, helper_builder, control_builder, platform_name, machine):
    '''Build one signed, Accepted, stapled and re-verified plugin ZIP.'''
    if not isinstance(request, MacOSAgentPluginReleaseRequest):
        raise TypeError('request must be a MacOSAgentPluginReleaseRequest')
    if not platform_name:
        pass
    current_platform = sys.platform
    if not machine:
        pass
    current_machine = platform.machine().lower()
    if current_machine == 'aarch64':
        current_machine = 'arm64'
    if current_platform != 'darwin' or current_machine != MACOS_AGENT_PLUGIN_ARCHITECTURE:
        raise MacOSAgentPluginReleaseError('Agent plugin release requires native arm64 macOS')
    project_root = request.project_root.resolve(True, **('strict',))
    _require_external_output(project_root, request.output_root)
    _verify_source(request, command_runner)
# WARNING: Decompyle incomplete

__all__ = [
    'MACOS_AGENT_PLUGIN_ARCHITECTURE',
    'MACOS_AGENT_PLUGIN_BUILD_CHANNEL',
    'MACOS_AGENT_PLUGIN_CAPABILITY_WAVE',
    'MACOS_AGENT_PLUGIN_HANDOFF_KIND',
    'MACOS_AGENT_PLUGIN_MINIMUM_SYSTEM_VERSION',
    'MACOS_AGENT_PLUGIN_RUNTIME_CONTRACT_VERSION',
    'MACOS_AGENT_PLUGIN_DRIVER_API_VERSION',
    'MACOS_AGENT_PLUGIN_RELEASE_CHANNEL',
    'MACOS_CONTROL_APP_NAME',
    'MACOS_FRONTEND_NODE_VERSION',
    'MACOS_FRONTEND_NPM_VERSION',
    'MACOS_FRONTEND_TEST_SCRIPTS',
    'MACOS_RELEASE_REPORT_NAME',
    'MACOS_RELEASE_STATE_NAME',
    'MACOS_RELEASE_TEST_PATTERNS',
    'MacOSAgentPluginReleaseError',
    'MacOSAgentPluginReleaseRequest',
    'build_macos_agent_plugin_release']
