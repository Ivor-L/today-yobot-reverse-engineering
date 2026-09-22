# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: supabase_client.marshal (Python 3.9)

from __future__ import annotations
import os
import requests
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
DEFAULT_SEALED_DAYS = 540

class SupabaseManager:
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL', 'http://110.40.199.92:8000')
        self.key = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM2NDM4NDAwLAogICJleHAiOiAxODk0MjA0ODAwCn0.MOT14NAJ1OEJYYd8jy9yDmVKGdNbaWhuChddSoUWlcY')
        self._client = None

    
    def client(self = None):
        if not self._client:
            create_client = create_client
            import supabase
            if not self.url or self.key:
                raise ValueError('Supabase配置未设置')
            self._client = create_client(self.url, self.key)
        return self._client

    client = None(client)
    
    async def activate_and_verify_license(self = None, activation_code = None, machine_code = None):
        """验证并激活授权。

        【安全改造】激活逻辑已迁移到 YokoAgent Server：客户端不再用 anon key 直连
        Supabase 写库，而是调用服务端 POST /v1/rpa/legacy/activate，由服务端以
        service_role 执行全部校验与写入（封存期/有效期/状态机/设备授权）。
        返回结构与历史保持一致：
            {'valid': bool, 'message'?: str, 'data'?: {'expired_at', 'license_type'}}
        """
        api_base = os.environ.get('YOKO_API_BASE', 'http://110.40.199.92:3000')
    # WARNING: Decompyle incomplete

    
    async def unbind_license_with_machine_code(self = None, activation_code = None, machine_code = None):
        """根据激活码和机器码双重验证解绑设备。

        【安全改造】解绑逻辑已迁移到 YokoAgent Server POST /v1/rpa/legacy/unbind，
        客户端不再直连 Supabase 写库。返回结构与历史保持一致：
            {'success': bool, 'message': str, 'data'?: {'remain_unbind'}}
        """
        api_base = os.environ.get('YOKO_API_BASE', 'http://110.40.199.92:3000')
    # WARNING: Decompyle incomplete

    
    async def get_license_info(self = None, activation_code = None):
        '''获取授权信息，包括机器码和剩余解绑次数'''
        pass
    # WARNING: Decompyle incomplete

    
    async def unbind_license(self = None, activation_code = None):
        '''根据激活码解绑设备'''
        pass
    # WARNING: Decompyle incomplete

    
    async def verify_license(self = None, machine_code = None):
        '''验证授权信息'''
        pass
    # WARNING: Decompyle incomplete

    
    async def get_unbind_remain(self = None, activation_code = None):
        '''查询激活码剩余可解绑次数'''
        pass
    # WARNING: Decompyle incomplete

    
    async def update_activation_code_remark(self = None, code = None, remark = None):
        '''更新激活码备注'''
        pass
    # WARNING: Decompyle incomplete

    
    async def verify_agent_login(self = None, name = None, password = None):
        '''验证供应商登录'''
        pass
    # WARNING: Decompyle incomplete

    
    async def agent_exists(self = None, name = None):
        pass
    # WARNING: Decompyle incomplete

    
    async def get_agent_activation_codes(self = None, agent_name = None):
        '''
        根据代理商名称查询其全部激活码及绑定设备信息
        返回每条激活码的：激活码、生成时间、激活状态、到期时间、有效期天数、绑定机器码
        时间全部转为东八区
        '''
        pass
    # WARNING: Decompyle incomplete


