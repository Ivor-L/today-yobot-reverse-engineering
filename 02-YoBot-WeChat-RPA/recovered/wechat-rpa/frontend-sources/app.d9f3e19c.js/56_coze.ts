import { API_BASE_URL as BASE_URL, headers } from './config'
const API_BASE_URL = `${BASE_URL}/api`

interface CozeResponse {
  code: number
  data: any
  msg: string
}

interface ChatResponse extends CozeResponse {
  data: {
    id: string
    conversation_id: string
    status: string
  }
}

interface MessageResponse extends CozeResponse {
  data: Array<{
    content: string
    type: string
    role: string
  }>
}
export const testAgent = async (agentId: string, platform: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/agent/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent_id: agentId,
        platform: platform
      })
    })
    
    return await response.json()
  } catch (error) {
    console.error('测试智能体失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络错误'
    }
  }
}
export class CozeService {
    private readonly token: string
    private  polling: boolean
    private readonly maxRetries: number

    constructor(token: string) {
        this.token = token
        this.polling = false
        this.maxRetries = 60
    }

  // 发起对话
  async startChat(botId: string, message: string,sessionId: string): Promise<string> {
    try {
      const chatResponse = await this.initializeChat(botId, message,sessionId)
      if (chatResponse.code !== 0) {
        throw new Error(chatResponse.msg || '发起对话失败')
      }

      const { id, conversation_id } = chatResponse.data
      
      // 轮询对话状态
      const completed = await this.pollChatStatus(conversation_id, id)
      if (!completed) {
        throw new Error('对话超时')
      }

      // 获取对话内容
      const reply = await this.getChatMessages(conversation_id, id)
      return reply
    } catch (error) {
      console.error('Coze对话失败:', error)
      throw error
    }
  }

  // 初始化对话
  private async initializeChat(botId: string, message: string, sessionId: string): Promise<ChatResponse> {
    console.log("initializeChat==>token",this.token);
    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bot_id: botId,
        user_id: `user_${sessionId}`,
        stream: false,
        auto_save_history: true,
        additional_messages: [{
          role: "user",
          content: message,
          content_type: "text"
        }]
      })
    })

    return await response.json()
  }

  // 轮询对话状态
  private async pollChatStatus(conversationId: string, chatId: string): Promise<boolean> {
    let retries = 0
    this.polling = true

    while (this.polling && retries < this.maxRetries) {
      try {
        const response = await fetch(
          `https://api.coze.cn/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            },
          }
        )

        const data = await response.json()
        if (data.code === 0 && data.data.status === 'completed') {
          this.polling = false
          return true
        }

        await new Promise(resolve => setTimeout(resolve, 2000))
        retries++
      } catch (error) {
        console.error('轮询状态失败:', error)
        this.polling = false
        throw error
      }
    }

    this.polling = false
    return false
  }

  // 获取对话消息
  private async getChatMessages(conversationId: string, chatId: string): Promise<string> {
    const response = await fetch(
      `https://api.coze.cn/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
      }
    )

    const data: MessageResponse = await response.json()
    if (data.code !== 0) {
      throw new Error(data.msg || '获取消息失败')
    }

    // 查找类型为 answer 的回复消息
    const answerMessage = data.data.find(msg => msg.type === 'answer' && msg.role === 'assistant')
    return answerMessage?.content || '暂无回复'
  }
}