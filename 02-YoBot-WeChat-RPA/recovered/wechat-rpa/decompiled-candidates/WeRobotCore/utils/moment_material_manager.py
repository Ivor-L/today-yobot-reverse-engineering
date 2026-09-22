# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: moment_material_manager.marshal (Python 3.9)

import asyncio
from pathlib import Path
from typing import List, Optional

class MomentMaterialManager:
    _instance = None
    
    def __new__(cls = None):
        if cls._instance is None:
            cls._instance = super(MomentMaterialManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    
    def __init__(self):
        if getattr(self, '_initialized', False):
            return None
        self._initialized = None
        self._lock = asyncio.Lock()
        DataManager = DataManager
        import WeRobotCore.utils.data_manager
        self._base_dir = DataManager.get_data_dir() / 'moment_material'
        self._base_dir.mkdir(True, True, **('parents', 'exist_ok'))

    
    def list_groups(self = None, plan_name = None):
        plan_path = self._base_dir / plan_name
        if not plan_path.exists() or plan_path.is_dir():
            return []
        return (lambda 