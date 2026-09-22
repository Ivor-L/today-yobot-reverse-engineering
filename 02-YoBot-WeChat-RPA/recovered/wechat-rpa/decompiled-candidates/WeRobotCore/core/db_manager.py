# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: db_manager.marshal (Python 3.9)

import sqlite3
import os
import sys
from datetime import datetime
from WeRobotCore.utils.data_manager import DataManager

class WeChatDBManager:
    _instance = None
    
    def __new__(cls = None, db_path = None):
        if cls._instance is None:
            cls._instance = super(WeChatDBManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    
    def __init__(self, db_path = ('wechat_contacts.db',)):
        if self._initialized:
            return None
        self.db_path = None.path.join(DataManager.get_data_dir_str(), db_path)
        os.makedirs(os.path.dirname(self.db_path), True, **('exist_ok',))
        sqlite3.register_converter('TEXT', (lambda x: x.decode('utf-8')))
        self.init_db()
        self._initialized = True

    
    def init_db(self):
        '''初始化数据库表'''
        pass
    # WARNING: Decompyle incomplete

    
    def update_tag_statistics(self, account_id, contact_type = ('friend',)):
        '''更新标签统计信息'''
        with sqlite3.connect(self.db_path, sqlite3.PARSE_DECLTYPES, **('detect_types',)) as conn:
            conn.text_factory = str
            cursor = conn.cursor()
            now = datetime.now()
            contacts = self.get_contacts_with_tags(account_id, contact_type)
            tag_stats = { }
            untagged_count = 0
            for contact in contacts:
                if not contact[1]:
                    untagged_count += 1
                    continue
                tags = contact[1].split(',') if contact[1] else []
                for tag in tags:
                    if tag:
                        tag = tag.strip()
                        tag_stats[tag] = tag_stats.get(tag, 0) + 1
                        continue
                        continue
                        cursor.execute('\n                SELECT tag_name FROM contact_tags WHERE account_id = ?\n            ', (account_id,))
                        existing_tags = (lambda .0: pass# WARNING: Decompyle incomplete
)(cursor.fetchall())
                        for tag in existing_tags:
                            if tag != '未分组' and tag not in tag_stats:
                                cursor.execute('\n                        DELETE FROM contact_tags WHERE account_id = ? AND tag_name = ?\n                    ', (account_id, tag))
                                continue
                                if '未分组' in existing_tags:
                                    cursor.execute('\n                    UPDATE contact_tags \n                    SET contact_count = ?, last_updated = ? \n                    WHERE account_id = ? AND tag_name = ?\n                ', (untagged_count, now, account_id, '未分组'))
                                else:
                                    cursor.execute('\n                    INSERT INTO contact_tags (account_id, tag_name, contact_count, last_updated)\n                    VALUES (?, ?, ?, ?)\n                ', (account_id, '未分组', untagged_count, now))
            for tag, count in tag_stats.items():
                if tag in existing_tags:
                    cursor.execute('\n                        UPDATE contact_tags \n                        SET contact_count = ?, last_updated = ? \n                        WHERE account_id = ? AND tag_name = ?\n                    ', (count, now, account_id, tag))
                else:
                    cursor.execute('\n                        INSERT INTO contact_tags (account_id, tag_name, contact_count, last_updated)\n                        VALUES (?, ?, ?, ?)\n                    ', (account_id, tag, count, now))
            conn.commit()
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def save_friends(self, account_id, friends_data, is_incremental = (False,)):
        '''保存好友列表到friends表（采用旧版contacts表的存储方式）
        
        Args:
            account_id: 微信账号ID
            friends_data: 好友数据列表
            is_incremental: 是否为增量更新，True表示增量更新不删除现有数据，False表示全量更新先删除再插入
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def save_groups(self, account_id, groups_data):
        '''保存群聊列表到新的groups表'''
        pass
    # WARNING: Decompyle incomplete

    
    def update_groups_tag_batch(self, account_id, group_names, tag):
        pass
    # WARNING: Decompyle incomplete

    
    def get_group_tag(self, account_id, group_name):
        '''根据群名称查询对应标签'''
        pass
    # WARNING: Decompyle incomplete

    
    def get_friends(self, account_id, tag = (None,)):
        '''获取好友列表（从新的friends表）'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if tag:
                cursor.execute('\n                    SELECT DISTINCT wxid, name, nickname, remark, tag, is_new, last_updated, created_at\n                    FROM friends \n                    WHERE account_id = ? AND tag = ?\n                    ORDER BY name\n                ', (account_id, tag))
            else:
                cursor.execute('\n                    SELECT DISTINCT wxid, name, nickname, remark, tag, is_new, last_updated, created_at\n                    FROM friends \n                    WHERE account_id = ?\n                    ORDER BY name\n                ', (account_id,))
            None(None, None, None)
            return cursor.fetchall()
            with None:
                if not None:
                    pass

    
    def get_contact_names(self, account_id, contact_type = (None,)):
        """
        直接获取联系人名称列表，更高效的实现
        
        Args:
            account_id: 微信账号ID
            contact_type: 联系人类型，'friend'表示好友，'group'表示群聊，None表示所有
            
        Returns:
            list: 联系人名称列表
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if contact_type == 'friend':
                cursor.execute('\n                    SELECT DISTINCT name\n                    FROM friends \n                    WHERE account_id = ? AND name IS NOT NULL\n                    ORDER BY name\n                ', (account_id,))
            elif contact_type == 'group':
                cursor.execute('\n                    SELECT DISTINCT name\n                    FROM groups \n                    WHERE account_id = ? AND name IS NOT NULL\n                    ORDER BY name\n                ', (account_id,))
            else:
                cursor.execute('\n                    SELECT DISTINCT name\n                    FROM (\n                        SELECT name FROM friends WHERE account_id = ? AND name IS NOT NULL\n                        UNION\n                        SELECT name FROM groups WHERE account_id = ? AND name IS NOT NULL\n                    )\n                    ORDER BY name\n                ', (account_id, account_id))
            None(None, None, None)
            return (lambda .0: [ row[0] for row in .0 if row[0] ])(cursor.fetchall())
            with None:
                if not None:
                    pass

    
    def get_groups(self, account_id, tag = (None,)):
        '''获取群聊列表（从新的groups表）'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if tag:
                cursor.execute('\n                    SELECT name, tag, last_updated\n                    FROM groups \n                    WHERE account_id = ? AND tag = ?\n                    ORDER BY name\n                ', (account_id, tag))
            else:
                cursor.execute('\n                    SELECT name, tag, last_updated\n                    FROM groups \n                    WHERE account_id = ?\n                    ORDER BY name\n                ', (account_id,))
            None(None, None, None)
            return cursor.fetchall()
            with None:
                if not None:
                    pass

    
    def get_friend_by_wxid(self, account_id, wxid):
        '''根据wxid获取好友信息'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('\n                SELECT wxid, name, nickname, remark, tag, is_new, last_updated\n                FROM friends \n                WHERE account_id = ? AND wxid = ?\n                LIMIT 1\n            ', (account_id, wxid))
            None(None, None, None)
            return cursor.fetchone()
            with None:
                if not None:
                    pass

    
    def update_friend_is_new_status(self, account_id, wxid, is_new = (0,)):
        '''更新好友的is_new状态'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('\n                UPDATE friends \n                SET is_new = ?, last_updated = ?\n                WHERE account_id = ? AND wxid = ?\n            ', (is_new, datetime.now(), account_id, wxid))
            conn.commit()
            None(None, None, None)
            return cursor.rowcount > 0
            with None:
                if not None:
                    pass

    
    def get_friend_created_time(self, account_id, wxid):
        '''获取好友的创建时间'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('\n                SELECT created_at FROM friends \n                WHERE account_id = ? AND wxid = ?\n                LIMIT 1\n            ', (account_id, wxid))
            result = cursor.fetchone()
            if result:
                pass
            None(None, None, None)
            return result[0]
            with None:
                if not None:
                    pass

    
    def is_new_friend(self, account_id, wxid, days_threshold = (7,)):
        '''判断是否为新用户（基于创建时间）
        
        Args:
            account_id: 微信账号ID
            wxid: 好友微信ID
            days_threshold: 天数阈值，默认7天内算新用户
            
        Returns:
            bool: True表示是新用户，False表示老用户，None表示用户不存在
        '''
        created_time = self.get_friend_created_time(account_id, wxid)
        if created_time is None:
            return None
        if None(created_time, str):
            created_time = datetime.fromisoformat(created_time)
        time_diff = datetime.now() - created_time
        return time_diff.days <= days_threshold

    
    def get_new_friends_by_date(self, account_id, start_date, end_date = (None, None)):
        '''获取指定时间范围内新增的好友
        
        Args:
            account_id: 微信账号ID
            start_date: 开始日期（datetime对象或字符串）
            end_date: 结束日期（datetime对象或字符串）
            
        Returns:
            list: 好友列表
        '''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            query = '\n                SELECT DISTINCT wxid, name, nickname, remark, created_at, last_updated\n                FROM friends \n                WHERE account_id = ?\n            '
            params = [
                account_id]
            if start_date:
                query += ' AND created_at >= ?'
                params.append(start_date)
            if end_date:
                query += ' AND created_at <= ?'
                params.append(end_date)
            query += ' ORDER BY created_at DESC'
            cursor.execute(query, params)
            None(None, None, None)
            return cursor.fetchall()
            with None:
                if not None:
                    pass

    
    def get_friend_count(self, account_id):
        '''获取指定账号的好友数量（兼容方法，优先使用新表）'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('\n                SELECT COUNT(DISTINCT wxid) FROM friends \n                WHERE account_id = ?\n            ', (account_id,))
            count = cursor.fetchone()[0]
            if count == 0:
                cursor.execute("\n                    SELECT COUNT(DISTINCT name) FROM contacts \n                    WHERE account_id = ? AND type = 'friend'\n                ", (account_id,))
                count = cursor.fetchone()[0]
            None(None, None, None)
            return count
            with None:
                if not None:
                    pass

    
    def get_contact_counts(self, account_id):
        '''一次性获取好友和群聊数量（兼容方法，优先使用新表）'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            counts = {
                'friend_count': 0,
                'group_count': 0 }
            cursor.execute('\n                SELECT COUNT(DISTINCT wxid) FROM friends \n                WHERE account_id = ?\n            ', (account_id,))
            friend_count = cursor.fetchone()[0]
            cursor.execute('\n                SELECT COUNT(DISTINCT name) FROM groups \n                WHERE account_id = ?\n            ', (account_id,))
            group_count = cursor.fetchone()[0]
            if friend_count > 0 or group_count > 0:
                counts['friend_count'] = friend_count
                counts['group_count'] = group_count
            None(None, None, None)
            return counts
            with None:
                if not None:
                    pass

    
    def add_friend_list(self, friend_list):
        '''批量添加好友名单'''
        pass
    # WARNING: Decompyle incomplete

    
    def update_friend_status(self, wxid = None, status = None, nickname = None, error = (None, None, None), account_id = {
        'wxid': str,
        'status': str,
        'nickname': str,
        'error': str,
        'account_id': str }):
        """
        更新好友添加状态
        
        Args:
            wxid: 微信号
            status: 状态 ('added' 或 'failed')
            nickname: 用户昵称
            error: 失败原因
        """
        pass
    # WARNING: Decompyle incomplete

    
    def get_friend_list(self = None, limit = None):
        '''获取好友名单列表'''
        pass
    # WARNING: Decompyle incomplete

    
    def delete_friend_from_list(self = None, wxid = None):
        '''从名单中删除指定好友'''
        pass
    # WARNING: Decompyle incomplete

    
    def batch_delete_friend_list(self = None, wxids = None):
        pass
    # WARNING: Decompyle incomplete

    
    def filter_friend_list(self = None, status = None, tag = None, limit = (None, None, 1000)):
        pass
    # WARNING: Decompyle incomplete

    
    def get_pending_friends(self = None, limit = None):
        """
        获取指定数量的待添加好友
        
        Args:
            limit: 获取数量
            
        Returns:
            list: 待添加好友列表 [{'wxid': str, 'remark': str, 'tags': str}]
        """
        pass
    # WARNING: Decompyle incomplete

    
    def get_pending_friend_count(self):
        '''获取待添加好友数量'''
        pass
    # WARNING: Decompyle incomplete

    
    def save_account(self, nickname, account_id):
        '''保存或更新微信账号信息'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('\n                INSERT OR REPLACE INTO wechat_accounts (nickname, account_id, last_updated)\n                VALUES (?, ?, ?)\n            ', (nickname, account_id, datetime.now()))
            conn.commit()
            None(None, None, None)
            return cursor.lastrowid
            with None:
                if not None:
                    pass

    
    def get_all_contact_tags(self, account_id):
        '''获取指定账号的标签列表及其统计'''
        with sqlite3.connect(self.db_path, sqlite3.PARSE_DECLTYPES, **('detect_types',)) as conn:
            conn.text_factory = str
            cursor = conn.cursor()
            cursor.execute('\n                SELECT tag_name, contact_count FROM contact_tags \n                WHERE account_id = ? \n                ORDER BY contact_count DESC, tag_name\n            ', (account_id,))
            results = cursor.fetchall()
            if not results:
                print('标签数据为空，正在初始化标签统计信息...')
                self.update_tag_statistics(account_id)
                cursor.execute('\n                    SELECT tag_name, contact_count FROM contact_tags \n                    WHERE account_id = ? \n                    ORDER BY contact_count DESC, tag_name\n                ', (account_id,))
                results = cursor.fetchall()
            None(None, None, None)
            return results
            with None:
                if not None:
                    pass

    
    def get_group_tags_statistics(self, account_id):
        '''获取指定账号的群聊标签列表及其统计'''
        with sqlite3.connect(self.db_path, sqlite3.PARSE_DECLTYPES, **('detect_types',)) as conn:
            conn.text_factory = str
            cursor = conn.cursor()
            cursor.execute('\n                SELECT tag, COUNT(*) FROM groups \n                WHERE account_id = ?\n                GROUP BY tag\n                ORDER BY COUNT(*) DESC\n            ', (account_id,))
            results = cursor.fetchall()
            None(None, None, None)
            return results
            with None:
                if not None:
                    pass

    
    def add_friend_if_not_exists(self = None, account_id = None, nickname = None, tag = ('',)):
        '''添加好友到通讯录（如果不存在）'''
        pass
    # WARNING: Decompyle incomplete

    
    def save_or_update_friend_info(self, account_id, friend_info, is_new = (None,)):
        '''保存或更新好友信息到数据库（采用旧版contacts表的存储方式）
        
        参数:
        - account_id: 微信账号ID
        - friend_info: 好友信息字典，包含nickname, wechat_id, remark_name, tags等
        - is_new: 是否为新好友，None表示自动判断，True表示强制设为新好友，False表示强制设为非新好友
        
        返回:
        - bool: 是否成功保存/更新
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def get_contacts(self, account_id, contact_type = (None,)):
        '''获取指定账号的联系人列表'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if contact_type:
                cursor.execute('\n                    SELECT name FROM contacts \n                    WHERE account_id = ? AND type = ?\n                    ORDER BY name\n                ', (account_id, contact_type))
            else:
                cursor.execute('\n                    SELECT name, type FROM contacts \n                    WHERE account_id = ?\n                    ORDER BY type, name\n                ', (account_id,))
            None(None, None, None)
            return cursor.fetchall()
            with None:
                if not None:
                    pass

    
    def get_contacts_with_tags(self, account_id, contact_type = ('friend',)):
        '''获取指定账号的联系人列表及其标签（从friends表获取）'''
        with sqlite3.connect(self.db_path, sqlite3.PARSE_DECLTYPES, **('detect_types',)) as conn:
            conn.text_factory = str
            cursor = conn.cursor()
            if contact_type == 'friend':
                cursor.execute('\n                    SELECT name, tag FROM friends \n                    WHERE account_id = ?\n                    ORDER BY name\n                ', (account_id,))
            else:
                cursor.execute('\n                    SELECT name, tag FROM contacts \n                    WHERE account_id = ? AND type = ?\n                    ORDER BY name\n                ', (account_id, contact_type))
            None(None, None, None)
            return cursor.fetchall()
            with None:
                if not None:
                    pass

    
    def get_contact_tags(self, account_id, contact_name):
        '''获取指定联系人的标签信息
        
        参数:
        - account_id: 微信账号ID
        - contact_name: 联系人名称（优先匹配备注名，如果没有备注名则匹配昵称）
        
        返回:
        - 包含联系人名称和标签的元组列表 [(name, tag)]
        '''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("\n                SELECT name, tag FROM friends \n                WHERE account_id = ? \n                AND (\n                    (remark IS NOT NULL AND remark != '' AND remark = ?) \n                    OR (remark IS NULL OR remark = '') AND nickname = ?\n                )\n                LIMIT 1\n            ", (account_id, contact_name, contact_name))
            result = cursor.fetchall()
            if result and result[0][1]:
                name = result[0][0]
                tags = (lambda .0: [ tag.strip() for tag in .0 ])(result[0][1].split(','))
            None(None, None, None)
            return None
            None(None, None, None)
            return result
            with None:
                if not None:
                    pass

    
    def save_contact_tags(self = None, account_id = None, tags = None):
        '''
        保存联系人标签信息
        
        参数:
        - account_id: 微信账号ID
        - tags: 标签字典，格式为 {tag_name: [contact_names]}
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def save_group_members(self = None, group_name = None, members = None):
        '''保存群成员信息'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            now = datetime.now()
            for member in members:
                cursor.execute('\n                    INSERT OR REPLACE INTO group_members \n                    (group_name, nickname, gender, wx_id, region, is_friend, last_updated)\n                    VALUES (?, ?, ?, ?, ?, ?, ?)\n                ', (group_name, member['nickname'], member.get('gender', ''), member.get('wx_id', ''), member.get('region', ''), member.get('is_friend', 0), now))
            conn.commit()
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def add_group_if_not_exists(self = None, account_id = None, group_name = None):
        '''添加群聊到通讯录（如果不存在）'''
        pass
    # WARNING: Decompyle incomplete

    
    def get_group_members(self = None, group_name = None):
        '''获取群成员列表'''
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('\n                SELECT nickname, gender, wx_id, region, is_friend\n                FROM group_members\n                WHERE group_name = ?\n                ORDER BY nickname\n            ', (group_name,))
            members = []
            for row in cursor.fetchall():
                members.append({
                    'nickname': row[0],
                    'gender': row[1],
                    'wx_id': row[2],
                    'region': row[3],
                    'is_friend': bool(row[4]) })
            None(None, None, None)
            return members
            with None:
                if not None:
                    pass

    
    def get_users_by_tag(self = None, account_id = None, tag_id = None):
        '''
        根据标签ID获取用户列表
        
        参数:
        - account_id: 微信账号ID
        - tag_id: 标签ID
        
        返回:
        - 包含用户名称的列表
        '''
        pass
    # WARNING: Decompyle incomplete

    __classcell__ = None

