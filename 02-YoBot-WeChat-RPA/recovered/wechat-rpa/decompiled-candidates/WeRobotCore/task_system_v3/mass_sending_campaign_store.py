# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: mass_sending_campaign_store.marshal (Python 3.9)

__doc__ = '\n群发活动（Campaign）持久化存储 - Task System V3\n\n一个"群发活动"= 用户一次创建的群发任务（如 1300 人），在自动分组下会被切分为\n若干批次（每批一个独立调度任务）。本模块负责把这些批次串成一个整体，提供：\n\n- 活动创建时落盘（含每个批次的 task_id 与参数，便于中断后整体恢复）\n- 活动状态管理（running / interrupted / completed / cancelled）\n- 重启后查询未完成活动，对其批次执行"campaign 闸门"：中断态下批次 fire 即自我挂起\n- 整体进度聚合（读取各批次的断点进度文件求和）\n\n设计为单进程 asyncio 下使用，JSON 文件存储，读写即时落盘。\n'
import json
import os
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List
# WARNING: Decompyle incomplete
