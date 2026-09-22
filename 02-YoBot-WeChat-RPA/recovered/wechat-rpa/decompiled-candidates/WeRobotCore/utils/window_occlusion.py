# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: window_occlusion.marshal (Python 3.9)

'''Conservative top-level window occlusion detection for Windows.

The detector intentionally fails open: only a confidently computed near-zero
visible area is reported as fully occluded.  Unsupported platforms, stale
window handles, transparent-window ambiguity, API failures, and time-budget
exhaustion all produce ``UNKNOWN`` so callers can preserve existing behavior.

No UI Automation API is used here.  The implementation only reads User32,
DWM, and GDI window metadata.
'''
from __future__ import annotations
import ctypes
import os
import time
from ctypes import wintypes
from dataclasses import dataclass
from enum import Enum
from typing import Iterable, List, Optional, Sequence, Tuple
Rect = Tuple[(int, int, int, int)]

class WindowOcclusionState(Enum, str):
    VISIBLE = 'visible'
    FULLY_OCCLUDED = 'fully_occluded'
    UNKNOWN = 'unknown'

WindowOcclusionResult = dataclass(True, **('frozen',))(<NODE:12>)

def _intersection(first = None, second = None):
    left = max(first[0], second[0])
    top = max(first[1], second[1])
    right = min(first[2], second[2])
    bottom = min(first[3], second[3])
    if right <= left or bottom <= top:
        return None
    return (None, top, right, bottom)


def _rect_area(rect = None):
    return max(0, rect[2] - rect[0]) * max(0, rect[3] - rect[1])


def _rect_union_area(rects = None):
    '''Return the exact union area of axis-aligned rectangles.'''
    if not rects:
        return 0
    x_points = None((lambda .0: pass# WARNING: Decompyle incomplete
)(rects))
    total = 0
    for y_intervals in zip(x_points, x_points[1:]):
        (left, right) = None
        if right <= left:
            continue
        if not y_intervals:
            continue
        (interval_top, interval_bottom) = y_intervals[0]
        covered_y = 0
        for top, bottom in y_intervals[1:]:
            if top <= interval_bottom:
                interval_bottom = max(interval_bottom, bottom)
                continue
            covered_y += interval_bottom - interval_top
            interval_top = top
            interval_bottom = bottom
        covered_y += interval_bottom - interval_top
        total += (right - left) * covered_y
    return total


def _calculate_visible_area(target_rects = None, occluder_rects = None):
