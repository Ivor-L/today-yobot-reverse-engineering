# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: account_online_monitor.marshal (Python 3.9)

__doc__ = '账号在线状态检测 + 掉线飞书通知（群发任务与会话监听共用）。\n\n把"微信是否掉线"的判定与"掉线后通知"统一到一处，避免群发任务、会话监听各写一份：\n\n- get_account_status(account_id, window_handle)：返回在线、登录页、实例丢失或未知状态。\n  除句柄/进程有效性外，还使用同一微信 PID 下可见的 mmui::LoginWindow 作为\n  “需要扫码/确认登录”的正向证据。\n- is_account_online(account_id, window_handle)：兼容旧调用方的布尔接口。\n  检测自身异常时返回 True，避免误判把正常任务/监听中断。\n\n- notify_offline(account_id, scene)：检测到掉线时发送飞书通知。仅在飞书已配置时发送，\n  并按账号做冷却去重（默认 30 分钟），避免群发批次/监听循环高频触发刷屏。\n\n飞书发送是同步阻塞（requests），在 asyncio 场景请用 run_in_executor 调用 notify_offline。\n'
import threading
import time
from datetime import datetime
# WARNING: Decompyle incomplete
