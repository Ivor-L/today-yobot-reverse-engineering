# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_helper.marshal (Python 3.9)

'''Caller-owned production builder for the signed macOS RPA Helper.

The historical spike script also emits host and intruder probes into a fixed
checkout directory.  This module builds only the formal Helper into fresh,
caller-owned paths.  It never selects an identity, overwrites an artifact,
notarizes, installs, launches, or touches TCC state.
'''
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
import os
from pathlib import Path
import platform
import plistlib
import re
import shutil
import subprocess
from typing import Callable, Mapping, Optional, Sequence
from WeRobotCore.bootstrap.macos_product import MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER, MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER, MACOS_PRODUCT_TEAM_IDENTIFIER
from WeRobotCore.packaging.macos_control import MACOS_HELPER_EXECUTABLE_NAME
MACOS_HELPER_APP_NAME = 'YokoRpaDistributionHelper.app'
MACOS_HELPER_MINIMUM_SYSTEM_VERSION = '13.0'
MACOS_HELPER_ICON_NAME = 'YokoWebotRPA.icns'
MACOS_HELPER_SWIFT_FRAMEWORKS = ('AppKit', 'ApplicationServices', 'CoreGraphics', 'Foundation', 'LocalAuthentication', 'ScreenCaptureKit', 'Security', 'Vision')
MACOS_HELPER_SWIFT_SOURCE_NAMES = ('IpcShared.swift', 'MacKeychainIsolationProbe.swift', 'WeChatReadRules.swift', 'WeChatContactRules.swift', 'WeChatGroupRules.swift', 'WeChatSnapshotLease.swift', 'WeChatSnapshotDispatch.swift', 'WeChatPointerAutomation.swift', 'WeChatRead.swift', 'WeChatContactRead.swift', 'WeChatGroupRead.swift', 'WeChatConversationRead.swift', 'WeChatChatProfileRead.swift', 'WeChatGroupSenderRead.swift', 'WeChatMoment.swift', 'WeChatAddFriendRules.swift', 'WeChatAddFriend.swift', 'WeChatGroupInviteRules.swift', 'WeChatGroupInvite.swift', 'WeChatSendRules.swift', 'WeChatSend.swift', 'HelperMain.swift')
_APP_VERSION = re.compile('^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$')
_BUILD_VERSION = re.compile('^[A-Za-z0-9][A-Za-z0-9.-]{0,63}$')
_DEVELOPER_IDENTITY = re.compile('^Developer ID Application: .+ \\(' + re.escape(MACOS_PRODUCT_TEAM_IDENTIFIER) + '\\)$')

class MacOSHelperBuildError(RuntimeError):
    '''A sanitized formal Helper build failure.'''
    pass

CommandRunner = Callable[(..., subprocess.CompletedProcess)]
MacOSHelperBuildRequest = dataclass(True, **('frozen',))(<NODE:12>)

def _run_command(runner = None, arguments = None, *, cwd, environment):
    pass
# WARNING: Decompyle incomplete


def _read_formal_template(project_root = None):
    template = project_root / 'spikes' / 'macos_distribution_helper' / 'HelperInfo.plist'
# WARNING: Decompyle incomplete


def _required_sources(project_root = None):
    source_root = project_root / 'spikes' / 'macos_distribution_helper' / 'Sources'
    sources = None((lambda .0 = None: for name in .0:
source_root / name)(MACOS_HELPER_SWIFT_SOURCE_NAMES))
    if any((lambda .0: for path in .0:
if not not path.is_file():
passpath.is_symlink())(sources)):
        raise MacOSHelperBuildError('formal Helper Swift sources are incomplete')
    return sources


def _verify_entitlements(path = None):
    pass
# WARNING: Decompyle incomplete


def _require_external_atomic_paths(project_root = None, output_bundle_path = None, work_dir = None):
    pass
# WARNING: Decompyle incomplete


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


def build_signed_macos_helper(request = None, *, command_runner, platform_name, machine):
    '''Build, sign and atomically publish one formal arm64 Helper.'''
    if not isinstance(request, MacOSHelperBuildRequest):
        raise TypeError('request must be a MacOSHelperBuildRequest')
    if not platform_name:
        pass
    current_platform = os.sys.platform
    if not machine:
        pass
    current_machine = platform.machine().lower()
    if current_machine == 'aarch64':
        current_machine = 'arm64'
    if current_platform != 'darwin' or current_machine != request.architecture:
        raise MacOSHelperBuildError('formal Helper must be built natively on arm64 macOS')
    project_root = request.project_root.resolve(True, **('strict',))
    _require_external_atomic_paths(project_root, request.output_bundle_path, request.work_dir)
    sources = _required_sources(project_root)
    entitlements = project_root / 'spikes' / 'macos_distribution_helper' / 'entitlements.plist'
    if entitlements.is_file() or entitlements.is_symlink():
        raise MacOSHelperBuildError('formal Helper entitlements are unavailable')
    _verify_entitlements(entitlements)
    request.work_dir.mkdir(448, **('mode',))
    module_cache = request.work_dir / 'module-cache'
    module_cache.mkdir(448, **('mode',))
    staged_bundle = request.work_dir / MACOS_HELPER_APP_NAME
    executable = staged_bundle / 'Contents' / 'MacOS' / MACOS_HELPER_EXECUTABLE_NAME
    executable.parent.mkdir(True, **('parents',))
    icon_source = project_root / 'spikes' / 'macos_distribution_helper' / MACOS_HELPER_ICON_NAME
    if icon_source.is_file() or icon_source.is_symlink():
        raise MacOSHelperBuildError('formal Helper icon is unavailable')
    resources = staged_bundle / 'Contents' / 'Resources'
    resources.mkdir(True, **('parents',))
    staged_icon = resources / MACOS_HELPER_ICON_NAME
    shutil.copyfile(icon_source, staged_icon)
    info = _read_formal_template(project_root)
    info['CFBundleShortVersionString'] = request.app_version
    info['CFBundleVersion'] = request.build_version
    info['YokoExpectedPeerIdentifier'] = MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER
    info['YokoExpectedTeamIdentifier'] = MACOS_PRODUCT_TEAM_IDENTIFIER
    (staged_bundle / 'Contents' / 'Info.plist').write_bytes(plistlib.dumps(info, True, **('sort_keys',)))
    compile_arguments = [
        'xcrun',
        'swiftc',
        '-parse-as-library',
        '-target',
        'arm64-apple-macos13.0']
    for framework in MACOS_HELPER_SWIFT_FRAMEWORKS:
        compile_arguments.extend(('-framework', framework))
    compile_arguments.extend((lambda .0: for path in .0:
str(path))(sources))
    compile_arguments.extend(('-o', str(executable)))
    environment = dict(os.environ)
    environment['CLANG_MODULE_CACHE_PATH'] = str(module_cache)
    _run_command(command_runner, compile_arguments, project_root, environment, **('cwd', 'environment'))
    if not executable.is_file():
        raise MacOSHelperBuildError('formal Helper compiler produced no executable')
    executable.chmod(493)
    _run_command(command_runner, ('codesign', '--force', '--sign', request.signing_identity, '--identifier', MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER, '--options', 'runtime', '--timestamp', '--entitlements', str(entitlements), str(staged_bundle)), project_root, **('cwd',))
    _run_command(command_runner, ('codesign', '--verify', '--deep', '--strict', str(staged_bundle)), project_root, **('cwd',))
    signature = _run_command(command_runner, ('codesign', '--display', '--verbose=4', str(staged_bundle)), project_root, **('cwd',))
    signature_text = '{}\n{}'.format(signature.stdout, signature.stderr)
    if 'TeamIdentifier={}'.format(MACOS_PRODUCT_TEAM_IDENTIFIER) not in signature_text and 'Authority=Developer ID Application:' not in signature_text and 'flags=0x10000(runtime)' not in signature_text or 'Timestamp=' not in signature_text:
        raise MacOSHelperBuildError('formal Helper signature identity is invalid')
    architecture = _run_command(command_runner, ('lipo', '-archs', str(executable)), project_root, **('cwd',))
    if architecture.stdout.strip() != request.architecture:
        raise MacOSHelperBuildError('formal Helper architecture is invalid')
    os.replace(str(staged_bundle), str(request.output_bundle_path))
    return {
        'schemaVersion': 1,
        'bundleIdentifier': MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER,
        'expectedPeerIdentifier': MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER,
        'teamIdentifier': MACOS_PRODUCT_TEAM_IDENTIFIER,
        'appVersion': request.app_version,
        'buildVersion': request.build_version,
        'architecture': request.architecture,
        'minimumSystemVersion': MACOS_HELPER_MINIMUM_SYSTEM_VERSION,
        'sourceFileCount': len(sources),
        'iconSha256': _sha256(request.output_bundle_path / 'Contents' / 'Resources' / MACOS_HELPER_ICON_NAME),
        'executableSha256': _sha256(request.output_bundle_path / 'Contents' / 'MacOS' / MACOS_HELPER_EXECUTABLE_NAME),
        'developerIdVerified': True,
        'hardenedRuntimeRequested': True,
        'timestampRequested': True }

__all__ = [
    'MACOS_HELPER_APP_NAME',
    'MACOS_HELPER_MINIMUM_SYSTEM_VERSION',
    'MACOS_HELPER_ICON_NAME',
    'MACOS_HELPER_SWIFT_FRAMEWORKS',
    'MACOS_HELPER_SWIFT_SOURCE_NAMES',
    'MacOSHelperBuildError',
    'MacOSHelperBuildRequest',
    'build_signed_macos_helper']
