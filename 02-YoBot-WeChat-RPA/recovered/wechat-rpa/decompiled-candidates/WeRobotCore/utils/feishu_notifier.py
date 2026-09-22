# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: feishu_notifier.marshal (Python 3.9)

import json
import time
from typing import Optional, Dict, Tuple
import requests
from config_manager import ConfigManager

class FeishuNotifier:
    
    def __init__(self = None, timeout = None):
        self.timeout = timeout
        self.base_url = 'https://open.feishu.cn/open-apis'
        self._token_cache = { }

    
    def _get_feishu_config(self = None):
        cfg = ConfigManager.get_active_instance_config().load_config('feishu_settings', True, **('use_cache',))
        if isinstance(cfg, dict):
            return cfg.get('feishu_settings', { })

    
    def is_configured(self = None):
        cfg = self._get_feishu_config()
        if not cfg.get('appId'):
            pass
        app_id = ''.strip()
        if not cfg.get('appSecret'):
            pass
        app_secret = ''.strip()
        if not cfg.get('phone'):
            pass
        phone = ''.strip()
        if app_id.startswith('cli_') and len(app_secret) > 10 and len(phone) == 11:
            pass
        return phone.isdigit()

    
    def _get_tenant_access_token(self = None):
        cfg = self._get_feishu_config()
        if not cfg.get('appId'):
            pass
        app_id = ''.strip()
        if not cfg.get('appSecret'):
            pass
        app_secret = ''.strip()
        if not app_id or app_secret:
            return None
        cache_key = f'''{None}:{app_secret}'''
        cached = self._token_cache.get(cache_key)
        if cached and time.time() - cached['time'] < 5400 and cached.get('token'):
            return cached['token']
        url = f'''{None.base_url}/auth/v3/tenant_access_token/internal'''
        resp = requests.post(url, {
            'app_id': app_id,
            'app_secret': app_secret }, self.timeout, **('json', 'timeout'))
        print(f'''飞书获取tenant_access_token响应: {resp.status_code}, {resp.text}''')
        if resp.status_code != 200:
            return None
        data = None.json()
        token = data.get('tenant_access_token')
        if token:
            self._token_cache[cache_key] = {
                'token': token,
                'time': time.time() }
        return token

    
    def _batch_get_id(self = None, token = None, mobile = None, id_type = ('user_id',)):
        url = f'''{self.base_url}/contact/v3/users/batch_get_id'''
        headers = {
            'Authorization': f'''Bearer {token}''',
            'Content-Type': 'application/json; charset=utf-8' }
        params = {
            'user_id_type': id_type } if id_type else { }
        body = {
            'mobiles': [
                mobile] }
        resp = requests.post(url, headers, params, body, self.timeout, **('headers', 'params', 'json', 'timeout'))
    # WARNING: Decompyle incomplete

    
    def _send_text_to_user(self, token = None, user_id = None, id_type = None, text = {
        'token': str,
        'user_id': str,
        'id_type': str,
        'text': str,
        'return': Tuple[(bool, Dict)] }):
        url = f'''{self.base_url}/im/v1/messages'''
        headers = {
            'Authorization': f'''Bearer {token}''',
            'Content-Type': 'application/json; charset=utf-8' }
        payload = {
            'receive_id': user_id,
            'msg_type': 'text',
            'content': json.dumps({
                'text': text }, False, **('ensure_ascii',)) }
        params = {
            'receive_id_type': id_type }
        resp = requests.post(url, headers, params, payload, self.timeout, **('headers', 'params', 'json', 'timeout'))
    # WARNING: Decompyle incomplete

    
    def _format_mobile(self = None, phone = None):
        if not phone:
            return None
        p = None.strip()
        if not p:
            return None
        if None.startswith('+'):
            return p
        return f'''{p}'''

    
    def _send_text_to_mobile(self = None, token = None, mobile = None, text = {
        'token': str,
        'mobile': str,
        'text': str,
        'return': Tuple[(bool, Dict)] }):
        url = f'''{self.base_url}/im/v1/messages'''
        headers = {
            'Authorization': f'''Bearer {token}''',
            'Content-Type': 'application/json; charset=utf-8' }
        payload = {
            'receive_id': mobile,
            'msg_type': 'text',
            'content': json.dumps({
                'text': text }, False, **('ensure_ascii',)) }
        params = {
            'receive_id_type': 'mobile' }
        resp = requests.post(url, headers, params, payload, self.timeout, **('headers', 'params', 'json', 'timeout'))
    # WARNING: Decompyle incomplete

    
    def send_notification(self = None, content = None, scene = None):
        cfg = self._get_feishu_config()
        if not cfg.get('phone'):
            pass
        phone = ''.strip()
        token = self._get_tenant_access_token()
        if not token:
            return {
                'success': False,
                'reason': 'token_error' }
        if not None:
            return {
                'success': False,
                'reason': 'phone_empty' }
        text = f'''{scene}] {content}'''
        (open_id, detail) = self._batch_get_id(token, phone, 'open_id')
        if not open_id:
            return {
                'success': False,
                'reason': 'user_lookup_failed',
                'detail': detail,
                'id_type': 'open_id' }
        (ok, send_detail) = None._send_text_to_user(token, open_id, 'open_id', text)
        return {
            'success': ok,
            'reason': None if ok else 'send_failed',
            'detail': send_detail,
            'id_type': 'open_id' }


