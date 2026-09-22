# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS native adapter for the shared Moments comment workflow.'''
from __future__ import annotations
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence
from WeRobotCore.adapters.contact_storage import ExplicitPathContactStore
from WeRobotCore.adapters.wechat.macos_ax import MacOSAxDriver
from WeRobotCore.application.moments import MomentCommentRuntime, MomentRow, MomentsViewport
from WeRobotCore.application.moment_post import MomentPostRuntime
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.domain import OperationResult
from WeRobotCore.services.ai_service_factory import AIServiceFactory
from WeRobotCore.utils.logger import task_logger

class MacOSMomentCommentRuntime(MomentCommentRuntime):
    '''Keep AX details outside Windows-compatible Moments policy.'''
    
    def __init__(self = None, *, gateway, driver, contact_store, configuration_factory, state_root, ai_service_factory):
        if not isinstance(gateway, WeChatAutomationGateway):
            raise TypeError('gateway must be WeChatAutomationGateway')
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be MacOSAxDriver')
        if not isinstance(contact_store, ExplicitPathContactStore):
            raise TypeError('contact_store must be ExplicitPathContactStore')
        if not callable(configuration_factory) or callable(ai_service_factory):
            raise TypeError('runtime factories must be callable')
        if not isinstance(state_root, Path) or state_root.is_absolute():
            raise ValueError('state_root must be an absolute pathlib.Path')
        self._gateway = gateway
        self._driver = driver
        self._contacts = contact_store
        self._configuration_factory = configuration_factory
        self._state_root = state_root
        self._ai_service_factory = ai_service_factory

    
    def configuration_for(self = None, account_id = None):
        return self._configuration_factory.for_account(account_id)

    
    async def _context(self = None, account_id = None):
        await self._gateway.for_account(account_id)
        return <NODE:28>

    
    def _viewport(payload = None):
        return MomentsViewport(tuple((lambda .0: for item in .0:
MomentRow(str(item['momentId']), str(item['rawText']), bool(item.get('actionAreaVisible', False)), float(item['minY']) if item.get('minY') is not None else None, float(item['maxY']) if item.get('maxY') is not None else None, **('moment_id', 'raw_text', 'action_area_visible', 'min_y', 'max_y')))(payload.get('items', ()))), bool(payload.get('scrollMoved', False)), bool(payload.get('atEnd', False)), **('items', 'scroll_moved', 'at_end'))

    _viewport = None(_viewport)
    
    async def open(self = None, account_id = None):
        await self._context(account_id)
        context = <NODE:28>
        await self._driver.open_moments(context.instance.instance_id)
        return self._viewport(<NODE:28>)

    
    async def scroll(self = None, account_id = None, lines = None):
        await self._context(account_id)
        context = <NODE:28>
        await self._driver.scroll_moments(context.instance.instance_id, lines)
        return self._viewport(<NODE:28>)

    
    async def like(self = None, account_id = None, moment_id = None):
        await self._context(account_id)
        context = <NODE:28>
        await self._driver.like_moment(context.instance.instance_id, moment_id)
        return <NODE:28>

    
    async def comment(self = None, account_id = None, moment_id = None, content = {
        'account_id': 'str',
        'moment_id': 'str',
        'content': 'str',
        'return': 'OperationResult' }):
        await self._context(account_id)
        context = <NODE:28>
        await self._driver.comment_moment(context.instance.instance_id, moment_id, content)
        return <NODE:28>

    
    async def close(self = None, account_id = None):
        await self._context(account_id)
        context = <NODE:28>
        await self._driver.close_moments(context.instance.instance_id)
        return <NODE:28>

    
    async def resolve_allowed_friends(self = None, account_id = None, tag_ids = None):
