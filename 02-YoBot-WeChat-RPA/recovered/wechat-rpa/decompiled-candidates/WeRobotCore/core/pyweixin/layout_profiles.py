# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: layout_profiles.marshal (Python 3.9)

'''
4.1.x 客户端 UI 布局 Profile：把因版本而异的"硬偏移"集中在此处管理。

设计原则：
- 每条记录用 min_build 锚定生效起点；select_profile 从高到低匹配。
- 所有偏移以 1080p 为基准值（_1080p 后缀），调用方按 screen_h 等比缩放。
- candidate_* 函数返回主 profile + 其它所有 profile 的偏移，供"点不出弹窗就换档"
  的自愈逻辑使用。
- 新增版本只需在 _PROFILES 顶部加一条，无需改调用方。

角色定位：
- 主路径是「测量锚定」（基于 ChatsButton 几何反算头像中心），完全分辨率/DPI 无关；
- 本文件提供的版本偏移只在测量锚定失败时作为坐标兜底，调用方必须传入 max_offset
  避免点击溢出到侧栏按钮区域（会触发切换 nav 副作用）。

历史记录：
- 4.1.7 头像 offset_y 约 36px（1080p），与 4.1.8 一致。
- 4.1.9 头像下移 ~15-20px，offset_y 调整为约 52px（1080p）。
- 4.1.12 新增聚合图片控件 mmui::ChatImageGroupItemView，可点击区域比单图气泡窄，
  单图沿用的 0.25 宽度处落在层叠卡片左侧边距上点不开预览，实测右移 10~20px 生效。
'''
from typing import Iterable, Optional, Tuple
WeChatBuild = Tuple[(int, int, int, int)]
_PROFILES = [
    {
        'name': '4.1.9+',
        'min_build': (4, 1, 9),
        'nav_avatar_offset_y_1080p': 52 },
    {
        'name': '4.1.0~4.1.8',
        'min_build': (4, 1, 0),
        'nav_avatar_offset_y_1080p': 36 }]
_FALLBACK = _PROFILES[-1]
_IMAGE_GROUP_CLICK_NUDGE_X_1080P = 10
_INVITE_CARD_CLICK_MAX_X_1080P = 160

def _scale_y(screen_h = None):
    return max(1, screen_h / 1080)


def image_group_click_nudge_x(screen_h = None):
    '''聚合图片点击点在 X 方向的右移像素数（相对单图的宽度1/4处）。'''
    return int(_IMAGE_GROUP_CLICK_NUDGE_X_1080P * _scale_y(screen_h))


def invite_card_click_max_x(screen_h = None):
    '''群聊邀请卡片点击点相对消息项左边界的最大 X 偏移（超过即截断到此值）。'''
    return int(_INVITE_CARD_CLICK_MAX_X_1080P * _scale_y(screen_h))


def select_profile(build = None):
    '''根据精确版本号选最匹配的 profile；未知版本回退到最低档。'''
    if build is None:
        return _FALLBACK
    target = None(build[:3])
    for p in _PROFILES:
        if target >= p['min_build']:
            return p
        return _FALLBACK


def nav_avatar_offset_y(build = None, screen_h = None):
    '''返回当前版本下、对应屏幕高度的导航栏头像 Y 偏移（相对 toolbar.top）。'''
    base = select_profile(build)['nav_avatar_offset_y_1080p']
    return int(base * _scale_y(screen_h))


def candidate_nav_avatar_offsets_y(build = None, screen_h = None, *, max_offset):
    '''
    自愈用：主 profile 偏移在前，其它已登记偏移在后（去重）。
    生效场景：测量锚定失败、精确版本探测失败、或客户端意外升级到未登记版本时，
    可顺序尝试所有候选偏移直到弹窗出现。

    边界护栏：
    - max_offset 不为 None 时，> max_offset 的候选自动跳过，防止点击溢出到
      侧栏按钮区域（触发切换 nav 副作用且打不开个人信息弹窗）。
    - 调用方应传 min(tb_height - safety, tb_width + safety)。
    '''
    scale = _scale_y(screen_h)
    primary = select_profile(build)['nav_avatar_offset_y_1080p']
    seen = {
        primary}
    primary_scaled = int(primary * scale)
    if max_offset is None or primary_scaled <= max_offset:
        yield primary_scaled
    for p in _PROFILES:
        v = p['nav_avatar_offset_y_1080p']
        if v in seen:
            continue
        seen.add(v)
        scaled = int(v * scale)
        if max_offset is not None and scaled > max_offset:
            continue
        yield scaled

