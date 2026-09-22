# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: customer_api_config.marshal (Python 3.9)

import os
import json
from typing import Dict, Any, Optional

class CustomerAPIConfig:
    '''客户API配置管理类'''
    _instance = None
    _DEFAULT_CONFIG = {
        'version': '1.0',
        'global': {
            'timeout': 60,
            'retry_attempts': 3 },
        'customers': {
            'cs_7a9f2e8b4c6d1x3y': {
                'enabled': True,
                'name': 'Kailash',
                'api_type': 'validate_mobile',
                'base_url': 'https://admin.locxx.com/lcn-api',
                'endpoints': {
                    'get_friends': '/api/external/requirement/validate/mobileList',
                    'add_friend': '/friends/add' },
                'auth': {
                    'type': 'token',
                    'header_name': 'token',
                    'key': 'a3f8e72b1c9d0456e7b2a8f0d3c6e591' },
                'custom_headers': {
                    'content-type': 'application/json;charset=UTF-8' },
                'response_mapping': {
                    'wxid_field': 'mobile',
                    'remark_field': 'noteName',
                    'tags_field': 'tag' } },
            'cs_9b2f8e4a7c1d5x8z': {
                'enabled': True,
                'name': '芯链芯',
                'api_type': 'validate_mobile',
                'base_url': 'https://yokoai.chipsresale.com',
                'endpoints': {
                    'get_friends': '/get_new_user',
                    'add_friend': '/friends/add' },
                'auth': {
                    'type': 'api_key',
                    'header_name': 'Authorization',
                    'key': 'pez2zmyo5o1e07s7waweytfif9ci8pli' },
                'custom_headers': {
                    'content-type': 'application/json;charset=UTF-8' },
                'response_mapping': {
                    'wxid_field': 'mobile',
                    'remark_field': 'noteName',
                    'tags_field': 'tag' },
                'custom_features': {
                    'auto_moment_comment': {
                        'collect_wx_id': True },
                    'auto_reply': {
                        'extract_friend_tags': True } } } } }
    
    def __new__(cls = None):
        if cls._instance is None:
            cls._instance = super(CustomerAPIConfig, cls).__new__(cls)
            cls._instance._config = None
            cls._instance._load_config()
        return cls._instance

    
    def _load_config(self):
        '''加载配置文件'''
        self._config = self._DEFAULT_CONFIG.copy()

    
    def get_customer_feature_config(self = None, customer_id = None, feature_name = None):
        '''获取客户的特定功能配置'''
        customer_config = self.get_customer_config(customer_id)
        if customer_config:
            return customer_config.get('custom_features', { }).get(feature_name, { })

    
    def is_feature_enabled(self = None, customer_id = None, feature_name = None, setting_name = {
        'customer_id': str,
        'feature_name': str,
        'setting_name': str,
        'return': bool }):
        '''检查客户的特定功能设置是否启用'''
        feature_config = self.get_customer_feature_config(customer_id, feature_name)
        return feature_config.get(setting_name, False)

    
    def get_global_config(self = None):
        '''获取全局配置'''
        return self._config.get('global', { })

    
    def get_customer_config(self = None, customer_id = None):
        '''获取指定客户的配置'''
        customers = self._config.get('customers', { })
        customer_config = customers.get(customer_id)
        if customer_config and customer_config.get('enabled', False):
            return customer_config

    
    def get_all_enabled_customers(self = None):
