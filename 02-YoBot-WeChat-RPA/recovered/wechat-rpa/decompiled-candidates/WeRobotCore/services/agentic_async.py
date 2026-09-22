# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: agentic_async.marshal (Python 3.9)

'''私域 Agent 异步回复的持久化轮询与微信投递。

客户平台在 ``POST /v1/chat`` 返回 202 和 ``jobId`` 后，RPA 只向同一
provider 的 ``GET /v1/jobs/{jobId}`` 轮询结果。这样不需要把本机 RPA 暴露到
公网，也不依赖 WebSocket。任务坐标和最终结果使用 DPAPI 加密后存入 SQLite，
RPA 重启后可以继续处理。
'''
from __future__ import annotations
import asyncio
import hashlib
import json
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, Iterator, List, Optional, Tuple
from urllib.parse import quote
import aiohttp
from aiohttp import ClientSession, ClientTimeout, TCPConnector
from WeRobotCore.utils.dpapi_crypto import decrypt, encrypt
DEFAULT_MAX_ATTEMPTS = 12
DEFAULT_MAX_AGE_SECONDS = 259200
DEFAULT_DEAD_RETENTION_SECONDS = 604800
RETRY_DELAYS_SECONDS = (5, 30, 120, 600, 1800, 3600)
RETRYABLE_HTTP_STATUSES = {
    408,
    425,
    429,
    500,
    502,
    503,
    504}

def _background_delivery_senders():
    '''Resolve delayed-delivery ports without loading a platform Driver.

    The Mac product binds Context-backed text/media senders on the global V3
    adapter.  Windows installations that have not bound the new media port
    continue through the mature lazy ``api.chat`` fallback below.
    '''
    pass
# WARNING: Decompyle incomplete


def _operation_succeeded(result = None):
    if isinstance(result, dict):
        return result.get('success', False) is True
    return None(result, 'success', False) is True


def _operation_error(result = None):
    if isinstance(result, dict):
        if not result.get('message') and result.get('error'):
            pass
        return str('微信发送失败')
    if not getattr(result, 'message', '') and getattr(getattr(result, 'code', None), 'value', ''):
        pass
    return None('微信发送失败')

AgenticAsyncJobRecord = dataclass(True, **('frozen',))(<NODE:12>)
AgenticAsyncPollResult = dataclass(True, **('frozen',))(<NODE:12>)

def _clamp_retry_after(value = None, default = None):
    pass
# WARNING: Decompyle incomplete


class AgenticAsyncJobStore:
    '''独立 SQLite 队列，避免改变同步回复和仅消费队列的状态机。'''
    
    def __init__(self = None, db_path = None, *, now, max_attempts, max_age_seconds):
        if not db_path:
            pass
        self.db_path = Path(Path.home() / '.yokowebot' / 'agentic_async_jobs.sqlite3')
        self.db_path.parent.mkdir(True, True, **('parents', 'exist_ok'))
        self.now = now
        self.max_attempts = max(1, int(max_attempts))
        self.max_age_seconds = max(60, int(max_age_seconds))
        self._ensure_schema()

    
    def _connect(self = None):
        connection = sqlite3.connect(str(self.db_path), 10, **('timeout',))
    # WARNING: Decompyle incomplete

    _connect = None(_connect)
    
    def _ensure_schema(self = None):
        with self._connect() as connection:
            connection.execute('PRAGMA journal_mode=WAL')
            connection.executescript("\n                CREATE TABLE IF NOT EXISTS agentic_async_job (\n                    record_id TEXT PRIMARY KEY,\n                    api_url TEXT NOT NULL,\n                    profile_id TEXT NOT NULL,\n                    payload TEXT NOT NULL,\n                    payload_digest TEXT NOT NULL,\n                    result_payload TEXT,\n                    status TEXT NOT NULL CHECK(status IN ('pending', 'ready', 'dead')),\n                    next_item_index INTEGER NOT NULL DEFAULT 0,\n                    attempts INTEGER NOT NULL DEFAULT 0,\n                    created_at REAL NOT NULL,\n                    updated_at REAL NOT NULL,\n                    next_attempt_at REAL,\n                    expires_at REAL NOT NULL,\n                    lease_until REAL,\n                    last_error TEXT,\n                    http_status INTEGER\n                );\n                CREATE INDEX IF NOT EXISTS idx_agentic_async_job_due\n                    ON agentic_async_job(status, next_attempt_at, lease_until);\n                ")
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def _encode(value = None):
        plain = json.dumps(value, False, True, (',', ':'), **('ensure_ascii', 'sort_keys', 'separators'))
        if not encrypt(plain):
            pass
        return plain

    _encode = None(_encode)
    
    def _decode(value = None):
        if not value:
            return None
        if not decrypt(value):
            pass
        decoded = None.loads('')
        if not isinstance(decoded, dict):
            raise ValueError('异步回复记录格式无效')
        return decoded

    _decode = None(_decode)
    
    def _record_id(envelope = None):
        if not envelope.get('idempotencyKey') and envelope.get('requestId'):
            pass
        identity = str('').strip()
        if not identity:
            raise ValueError('异步回复缺少 requestId/idempotencyKey')
        return hashlib.sha256(identity.encode('utf-8')).hexdigest()

    _record_id = None(_record_id)
    
    def _job_payload(envelope = None, job_spec = None, quote_message_id = staticmethod):
        if not job_spec.get('jobId'):
            pass
        job_id = str('').strip()
        if job_id and len(job_id) > 128 or any((lambda .0: for char in .0:
ord(char) < 32)(job_id)):
            raise ValueError('客户平台返回了无效 jobId')
        conversation = envelope.get('conversation')
        if not isinstance(conversation, dict):
            raise ValueError('异步回复缺少会话坐标')
        if not conversation.get('accountId'):
            pass
        account_id = str('').strip()
        if not conversation.get('sessionName'):
            pass
        session_name = str('').strip()
        if not account_id or session_name:
            raise ValueError('异步回复缺少 accountId/sessionName')
        if not envelope.get('requestId'):
            pass
        if not envelope.get('idempotencyKey'):
            pass
        if not conversation.get('sessionId'):
            pass
        payload = {
            'jobId': job_id,
            'requestId': str(''),
            'idempotencyKey': str(''),
            'conversation': {
                'accountId': account_id,
                'sessionId': str(''),
                'sessionName': session_name,
                'isGroup': bool(conversation.get('isGroup', False)) } }
        if not quote_message_id:
            pass
        normalized_quote_id = str('').strip()
        if normalized_quote_id:
            if len(normalized_quote_id) > 256 or any((lambda .0: for char in .0:
ord(char) < 32)(normalized_quote_id)):
                raise ValueError('异步回复包含无效引用消息 ID')
            payload['quoteMessageId'] = normalized_quote_id
        return payload

    _job_payload = None(_job_payload)
    
    def _row_to_record(self = None, row = None):
        if not self._decode(str(row['payload'])):
            pass
        return AgenticAsyncJobRecord(str(row['record_id']), str(row['api_url']), str(row['profile_id']), { }, self._decode(row['result_payload']), str(row['status']), int(row['next_item_index']), int(row['attempts']), float(row['created_at']), float(row['updated_at']), float(row['next_attempt_at']) if row['next_attempt_at'] is not None else None, float(row['expires_at']), str(row['last_error']) if row['last_error'] else None, int(row['http_status']) if row['http_status'] is not None else None, **('record_id', 'api_url', 'profile_id', 'job', 'result', 'status', 'next_item_index', 'attempts', 'created_at', 'updated_at', 'next_attempt_at', 'expires_at', 'last_error', 'http_status'))

    
    def enqueue(self = None, api_url = None, profile_id = None, envelope = None, job_spec = {
        'quote_message_id': None }, *, quote_message_id):
        now = self.now()
        record_id = self._record_id(envelope)
        payload = self._job_payload(envelope, job_spec, quote_message_id, **('quote_message_id',))
        plain = json.dumps(payload, False, True, (',', ':'), **('ensure_ascii', 'sort_keys', 'separators'))
        digest = hashlib.sha256(plain.encode('utf-8')).hexdigest()
        retry_after = _clamp_retry_after(job_spec.get('retryAfterSeconds'))
    # WARNING: Decompyle incomplete

    
    def get(self = None, record_id = None):
        with self._connect() as connection:
            row = connection.execute('SELECT * FROM agentic_async_job WHERE record_id = ?', (record_id,)).fetchone()
            None(None, None, None)
        with None:
            if not None:
                pass
        if row is not None:
            return self._row_to_record(row)

    
    def claim_due(self = None, limit = None, lease_seconds = None):
        now = self.now()
    # WARNING: Decompyle incomplete

    
    def mark_pending(self = None, record_id = None, retry_after_seconds = None, *, http_status):
        now = self.now()
        with self._connect() as connection:
            row = connection.execute('SELECT expires_at FROM agentic_async_job WHERE record_id = ?', (record_id,)).fetchone()
            if row is None:
                pass
            None(None, None, None)
            return 'missing'
            expired = now >= float(row['expires_at'])
            status = 'dead' if expired else 'pending'
            connection.execute('\n                UPDATE agentic_async_job\n                SET status = ?, updated_at = ?, next_attempt_at = ?, lease_until = NULL,\n                    last_error = ?, http_status = ?\n                WHERE record_id = ?\n                ', (status, now, None if expired else now + _clamp_retry_after(retry_after_seconds), '异步任务已过期' if expired else None, http_status, record_id))
            None(None, None, None)
        with None:
            if not None:
                pass
        return status

    
    def mark_ready(self = None, record_id = None, result = None):
        if not isinstance(result, dict):
            raise ValueError('异步任务结果必须是对象')
        now = self.now()
        with self._connect() as connection:
            connection.execute("\n                UPDATE agentic_async_job\n                SET result_payload = ?, status = 'ready', attempts = 0, updated_at = ?,\n                    next_attempt_at = ?, last_error = NULL, http_status = 200\n                WHERE record_id = ? AND status != 'dead'\n                ", (self._encode(result), now, now, record_id))
            None(None, None, None)
        with None:
            if not None:
                pass
        return self.get(record_id)

    
    def advance_item(self = None, record_id = None, next_item_index = None):
        with self._connect() as connection:
            connection.execute("\n                UPDATE agentic_async_job\n                SET next_item_index = ?, updated_at = ?\n                WHERE record_id = ? AND status = 'ready'\n                ", (max(0, int(next_item_index)), self.now(), record_id))
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def mark_done(self = None, record_id = None):
        with self._connect() as connection:
            connection.execute('DELETE FROM agentic_async_job WHERE record_id = ?', (record_id,))
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def mark_failed(self = None, record_id = None, error = None, *, http_status, permanent):
        now = self.now()
        with self._connect() as connection:
            row = connection.execute('SELECT status, attempts, expires_at FROM agentic_async_job WHERE record_id = ?', (record_id,)).fetchone()
            if row is None:
                pass
            None(None, None, None)
            return 'missing'
            attempts = int(row['attempts']) + 1
            if not permanent and attempts >= self.max_attempts:
                pass
            dead = now >= float(row['expires_at'])
            current_status = str(row['status'])
            if dead:
                pass
            elif current_status == 'ready':
                pass
            
            status = 'pending'
            delay = RETRY_DELAYS_SECONDS[min(attempts - 1, len(RETRY_DELAYS_SECONDS) - 1)]
            connection.execute('\n                UPDATE agentic_async_job\n                SET status = ?, attempts = ?, updated_at = ?, next_attempt_at = ?,\n                    lease_until = NULL, last_error = ?, http_status = ?\n                WHERE record_id = ?\n                ', (status, attempts, now, None if dead else now + delay, str(error)[:1000], http_status, record_id))
            'ready'(None, None, None)
        with None:
            if not 'dead':
                pass
        return status

    
    def retry_dead(self = None, record_id = None):
        now = self.now()
        where = "status = 'dead'"
        params = [
            now,
            now]
        if record_id:
            where += ' AND record_id = ?'
            params.append(record_id)
        with self._connect() as connection:
            cursor = connection.execute(f'''\n                UPDATE agentic_async_job\n                SET status = CASE WHEN result_payload IS NULL THEN \'pending\' ELSE \'ready\' END,\n                    attempts = 0, updated_at = ?, next_attempt_at = ?, lease_until = NULL,\n                    last_error = NULL, http_status = NULL\n                WHERE {where}\n                ''', tuple(params))
            None(None, None, None)
            return int(cursor.rowcount)
            with None:
                if not None:
                    pass

    
    def purge_expired_dead(self = None, retention_seconds = None):
        cutoff = self.now() - max(3600, int(retention_seconds))
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM agentic_async_job WHERE status = 'dead' AND updated_at < ?", (cutoff,))
            None(None, None, None)
            return int(cursor.rowcount)
            with None:
                if not None:
                    pass

    
    def status(self = None, limit = None):
        with self._connect() as connection:
            counts = (lambda .0: pass# WARNING: Decompyle incomplete
)(connection.execute('SELECT status, COUNT(*) AS count FROM agentic_async_job GROUP BY status').fetchall())
            rows = connection.execute("\n                SELECT record_id, api_url, profile_id, status, next_item_index, attempts,\n                       created_at, updated_at, next_attempt_at, expires_at, last_error, http_status\n                FROM agentic_async_job\n                ORDER BY CASE status WHEN 'dead' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END, created_at\n                LIMIT ?\n                ", (max(1, min(int(limit), 100)),)).fetchall()
            None(None, None, None)
        with None:
            if not None:
                pass
        return {
            'pending': counts.get('pending', 0),
            'ready': counts.get('ready', 0),
            'dead': counts.get('dead', 0),
            'records': (lambda .0: for row in .0:
passcontinuestr(row['record_id'])[{
'id': str(row['api_url']),
'apiUrl': str(row['profile_id']),
'profileId': str(row['status']),
'status': int(row['next_item_index']),
'nextItemIndex': int(row['attempts']),
'attempts': float(row['created_at']),
'createdAt': float(row['updated_at']),
'updatedAt': float(row['next_attempt_at']),
'nextAttemptAt': None,
'expiresAt': float(row['expires_at']),
'lastError': str(row['last_error']) if row['last_error'] else None,
'httpStatus': int(row['http_status']) if row['http_status'] is not None else None }])(rows) }


_default_store: 'Optional[AgenticAsyncJobStore]' = None

def get_default_agentic_async_store():
    global _default_store
    if _default_store is None:
        _default_store = AgenticAsyncJobStore()
    return _default_store


def _remember_sent_text(record = None, content = None):
    '''复用自动回复缓存，避免异步发出的本人消息再次触发回复。'''
    pass
# WARNING: Decompyle incomplete


async def poll_agentic_async_job(record = None, api_token = None, *, timeout):
    headers = {
        'Accept': 'application/json' }
    if api_token:
        headers['Authorization'] = f'''Bearer {api_token}'''
    if not record.job.get('jobId'):
        pass
    job_id = quote(str(''), '', **('safe',))
    url = f'''{record.api_url.rstrip('/')}/v1/jobs/{job_id}'''
# WARNING: Decompyle incomplete


async def deliver_agentic_async_result(record = None, store = None):
