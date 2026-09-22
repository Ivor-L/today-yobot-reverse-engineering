# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: sop_runner.marshal (Python 3.9)

__doc__ = '\nSOP 编排执行器 - Task System V3\n\n把"运营SOP"（一个有序动作序列）对某个目标按序执行：\n\n设计要点：\n- 复用统一调度器 + PermissionManager(EXCLUSIVE)：SOP 作为 TaskType.SOP_FLOW 接入同一个调度器，\n  与自动回复 / 群发 / 跟单等共用同一把"RPA 独占锁"，保证同一时刻只有一个 RPA 在操作微信窗口，\n  绝不另起调度器，避免两套调度器抢同一个 UI。本模块只负责"拿到锁之后按顺序跑动作"。\n- 线性顺序执行；每个动作类型声明"适用的目标类型"作为前置条件，不满足则【跳过并记日志】，\n  不中断整个 SOP（例如"拉群"只适用单聊好友，遇到群目标自动跳过）。\n- 每次运行落一条运行记录到本地（前端展示二期再做）。\n\nMVP 动作类型：\n- pull_into_group  拉群（把单聊好友拉入指定群）—— 仅单聊好友，RPA\n- greeting         发打招呼（发送话术组）       —— 单聊/群，RPA\n- create_follow    创建跟单任务                 —— 单聊/群，非RPA（仅登记未来定时任务，不占用本次持锁的窗口操作）\n'
import os
import json
import inspect
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from WeRobotCore.utils.data_manager import DataManager
# WARNING: Decompyle incomplete
