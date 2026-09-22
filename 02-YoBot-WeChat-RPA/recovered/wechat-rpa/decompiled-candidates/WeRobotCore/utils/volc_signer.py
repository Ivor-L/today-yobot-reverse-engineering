# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: volc_signer.marshal (Python 3.9)

'''
火山引擎 (Volcano Engine) Open API V4 风格签名实现。

参考：火山引擎签名规范（与 AWS Signature V4 兼容的变体）
  - 算法：HMAC-SHA256
  - Authorization header 形如：
      HMAC-SHA256 Credential=<AK>/<date>/<region>/<service>/request,
                  SignedHeaders=content-type;host;x-content-sha256;x-date,
                  Signature=<hex>

只覆盖本项目用得到的 POST + Action 查询参数 + JSON body 这一种调用形态。
未来需要 GET / 其它姿势再扩展。

外部入口：sign_request() 返回应该附到请求上的 headers。
'''
from __future__ import annotations
import datetime
import hashlib
import hmac
from typing import Dict, Mapping, Optional
from urllib.parse import quote
_ALGORITHM = 'HMAC-SHA256'
_REQUEST_SUFFIX = 'request'

def _sha256_hex(payload = None):
    return hashlib.sha256(payload).hexdigest()


def _hmac_sha256(key = None, msg = None):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def _canonical_query(query = None):
    '''key 升序 + URL 编码后 join。'''
    if not query:
        return ''
    items = None(query.items(), (lambda kv: kv[0]), **('key',))
    parts = []
    for k, v in items:
        ek = quote(str(k), '-_.~', **('safe',))
        ev = quote(str(v), '-_.~', **('safe',))
        parts.append(f'''{ek}={ev}''')
    return '&'.join(parts)


def _canonical_headers(headers = None):
    '''
    canonical_headers 形如：
      content-type:application/json

      host:open.volcengineapi.com

      x-content-sha256:<hex>

      x-date:20231107T120000Z

    '''
    items = sorted((lambda .0: for k, v in .0:
(k.lower().strip(), v.strip()))(headers.items()), (lambda kv: kv[0]), **('key',))
    return '\n'.join((lambda .0: for k, v in .0:
f'''{k}:{v}''')(items)) + '\n'


def _signed_headers(headers = None):
    return ';'.join(sorted((lambda .0: for k in .0:
k.lower().strip())(headers.keys())))


def _derive_signing_key(secret_key = None, date = None, region = None, service = {
    'secret_key': 'str',
    'date': 'str',
    'region': 'str',
    'service': 'str',
    'return': 'bytes' }):
    k_date = _hmac_sha256(secret_key.encode('utf-8'), date)
    k_region = _hmac_sha256(k_date, region)
    k_service = _hmac_sha256(k_region, service)
    k_signing = _hmac_sha256(k_service, _REQUEST_SUFFIX)
    return k_signing


def sign_request(*, method, host, path, query, body, access_key_id, secret_access_key, service, region, content_type, now):
    '''
    为请求计算签名，返回应该附上的 HTTP headers（含 Authorization）。

    用法：把返回的 dict 整个 merge 进 requests 的 headers 即可。
    '''
    if now is None:
        now = datetime.datetime.now(datetime.timezone.utc)
    x_date = now.strftime('%Y%m%dT%H%M%SZ')
    date_only = now.strftime('%Y%m%d')
    if not body:
        pass
    x_content_sha256 = _sha256_hex(b'')
    base_headers = {
        'Content-Type': content_type,
        'Host': host,
        'X-Content-Sha256': x_content_sha256,
        'X-Date': x_date }
    if not path:
        pass
    canonical_request = '\n'.join([
        method.upper(),
        '/',
        _canonical_query(query),
        _canonical_headers(base_headers),
        _signed_headers(base_headers),
        x_content_sha256])
    credential_scope = f'''{date_only}/{region}/{service}/{_REQUEST_SUFFIX}'''
    string_to_sign = '\n'.join([
        _ALGORITHM,
        x_date,
        credential_scope,
        _sha256_hex(canonical_request.encode('utf-8'))])
    signing_key = _derive_signing_key(secret_access_key, date_only, region, service)
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    authorization = f'''{_ALGORITHM} Credential={access_key_id}/{credential_scope}, SignedHeaders={_signed_headers(base_headers)}, Signature={signature}'''
    return {
        'Content-Type': content_type,
        'Host': host,
        'X-Content-Sha256': x_content_sha256,
        'X-Date': x_date,
        'Authorization': authorization }

