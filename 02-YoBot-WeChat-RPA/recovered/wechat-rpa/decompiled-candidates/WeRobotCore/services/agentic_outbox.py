# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: agentic_outbox.marshal (Python 3.9)

'''私域Agent可靠投递存储。

仅服务于 ``consume_only`` 渠道，不改变同步回复以及其他 AI service 的执行方式。
消息先写入 SQLite，再投递到客户接口；网络故障时由后台任务按指数退避恢复。
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
from typing import Any, Callable, Dict, Iterator, List, Optional, Tuple
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
AgenticOutboxRecord = dataclass(True, **('frozen',))(<NODE:12>)
AgenticOutboxDeliveryResult = dataclass(True, **('frozen',))(<NODE:12>)
AgenticDeliveryAckRecord = dataclass(True, **('frozen',))(<NODE:12>)

class AgenticOutbox:
    '''SQLite 持久化出站队列；每次操作使用独立连接，兼容异步任务并发。'''
    
    def __init__(self = None, db_path = None, *, now, max_attempts, max_age_seconds):
        if not db_path:
            pass
        self.db_path = Path(Path.home() / '.yokowebot' / 'agentic_outbox.sqlite3')
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
            connection.executescript("\n                CREATE TABLE IF NOT EXISTS agentic_outbox (\n                    record_id TEXT PRIMARY KEY,\n                    api_url TEXT NOT NULL,\n                    profile_id TEXT NOT NULL,\n                    payload TEXT NOT NULL,\n                    payload_digest TEXT NOT NULL,\n                    status TEXT NOT NULL CHECK(status IN ('pending', 'dead')),\n                    attempts INTEGER NOT NULL DEFAULT 0,\n                    created_at REAL NOT NULL,\n                    updated_at REAL NOT NULL,\n                    next_attempt_at REAL,\n                    lease_until REAL,\n                    last_error TEXT,\n                    http_status INTEGER\n                );\n                CREATE INDEX IF NOT EXISTS idx_agentic_outbox_due\n                    ON agentic_outbox(status, next_attempt_at, lease_until);\n\n                CREATE TABLE IF NOT EXISTS agentic_delivery_ack (\n                    delivery_id TEXT PRIMARY KEY,\n                    api_url TEXT NOT NULL,\n                    profile_id TEXT NOT NULL,\n                    delivery_status TEXT NOT NULL CHECK(delivery_status IN ('delivered', 'failed')),\n                    status TEXT NOT NULL CHECK(status IN ('pending', 'dead')),\n                    attempts INTEGER NOT NULL DEFAULT 0,\n                    created_at REAL NOT NULL,\n                    updated_at REAL NOT NULL,\n                    next_attempt_at REAL,\n                    lease_until REAL,\n                    last_error TEXT,\n                    http_status INTEGER\n                );\n                CREATE INDEX IF NOT EXISTS idx_agentic_delivery_ack_due\n                    ON agentic_delivery_ack(status, next_attempt_at, lease_until);\n                ")
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def _payload_json(envelope = None):
        return json.dumps(envelope, False, True, (',', ':'), **('ensure_ascii', 'sort_keys', 'separators'))

    _payload_json = None(_payload_json)
    
    def _record_id(envelope = None):
        if not envelope.get('idempotencyKey') and envelope.get('requestId'):
            pass
        identity = str('').strip()
        if not identity:
            raise ValueError('可靠投递消息缺少 requestId/idempotencyKey')
        return hashlib.sha256(identity.encode('utf-8')).hexdigest()

    _record_id = None(_record_id)
    
    def _decode_payload(value = None):
        if not decrypt(value):
            pass
        plain = ''
        decoded = json.loads(plain)
        if not isinstance(decoded, dict):
            raise ValueError('可靠投递消息格式无效')
        return decoded

    _decode_payload = None(_decode_payload)
    
    def _row_to_record(self = None, row = None):
        return AgenticOutboxRecord(str(row['record_id']), str(row['api_url']), str(row['profile_id']), self._decode_payload(str(row['payload'])), str(row['status']), int(row['attempts']), float(row['created_at']), float(row['updated_at']), float(row['next_attempt_at']) if row['next_attempt_at'] is not None else None, str(row['last_error']) if row['last_error'] else None, int(row['http_status']) if row['http_status'] is not None else None, **('record_id', 'api_url', 'profile_id', 'envelope', 'status', 'attempts', 'created_at', 'updated_at', 'next_attempt_at', 'last_error', 'http_status'))

    
    def _row_to_ack_record(row = None):
        return AgenticDeliveryAckRecord(str(row['delivery_id']), str(row['api_url']), str(row['profile_id']), str(row['delivery_status']), str(row['status']), int(row['attempts']), float(row['created_at']), float(row['updated_at']), float(row['next_attempt_at']) if row['next_attempt_at'] is not None else None, str(row['last_error']) if row['last_error'] else None, int(row['http_status']) if row['http_status'] is not None else None, **('delivery_id', 'api_url', 'profile_id', 'delivery_status', 'status', 'attempts', 'created_at', 'updated_at', 'next_attempt_at', 'last_error', 'http_status'))

    _row_to_ack_record = None(_row_to_ack_record)
    
    def enqueue(self = None, api_url = None, profile_id = None, envelope = {
        'api_url': 'str',
        'profile_id': 'str',
        'envelope': 'Dict[str, Any]',
        'return': 'Tuple[AgenticOutboxRecord, bool]' }):
        '''幂等入队。相同键的内容不同会拒绝，避免错误覆盖待投递数据。'''
        now = self.now()
        record_id = self._record_id(envelope)
        payload_json = self._payload_json(envelope)
        payload_digest = hashlib.sha256(payload_json.encode('utf-8')).hexdigest()
        if not encrypt(payload_json):
            pass
        stored_payload = payload_json
        with self._connect() as connection:
            cursor = connection.execute("\n                INSERT OR IGNORE INTO agentic_outbox (\n                    record_id, api_url, profile_id, payload, payload_digest,\n                    status, attempts, created_at, updated_at, next_attempt_at\n                ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)\n                ", (record_id, api_url, profile_id, stored_payload, payload_digest, now, now, now))
            created = cursor.rowcount == 1
            row = connection.execute('SELECT * FROM agentic_outbox WHERE record_id = ?', (record_id,)).fetchone()
            if row is None:
                raise RuntimeError('可靠投递消息入队后不可读')
            if str(row['payload_digest']) != payload_digest:
                raise ValueError('相同幂等键对应的消息内容发生变化，已拒绝覆盖')
            if str(row['api_url']).rstrip('/') != api_url.rstrip('/') or str(row['profile_id']) != profile_id:
                raise ValueError('相同幂等键的私域Agent投递目标发生变化，需要人工处理原队列')
            None(None, None, None)
            return (self._row_to_record(row), created)
            with None:
                if not None:
                    pass

    
    def get(self = None, record_id = None):
        with self._connect() as connection:
            row = connection.execute('SELECT * FROM agentic_outbox WHERE record_id = ?', (record_id,)).fetchone()
            None(None, None, None)
        with None:
            if not None:
                pass
        if row is not None:
            return self._row_to_record(row)

    
    def claim(self = None, record_id = None, *, force, lease_seconds):
        '''原子认领单条记录，避免前台即时投递和后台恢复任务重复发送。'''
        now = self.now()
        with self._connect() as connection:
            connection.execute('BEGIN IMMEDIATE')
            row = connection.execute('SELECT * FROM agentic_outbox WHERE record_id = ?', (record_id,)).fetchone()
            if row is None or row['status'] != 'pending':
                connection.commit()
            None(None, None, None)
            return None
            if not row['next_attempt_at'] is None:
                pass
            due = float(row['next_attempt_at']) <= now
            if not row['lease_until'] is None:
                pass
            lease_free = float(row['lease_until']) <= now
            if not (lease_free or due) and force:
                connection.commit()
            None(None, None, None)
            return None
            connection.execute('UPDATE agentic_outbox SET lease_until = ?, updated_at = ? WHERE record_id = ?', (now + max(5, lease_seconds), now, record_id))
            connection.commit()
            None(None, None, None)
        with None:
            if not None:
                pass
        return self.get(record_id)

    
    def claim_due(self = None, limit = None, lease_seconds = None):
        now = self.now()
        record_ids = []
    # WARNING: Decompyle incomplete

    
    def mark_delivered(self = None, record_id = None):
        with self._connect() as connection:
            connection.execute('DELETE FROM agentic_outbox WHERE record_id = ?', (record_id,))
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def mark_failed(self = None, record_id = None, error = None, *, http_status, permanent):
        now = self.now()
        with self._connect() as connection:
            row = connection.execute('SELECT attempts, created_at FROM agentic_outbox WHERE record_id = ?', (record_id,)).fetchone()
            if row is None:
                pass
            None(None, None, None)
            return 'missing'
            attempts = int(row['attempts']) + 1
            expired = now - float(row['created_at']) >= self.max_age_seconds
            if not permanent and attempts >= self.max_attempts:
                pass
            is_dead = expired
            delay = RETRY_DELAYS_SECONDS[min(attempts - 1, len(RETRY_DELAYS_SECONDS) - 1)]
            status = 'dead' if is_dead else 'pending'
            next_attempt_at = None if is_dead else now + delay
            connection.execute('\n                UPDATE agentic_outbox\n                SET status = ?, attempts = ?, updated_at = ?, next_attempt_at = ?,\n                    lease_until = NULL, last_error = ?, http_status = ?\n                WHERE record_id = ?\n                ', (status, attempts, now, next_attempt_at, str(error)[:1000], http_status, record_id))
            None(None, None, None)
        with None:
            if not None:
                pass
        return status

    
    def retry_dead(self = None, record_id = None):
        now = self.now()
        with self._connect() as connection:
            if record_id:
                cursor = connection.execute("\n                    UPDATE agentic_outbox\n                    SET status = 'pending', attempts = 0, updated_at = ?, next_attempt_at = ?,\n                        lease_until = NULL, last_error = NULL, http_status = NULL\n                    WHERE status = 'dead' AND record_id = ?\n                    ", (now, now, record_id))
            else:
                cursor = connection.execute("\n                    UPDATE agentic_outbox\n                    SET status = 'pending', attempts = 0, updated_at = ?, next_attempt_at = ?,\n                        lease_until = NULL, last_error = NULL, http_status = NULL\n                    WHERE status = 'dead'\n                    ", (now, now))
            retried = int(cursor.rowcount)
            if record_id:
                ack_cursor = connection.execute("\n                    UPDATE agentic_delivery_ack\n                    SET status = 'pending', attempts = 0, updated_at = ?, next_attempt_at = ?,\n                        lease_until = NULL, last_error = NULL, http_status = NULL\n                    WHERE status = 'dead' AND delivery_id = ?\n                    ", (now, now, record_id))
            else:
                ack_cursor = connection.execute("\n                    UPDATE agentic_delivery_ack\n                    SET status = 'pending', attempts = 0, updated_at = ?, next_attempt_at = ?,\n                        lease_until = NULL, last_error = NULL, http_status = NULL\n                    WHERE status = 'dead'\n                    ", (now, now))
            None(None, None, None)
            return retried + int(ack_cursor.rowcount)
            with None:
                if not None:
                    pass

    
    def _validate_delivery_id(delivery_id = None):
        if not delivery_id:
            pass
        value = str('').strip()
        safe = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:')
        if value and len(value) > 128 or None((lambda .0 = None: for char in .0:
char not in safe)(value)):
            raise ValueError('无效的私域Agent deliveryId')
        return value

    _validate_delivery_id = None(_validate_delivery_id)
    
    def enqueue_ack(self, api_url = None, profile_id = None, delivery_id = None, delivery_status = {
        'api_url': 'str',
        'profile_id': 'str',
        'delivery_id': 'str',
        'delivery_status': 'str',
        'return': 'Tuple[AgenticDeliveryAckRecord, bool]' }):
        value = self._validate_delivery_id(delivery_id)
        if delivery_status not in frozenset({'failed', 'delivered'}):
            raise ValueError('无效的私域Agent投递确认状态')
        now = self.now()
        with self._connect() as connection:
            cursor = connection.execute("\n                INSERT OR IGNORE INTO agentic_delivery_ack (\n                    delivery_id, api_url, profile_id, delivery_status, status,\n                    attempts, created_at, updated_at, next_attempt_at\n                ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)\n                ", (value, api_url, profile_id, delivery_status, now, now, now))
            created = cursor.rowcount == 1
            if not created:
                connection.execute("\n                    UPDATE agentic_delivery_ack\n                    SET api_url = ?, profile_id = ?, delivery_status = ?, status = 'pending',\n                        updated_at = ?, next_attempt_at = ?, lease_until = NULL,\n                        last_error = NULL, http_status = NULL\n                    WHERE delivery_id = ?\n                    ", (api_url, profile_id, delivery_status, now, now, value))
            row = connection.execute('SELECT * FROM agentic_delivery_ack WHERE delivery_id = ?', (value,)).fetchone()
            None(None, None, None)
        with None:
            if not None:
                pass
        if row is None:
            raise RuntimeError('私域Agent投递确认入队后不可读')
        return (self._row_to_ack_record(row), created)

    
    def get_ack(self = None, delivery_id = None):
        with self._connect() as connection:
            row = connection.execute('SELECT * FROM agentic_delivery_ack WHERE delivery_id = ?', (delivery_id,)).fetchone()
            None(None, None, None)
        with None:
            if not None:
                pass
        if row is not None:
            return self._row_to_ack_record(row)

    
    def claim_ack(self = None, delivery_id = None, *, force, lease_seconds):
        now = self.now()
        with self._connect() as connection:
            connection.execute('BEGIN IMMEDIATE')
            row = connection.execute('SELECT * FROM agentic_delivery_ack WHERE delivery_id = ?', (delivery_id,)).fetchone()
            if row is None or row['status'] != 'pending':
                connection.commit()
            None(None, None, None)
            return None
            if not row['next_attempt_at'] is None:
                pass
            due = float(row['next_attempt_at']) <= now
            if not row['lease_until'] is None:
                pass
            lease_free = float(row['lease_until']) <= now
            if not (lease_free or due) and force:
                connection.commit()
            None(None, None, None)
            return None
            connection.execute('UPDATE agentic_delivery_ack SET lease_until = ?, updated_at = ? WHERE delivery_id = ?', (now + max(5, lease_seconds), now, delivery_id))
            connection.commit()
            None(None, None, None)
        with None:
            if not None:
                pass
        return self.get_ack(delivery_id)

    
    def claim_due_acks(self = None, limit = None, lease_seconds = None):
        now = self.now()
        delivery_ids = []
    # WARNING: Decompyle incomplete

    
    def mark_ack_delivered(self = None, delivery_id = None):
        with self._connect() as connection:
            connection.execute('DELETE FROM agentic_delivery_ack WHERE delivery_id = ?', (delivery_id,))
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def mark_ack_failed(self = None, delivery_id = None, error = None, *, http_status, permanent):
        now = self.now()
        with self._connect() as connection:
            row = connection.execute('SELECT attempts, created_at FROM agentic_delivery_ack WHERE delivery_id = ?', (delivery_id,)).fetchone()
            if row is None:
                pass
            None(None, None, None)
            return 'missing'
            attempts = int(row['attempts']) + 1
            expired = now - float(row['created_at']) >= self.max_age_seconds
            if not permanent and attempts >= self.max_attempts:
                pass
            is_dead = expired
            delay = RETRY_DELAYS_SECONDS[min(attempts - 1, len(RETRY_DELAYS_SECONDS) - 1)]
            status = 'dead' if is_dead else 'pending'
            connection.execute('\n                UPDATE agentic_delivery_ack\n                SET status = ?, attempts = ?, updated_at = ?, next_attempt_at = ?,\n                    lease_until = NULL, last_error = ?, http_status = ?\n                WHERE delivery_id = ?\n                ', (status, attempts, now, None if is_dead else now + delay, str(error)[:1000], http_status, delivery_id))
            None(None, None, None)
        with None:
            if not None:
                pass
        return status

    
    def purge_expired_dead(self = None, retention_seconds = None):
        cutoff = self.now() - max(3600, int(retention_seconds))
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM agentic_outbox WHERE status = 'dead' AND updated_at < ?", (cutoff,))
            ack_cursor = connection.execute("DELETE FROM agentic_delivery_ack WHERE status = 'dead' AND updated_at < ?", (cutoff,))
            None(None, None, None)
            return int(cursor.rowcount) + int(ack_cursor.rowcount)
            with None:
                if not None:
                    pass

    
    def status(self = None, limit = None):
        with self._connect() as connection:
            counts = (lambda .0: pass# WARNING: Decompyle incomplete
)(connection.execute('SELECT status, COUNT(*) AS count FROM agentic_outbox GROUP BY status').fetchall())
            ack_counts = (lambda .0: pass# WARNING: Decompyle incomplete
)(connection.execute('SELECT status, COUNT(*) AS count FROM agentic_delivery_ack GROUP BY status').fetchall())
            rows = connection.execute("\n                SELECT record_id, api_url, profile_id, status, attempts, created_at,\n                       updated_at, next_attempt_at, last_error, http_status\n                FROM agentic_outbox\n                ORDER BY CASE status WHEN 'dead' THEN 0 ELSE 1 END, created_at ASC\n                LIMIT ?\n                ", (max(1, min(int(limit), 100)),)).fetchall()
            ack_rows = connection.execute("\n                SELECT delivery_id, api_url, profile_id, delivery_status, status, attempts,\n                       created_at, updated_at, next_attempt_at, last_error, http_status\n                FROM agentic_delivery_ack\n                ORDER BY CASE status WHEN 'dead' THEN 0 ELSE 1 END, created_at ASC\n                LIMIT ?\n                ", (max(1, min(int(limit), 100)),)).fetchall()
            None(None, None, None)
        with None:
            if not None:
                pass
        return {
            'pending': counts.get('pending', 0),
            'dead': counts.get('dead', 0),
            'pendingAcks': ack_counts.get('pending', 0),
            'deadAcks': ack_counts.get('dead', 0),
            'records': (lambda .0: for row in .0:
passcontinuestr(row['record_id'])[{
'id': str(row['api_url']),
'apiUrl': str(row['profile_id']),
'profileId': str(row['status']),
'status': int(row['attempts']),
'attempts': float(row['created_at']),
'createdAt': float(row['updated_at']),
'updatedAt': float(row['next_attempt_at']),
'nextAttemptAt': None,
'lastError': str(row['last_error']) if row['last_error'] else None,
'httpStatus': int(row['http_status']) if row['http_status'] is not None else None }])(rows),
            'ackRecords': (lambda .0: for row in .0:
passcontinuestr(row['delivery_id'])[{
'id': str(row['api_url']),
'apiUrl': str(row['profile_id']),
'profileId': str(row['delivery_status']),
'deliveryStatus': str(row['status']),
'status': int(row['attempts']),
'attempts': float(row['created_at']),
'createdAt': float(row['updated_at']),
'updatedAt': float(row['next_attempt_at']),
'nextAttemptAt': None,
'lastError': str(row['last_error']) if row['last_error'] else None,
'httpStatus': int(row['http_status']) if row['http_status'] is not None else None }])(ack_rows) }


_default_outbox: 'Optional[AgenticOutbox]' = None

def get_default_agentic_outbox():
    global _default_outbox
    if _default_outbox is None:
        _default_outbox = AgenticOutbox()
    return _default_outbox


async def deliver_agentic_outbox_record(record = None, api_token = None, *, timeout):
    '''执行一次投递；不修改存储状态，由调用方按结果提交。'''
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json' }
    if api_token:
        headers['Authorization'] = f'''Bearer {api_token}'''
    url = f'''{record.api_url.rstrip('/')}/v1/chat'''
# WARNING: Decompyle incomplete


async def deliver_agentic_delivery_ack(record = None, api_token = None, *, timeout):
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json' }
    if api_token:
        headers['Authorization'] = f'''Bearer {api_token}'''
    delivery_id = quote(record.delivery_id, '', **('safe',))
    url = f'''{record.api_url.rstrip('/')}/v1/deliveries/{delivery_id}/ack'''
# WARNING: Decompyle incomplete


def resolve_outbox_token(record = None):
    '''从当前配置解析令牌；不把凭证写入队列。返回 token/error/permanent。'''
    pass
# WARNING: Decompyle incomplete


async def drain_agentic_outbox_once(outbox = None, *, limit):
