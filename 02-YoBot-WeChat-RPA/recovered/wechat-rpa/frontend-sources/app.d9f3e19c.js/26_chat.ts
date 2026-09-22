import { API_BASE_URL as BASE_URL, headers } from './config'
const API_BASE_URL = `${BASE_URL}/api`

export interface ChatSession {
  id: string | number     // 支持多账号的unique_id字符串格式
  name: string
  avatar: string
  lastMessage: string
  lastTime?: string
  lastMessageId?: number  // 添加最后消息ID字段
  unread?: number
  isGroup?: boolean
  account_id?: string     // 账号ID
  account_nickname?: string  // 账号昵称
  unique_id?: string      // 唯一标识：account_id_session_name
}
// 统计数据接口定义
export interface StatsData {
  sessionCount: number;
  sessionIncrease: number;
  messageCount: number;
  messageIncrease: number;
  savedHours: number;
  savedMoney: number;
}

export interface AIGenerateResponse {
  success: boolean
  error?: string
  data?: {
    reply?: string
  }
}

export interface ChatMessage {
  id: number
  content: string
  isSelf: boolean
  isTimeMessage?: boolean
  time?: string
  sessionId?: number
  isRead?: boolean
  isGroup?: boolean  // 添加群聊标识
  sender?: {         // 添加发送者信息
    name: string
    // tags: string[]   // 发送者的标签
  }
  file_info?:string
  voice_text?:string
  image_url?:string   // 首张图片URL，保留兼容
  image_urls?:string[] // 该条消息的全部图片URL；微信4.1.12+的聚合图片一条消息可有多张
}
export interface SuspendedSession {
  session_name: string
  suspended_at: number
  account_id: string
  account_nickname?: string
}

// 获取挂起会话列表
export const getSuspendedSessions = async (): Promise<SuspendedSession[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/suspended_sessions`, {
      method: 'GET',
      headers
    });
    if (!response.ok) {
      throw new Error(`获取挂起会话列表失败: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取挂起会话列表失败:', error);
    return [];
  }
};

// 解除会话挂起
export const unsuspendSession = async (sessionName: string, accountId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/unsuspend_session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session_name: sessionName,
        account_id: accountId
      })
    });
    if (!response.ok) {
      throw new Error(`解除会话挂起失败: ${response.status}`);
    }
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('解除会话挂起失败:', error);
    return false;
  }
};

// 获取挂起会话数量（只为 tab 角标用）
//
// 不复用 getSuspendedSessions：那个接口服务端要补账号昵称，会走窗口标题查询
// （win32gui.GetWindowText，跨进程同步调用），微信卡住时它会一起卡。角标是
// 定时轮询的，必须用只读内存的轻量接口。
//
// 拿不到就当 0：角标不显示远好过弹一串错误提示——它只是提醒，不是功能。
export const getSuspendedCount = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/suspended_count`, {
      method: 'GET',
      headers
    });
    if (!response.ok) return 0;
    const data = await response.json();
    return Number(data?.count) || 0;
  } catch (error) {
    console.debug('获取挂起会话数量失败:', error);
    return 0;
  }
};

// 获取历史会话列表
export const getHistorySessions = async (): Promise<ChatSession[]> => {
  const response = await fetch(`${API_BASE_URL}/chat/history_sessions`, {
    method: 'GET',
    headers
  });
  if (!response.ok) {
    throw new Error(`获取历史会话列表失败: ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('获取历史会话列表失败: 响应格式不正确');
  }
  return data;
};

// 获取历史会话的聊天记录
export const getHistoryMessages = async (sessionId: string, accountId?: string):  Promise<ChatMessagesResponse> => {
  const url = new URL(`${API_BASE_URL}/chat/history_messages/${encodeURIComponent(sessionId)}`);
  if (accountId) {
    url.searchParams.append('account_id', accountId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers
  });
  if (!response.ok) {
    throw new Error(`获取历史聊天记录失败: ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data?.messages)) {
    throw new Error('获取历史聊天记录失败: 响应格式不正确');
  }
  return {
    messages: data.messages,
    chatType: data.chatType || 'unknown'
  };
};
// 删除历史会话的本地记录
export const deleteHistorySession = async (sessionId: string, accountId?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/delete_history_session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id: sessionId, account_id: accountId })
    });
    if (!response.ok) {
      throw new Error(`删除历史会话失败: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('删除历史会话失败:', error);
    return { success: false, error: String(error) };
  }
};

// 获取统计数据
export const getStatsData = async (): Promise<StatsData> => {
  try {
    // 获取日志数据
    const response = await fetch(`${API_BASE_URL}/chat/logs`, {
      headers
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('获取日志数据失败');
    }
    
    const logs = data.logs.map((log: any) => ({
      timestamp: new Date(log.timestamp),
      targetName: log.targetName || log.session_name,  // 兼容两种字段名
      content: log.content,
      status: log.status,
      error: log.error,
      chatType: log.chatType || (log.content?.includes('：') ? 'group' : 'single'),  // 根据内容判断类型
      account_id: log.account_id || 'default'  // 兼容旧版日志，没有account_id时使用default
    }));
    
    // 获取今天的开始时间（本地时间）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // 获取昨天的开始时间和结束时间
    const yesterday = new Date(todayTimestamp);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTimestamp = yesterday.getTime();

    // 过滤今天的日志
    const todayLogs = logs.filter((log: any) => {
      return log.timestamp.getTime() >= todayTimestamp;
    });
    
    // 过滤昨天的日志
    const yesterdayLogs = logs.filter((log: any) => {
      return log.timestamp.getTime() >= yesterdayTimestamp && log.timestamp.getTime() < todayTimestamp;
    });
    
    // 计算今天的服务用户数（去重）- 使用account_id+targetName组合确保不同账号下的同名用户被区分
    const uniqueUsers = new Set(todayLogs.map((log: any) => `${log.account_id}_${log.targetName}`));
    const sessionCount = uniqueUsers.size;
    
    // 计算昨天的服务用户数（去重）- 使用account_id+targetName组合确保不同账号下的同名用户被区分
    const yesterdayUniqueUsers = new Set(yesterdayLogs.map((log: any) => `${log.account_id}_${log.targetName}`));
    const yesterdaySessionCount = yesterdayUniqueUsers.size;
    
    // 计算今天的自动回复数
    const messageCount = todayLogs.filter((log: any) => log.status === 'completed').length;
    
    // 计算昨天的自动回复数
    const yesterdayMessageCount = yesterdayLogs.filter((log: any) => log.status === 'completed').length;
    
    // 计算服务用户数增长率
    let sessionIncrease = 0;
    if (yesterdaySessionCount === 0) {
      // 如果昨天为0，则增长率 = 今天数据 * 100%
      sessionIncrease = sessionCount * 100;
    } else {
      // 增长率 = (今天数据 - 昨天数据) * 100 / 昨天数据
      sessionIncrease = ((sessionCount - yesterdaySessionCount) * 100) / yesterdaySessionCount;
      // 如果是下降，最小值不超过-100%
      if (sessionIncrease < -100) {
        sessionIncrease = -100;
      }
    }
    
    // 计算自动回复数增长率
    let messageIncrease = 0;
    if (yesterdayMessageCount === 0) {
      // 如果昨天为0，则增长率 = 今天数据 * 100%
      messageIncrease = messageCount * 100;
    } else {
      // 增长率 = (今天数据 - 昨天数据) * 100 / 昨天数据
      messageIncrease = ((messageCount - yesterdayMessageCount) * 100) / yesterdayMessageCount;
      // 如果是下降，最小值不超过-100%
      if (messageIncrease < -100) {
        messageIncrease = -100;
      }
    }
    
    // 计算节省工时
    let totalChars = 0;
    todayLogs.forEach((log: any) => {
      if (log.status === 'completed' && log.content) {
        totalChars += log.content.length;
      }
    });
    
    // 每个字按1秒计算，转换为小时，保留2位小数
    const savedHours = parseFloat((totalChars * 5 / 3600).toFixed(2));
    
    // 假设每小时人工成本为25元
    const hourlyRate = 25;
    const savedMoney = parseFloat((savedHours * hourlyRate).toFixed(0));
    
    return {
      sessionCount,
      sessionIncrease: parseFloat(sessionIncrease.toFixed(1)), // 保留1位小数
      messageCount,
      messageIncrease: parseFloat(messageIncrease.toFixed(1)), // 保留1位小数
      savedHours,
      savedMoney
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      sessionCount: 0,
      sessionIncrease: 0,
      messageCount: 0,
      messageIncrease: 0,
      savedHours: 0,
      savedMoney: 0
    };
  }
};
// 添加会话监控控制接口
export const startChatMonitor = async (params?: {
  manualReview?: boolean
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/multi-monitor/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params || {})
    });
    const data = await response.json();
    if (!response.ok) {
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : (typeof data?.message === 'string' ? data.message : '')
      return {
        status: 'error',
        code: typeof data?.code === 'string' ? data.code : `HTTP_${response.status}`,
        message: detail || `启动监控失败（HTTP ${response.status}）`
      }
    }
    // 处理同步相关的错误
    if (data.status === 'error' && (data.code === 'SYNC_REQUIRED' || data.code === 'SYNC_EXPIRED')) {
      throw new Error(JSON.stringify({
        type: 'SYNC_ERROR',
        message: data.message
      }));
    }
    return data;
  } catch (error) {
    console.error('启动会话监控失败:', error);
    throw error;
  }
};
// 确认自动回复
export const confirmAutoReply = async (params: {
  task_id: string;
  action: 'confirm' | 'cancel';
  final_content?: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/v2/tasks/auto-reply/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (error) {
    console.error('确认自动回复失败:', error);
    throw error;
  }
};
export const stopChatMonitor = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/monitor/stop`, {
      method: 'POST',
      headers
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('停止会话监控失败:', error);
    throw error;
  }
};
// 获取最新的会话列表（用于无感刷新）
export const getLatestSessions = async (startTime?: number): Promise<ChatSession[]> => {
  try {
    const url = new URL(`${API_BASE_URL}/chat/latest_sessions`);
    if (startTime) {
      url.searchParams.append('start_time', startTime.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取最新会话列表失败:', error);
    return [];
  }
};
// 获取会话列表
// export const getSessionList = async (reset = false): Promise<ChatSession[]> => {
//     try {
//       console.debug('开始获取会话列表, 参数:', reset);
      
//       // 使用 XMLHttpRequest 替代 fetch 以便更详细地跟踪请求过程
//       return new Promise((resolve, reject) => {
//         const xhr = new XMLHttpRequest();
//         xhr.open('GET', `${API_BASE_URL}/chat/session_list?reset=${reset}`, true);
        
//         // 设置请求头
//         Object.entries(headers).forEach(([key, value]) => {
//           xhr.setRequestHeader(key, value);
//         });
        
//         xhr.onreadystatechange = function() {
//           console.debug('XHR 状态变化:', xhr.readyState, xhr.status);
//           if (xhr.readyState === 4) {
//             if (xhr.status === 200) {
//               try {
//                 const data = JSON.parse(xhr.responseText);
//                 console.debug('获取到的会话列表数据:', data);
                
//                 if (!data || !Array.isArray(data)) {
//                   console.error('会话列表数据格式错误:', data);
//                   resolve([]);
//                 } else {
//                   resolve(data);
//                 }
//               } catch (e) {
//                 console.error('解析响应数据失败:', e, xhr.responseText);
//                 resolve([]);
//               }
//             } else {
//               console.error('请求失败, 状态码:', xhr.status);
//               console.error('响应文本:', xhr.responseText);
//               resolve([]);
//             }
//           }
//         };
        
//         xhr.onerror = function(e) {
//           console.error('请求发生错误:', e);
//           resolve([]);
//         };
        
//         console.debug('发送请求...');
//         xhr.send();
//       });
//     } catch (error) {
//       console.error('获取会话列表失败:', error);
//       return [];
//     }
//   };
// 添加新的接口定义
interface ChatMessagesResponse {
  messages: ChatMessage[];
  chatType: string;
}
// 获取指定会话的聊天记录
export const getChatMessages = async (sessionName: string, accountId?: string): Promise<ChatMessagesResponse> => {
  try {
    const url = new URL(`${API_BASE_URL}/chat/messages/${encodeURIComponent(sessionName)}`);
    if (accountId) {
      url.searchParams.append('account_id', accountId);
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });
    if (!response.ok) {
      throw new Error(`获取聊天记录失败: ${response.status}`);
    }
    const data = await response.json();
    console.debug(`获取 ${sessionName} 的聊天记录:`, data);
    return {
      messages: data.messages || [],
      chatType: data.chatType || 'unknown'
    };
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    return {
      messages: [],
      chatType: 'unknown'
    };
  }
};

// 发送消息
export const sendChatMessage = async (user: string, message: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/send_message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user, message })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
};
// 添加新的任务相关接口
export const createAutoReplyTask = async (params: {
  sessionId: string | number;
  content: string;
  userName: string;
  sessionName: string;  // 会话名称（群聊名称或个人名称）
  isGroup: boolean;
  accountId?: string;   // 账号ID
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/v2/tasks/auto-reply`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (error) {
    console.error('创建自动回复任务失败:', error);
    return { success: false, error: String(error) };
  }
};
export const updateManualReviewStatus = async (enabled: boolean) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/monitor/manual-review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled })
    });
    return await response.json();
  } catch (error) {
    console.error('更新人工复核状态失败:', error);
    throw error;
  }
};
export const getMonitorStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/monitor/status`, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取监控状态失败:', error);
    throw error;
  }
};
