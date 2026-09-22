# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_business_routes.marshal (Python 3.9)

"""Install the reviewed macOS business Route Pack into one Control Host.

The signed IDE candidate and Agent-managed ``--no-ui`` plugin share this exact
composition. Authorization remains owned by the Host middleware and by each
route's loopback API-key dependency.
"""
from __future__ import annotations
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_business_routes_installed'

def install_macos_business_routes(runtime = None):
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    if getattr(runtime.app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS business Route Pack is already installed')
    install_macos_mvp_add_friend_routes = install_macos_mvp_add_friend_routes
    import macos_mvp_add_friend
    install_macos_mvp_auto_follow_routes = install_macos_mvp_auto_follow_routes
    import macos_mvp_auto_follow
    install_macos_mvp_chat_routes = install_macos_mvp_chat_routes
    import macos_mvp_chat
    install_macos_mvp_config_routes = install_macos_mvp_config_routes
    import macos_mvp_config
    install_macos_mvp_contacts_routes = install_macos_mvp_contacts_routes
    import macos_mvp_contacts
    install_macos_mvp_friend_request_routes = install_macos_mvp_friend_request_routes
    import macos_mvp_friend_request
    install_macos_mvp_mass_sending_routes = install_macos_mvp_mass_sending_routes
    import macos_mvp_mass_sending
    install_macos_mvp_moments_routes = install_macos_mvp_moments_routes
    import macos_mvp_moments
    install_macos_mvp_realtime_routes = install_macos_mvp_realtime_routes
    import macos_mvp_realtime
    install_macos_mvp_startup_routes = install_macos_mvp_startup_routes
    import macos_mvp_startup
    install_macos_mvp_startup_routes(runtime)
    install_macos_mvp_config_routes(runtime)
    install_macos_mvp_chat_routes(runtime)
    install_macos_mvp_contacts_routes(runtime)
    install_macos_mvp_realtime_routes(runtime)
    install_macos_mvp_mass_sending_routes(runtime)
    install_macos_mvp_auto_follow_routes(runtime)
    install_macos_mvp_moments_routes(runtime)
    install_macos_mvp_add_friend_routes(runtime)
    install_macos_mvp_friend_request_routes(runtime)
    install_macos_agent_compat_routes = install_macos_agent_compat_routes
    import macos_agent_compat
    install_macos_agent_compat_routes(runtime)
    setattr(runtime.app.state, _INSTALLATION_STATE_KEY, True)

__all__ = [
    'install_macos_business_routes']
