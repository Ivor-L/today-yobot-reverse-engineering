# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_control.marshal (Python 3.9)

'''Deterministic pre-sign assembly for the macOS Control application.

This module deliberately does not invoke PyInstaller, codesign, notarytool,
LaunchServices, Keychain, or WeChat.  It copies an already-built Control and an
already-signed Helper into a fresh staging directory, validates the immutable
product manifest, and publishes the unsigned outer bundle atomically.  Release
automation must sign the outer Control only after this step.
'''
from hashlib import sha256
import json
import os
from pathlib import Path
import plistlib
import shutil
import stat
import tempfile
from typing import Any, Iterator, Mapping, Optional, Tuple
from WeRobotCore.bootstrap.macos_product import MACOS_PRODUCT_HELPER_RELATIVE_PATH, MacOSProductManifestError, load_macos_product_bundle_manifest
MACOS_CONTROL_EXECUTABLE_NAME = 'YokoWebotRpaControl'
MACOS_HELPER_EXECUTABLE_NAME = 'YokoRpaDistributionHelper'
MACOS_CONTROL_FRONTEND_RELATIVE_PATH = Path('Contents/Resources/webot/dist')
MACOS_FRONTEND_RUNTIME_MODE = 'runtime_required'
MACOS_FRONTEND_STARTUP_PRESENTATION = 'classic'
MACOS_PRODUCTION_BUILD_CHANNEL = 'production'
MACOS_MVP_BUILD_CHANNEL = 'mvp-development'
MACOS_MVP_CAPABILITY_WAVES = ('r1-readonly', 'r2-directory', 'w1-auto-reply')
_MACOS_FRONTEND_REQUIRED_FILES = ('index.html', 'config.json')
_MACOS_FRONTEND_REQUIRED_DIRECTORIES = ('js', 'css', 'img', 'icon')
_FORBIDDEN_FILE_SUFFIXES = frozenset(('.dll', '.exe', '.pyd'))
_FORBIDDEN_PATH_PARTS = frozenset(('comtypes', 'pycaw', 'pywin32', 'pywinauto', 'uiautomation', 'win32', 'win32com', 'win32crypt', 'win32gui'))

class MacOSControlPackagingError(RuntimeError):
    '''A sanitized bundle assembly or artifact-layout failure.'''
    pass


def inspect_macos_frontend_directory(frontend_directory = None):
    '''Validate one strict, capability-aware frontend without exposing paths.'''
    if not isinstance(frontend_directory, Path):
        raise TypeError('frontend_directory must be a pathlib.Path')
    if frontend_directory.is_symlink():
        raise MacOSControlPackagingError('macOS frontend must not be a symlink')
# WARNING: Decompyle incomplete


def _absolute_app(path = None, field_name = None, *, must_exist):
    if not isinstance(path, Path):
        raise TypeError('{} must be a pathlib.Path'.format(field_name))
    if path.is_absolute() or path.suffix != '.app':
        raise MacOSControlPackagingError('{} must be an absolute .app bundle'.format(field_name))
# WARNING: Decompyle incomplete


def resolve_macos_control_frontend_directory(control_bundle_path = None):
    '''Resolve and validate the strict frontend embedded in one Control app.'''
    control = _absolute_app(control_bundle_path, 'control_bundle_path', True, **('must_exist',))
    frontend = control / MACOS_CONTROL_FRONTEND_RELATIVE_PATH
    inspect_macos_frontend_directory(frontend)
    return frontend.resolve(True, **('strict',))


def _inspect_macos_control_build_policy(control_bundle_path = None, expected_build_channel = None):
    if expected_build_channel not in {
        MACOS_PRODUCTION_BUILD_CHANNEL,
        MACOS_MVP_BUILD_CHANNEL}:
        raise ValueError('expected_build_channel is invalid')
# WARNING: Decompyle incomplete


def _walk_bundle(root = None):
    for path in sorted(root.rglob('*'), (lambda item: item.as_posix()), **('key',)):
        yield (path, path.relative_to(root))


def _verify_symlinks_stay_inside(root = None):
    resolved_root = root.resolve(True, **('strict',))
# WARNING: Decompyle incomplete


def _forbidden_payloads(root = None):
