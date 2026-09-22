# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: ai_service_factory.marshal (Python 3.9)

from typing import Dict, Any, Optional
from ai_service_base import AIServiceBase
from agentic_service import AgenticService
from coze_service import CozeService
from coze3_service import Coze3Service
from dify_service import DifyService
from fireflow_service import FireflowService

class AIServiceFactory:
    '''智能体服务工厂类，根据配置创建相应的服务实例'''
    
    def create_service(service_type = None, config = None, agent_info = staticmethod):
        """
        创建智能体服务实例
        
        Args:
            service_type: 服务类型，如 'coze', 'dify'
            config: 服务配置
            agent_info: 智能体完整信息，包含 botId, platform 等
            
        Returns:
            AIServiceBase: 服务实例
        """
        if service_type == 'coze':
            token = config.get('coze_settings', { }).get('token')
            if not token:
                raise ValueError('未配置 Coze Token')
            return CozeService(token)
        if None == 'coze3':
            token = agent_info.get('apiToken') if agent_info else None
            project_id = agent_info.get('botId') if agent_info else None
            api_url = agent_info.get('apiUrl') if agent_info else None
            if not token:
                raise ValueError('未配置 Coze 3.0 API Token')
            if not project_id:
                raise ValueError('未配置 Coze 3.0 Project ID')
            if not api_url:
                raise ValueError('未配置 Coze 3.0 API 地址')
            return Coze3Service(token, api_url, project_id)
        if None == 'dify':
            token = None
            if agent_info and agent_info.get('botId'):
                token = agent_info.get('botId')
            base_url = config.get('baseUrl', 'http://localhost/v1')
            if not token:
                raise ValueError('未配置 Dify 秘钥')
            if not base_url:
                raise ValueError('未配置 Dify 服务器地址')
            return DifyService(token, base_url)
        if None == 'fireflow':
            token = None
            if agent_info and agent_info.get('botId'):
                token = agent_info.get('botId')
            if not token:
                raise ValueError('未配置 Fireflow API Token')
            return FireflowService(token)
        if None == 'agentic':
            api_url = agent_info.get('apiUrl') if agent_info else None
            api_token = agent_info.get('apiToken') if agent_info else None
            profile_id = agent_info.get('botId') if agent_info else None
            delivery_mode = agent_info.get('deliveryMode', 'sync_reply') if agent_info else 'sync_reply'
            response_format = agent_info.get('responseFormat', 'auto') if agent_info else 'auto'
            timeout = agent_info.get('timeoutSeconds', 300) if agent_info else 300
            retry_count = agent_info.get('retryCount', 1) if agent_info else 1
            if not api_url:
                raise ValueError('未配置 Agentic 服务地址（apiUrl）')
            if not profile_id:
                raise ValueError('未配置 Agentic 智能体 ID（botId）')
            return AgenticService(api_url, api_token, profile_id, timeout, delivery_mode, response_format, retry_count, **('timeout', 'delivery_mode', 'response_format', 'retry_count'))
        raise None(f'''不支持的服务类型: {service_type}''')

    create_service = None(create_service)

