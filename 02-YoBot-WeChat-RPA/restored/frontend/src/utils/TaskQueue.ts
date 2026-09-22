import { ref, computed } from 'vue'
import { headers } from '@/api/config'
// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 任务优先级枚举
export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

// 添加日志类型定义
export interface TaskLog {
  timestamp: Date;
  targetName: string;
  content: string;
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
  chatType: 'single' | 'group';  // 添加聊天类型字段
}

// 任务类型定义
export interface ChatTask {
  id: string;
  sessionId: number;
  userName: string;
  content: string;
  priority: TaskPriority;
  status: TaskStatus;
  createTime: number;
  startTime?: number;
  endTime?: number;
  isGroup: boolean;
  retryCount: number;
  lastError?: string;
  messageNum: number; // 新增消息计数字段
}

export class TaskQueue {
  private tasks = ref<ChatTask[]>([]);
  private taskLogs = ref<TaskLog[]>([]);  // 添加日志存储
  private messageNumLock = ref<boolean>(false);
  // 新增：存储每个会话最后一条自动回复的消息
  private lastAutoReplies = new Map<number, string>();
  
  constructor() {
    // 初始化时从后端获取日志
    this.loadTaskLogs();
  }
  private maxConcurrent = 1; // 最大并发数
  private processing = ref<Set<string>>(new Set()); // 正在处理的任务ID集合
 // 获取当前队列中的任务数量
 public getQueueLength(): number {
  const length = this.tasks.value.filter(task => 
    task.status === TaskStatus.PENDING || 
    task.status === TaskStatus.PROCESSING
  ).length;
  console.log('当前队列任务数量:', length);
  return length;
}
  // 计算属性：按优先级排序的任务列表
  public sortedTasks = computed(() => {
    return [...this.tasks.value].sort((a, b) => {
      // 优先级高的排在前面
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // 同优先级按创建时间排序
      return a.createTime - b.createTime;
    });
  });
  // 添加加载日志的方法
  public async loadTaskLogs() {
    try {
      const response = await fetch('/api/chat/logs', {
        headers: headers
      });
      const data = await response.json();
      if (data.success) {
        this.taskLogs.value = data.logs.map((log: any) => ({
          timestamp: new Date(log.timestamp),
          targetName: log.targetName || log.session_name,  // 兼容两种字段名
          content: log.content,
          status: log.status,
          error: log.error,
          chatType: log.chatType || (log.content?.includes('：') ? 'group' : 'single')  // 根据内容判断类型
        }));
        
        // 按时间倒序排序
        this.taskLogs.value.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  }
  // 添加标记任务为已取消的方法
  public markTaskAsCancelled(taskId: string, reason = '回复内容被过滤') {
    const task = this.tasks.value.find(t => t.id === taskId);
    if (task) {
      task.status = TaskStatus.CANCELLED;
      task.lastError = reason;
      task.messageNum = 0; // 取消时重置消息计数
      console.log('取消任务',task.content)
    }
  }
  // 添加任务
  public addTask(task: Omit<ChatTask, 'id' | 'createTime' | 'status' | 'retryCount' | 'messageNum'>) {
    const waitLock = () => {
      if (this.messageNumLock.value) {
        return new Promise(resolve => setTimeout(() => resolve(waitLock()), 10));
      }
      return Promise.resolve();
    };

    waitLock().then(() => {
      try {
        this.messageNumLock.value = true;
        
        // 查找是否存在相同用户名的任务
        const existingTask = this.tasks.value.find(t => 
          t.userName === task.userName && 
          // (t.status === TaskStatus.PENDING || t.status === TaskStatus.PROCESSING)
          (t.status === TaskStatus.PENDING)
        );
        
        if (existingTask) {
          // 只有待处理或处理中的任务才增加消息计数
          existingTask.messageNum = (existingTask.messageNum || 0) + 1;
          console.log(`更新任务消息数 - ${task.userName}: ${existingTask.messageNum}`);
        } else {
          // 新建任务，初始化消息计数为1
          const newTask: ChatTask = {
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createTime: Date.now(),
            status: TaskStatus.PENDING,
            retryCount: 0,
            messageNum: 1
          };
          this.tasks.value.push(newTask);
          console.log(`添加新任务 - ${task.userName}: 消息数 1`);
          this.processNextTask();
        }
      } finally {
        this.messageNumLock.value = false;
      }
    });
  }

  // 获取下一个待处理任务
  private getNextTask(): ChatTask | undefined {
    return this.sortedTasks.value.find(task => 
      task.status === TaskStatus.PENDING || 
      (task.status === TaskStatus.FAILED && task.retryCount < 3)
    );
  }

  // 处理下一个任务
  private async processNextTask() {
    if (this.processing.value.size >= this.maxConcurrent) {
      return;
    }

    const task = this.getNextTask();
    if (!task) {
      return;
    }

    this.processing.value.add(task.id);
    task.status = TaskStatus.PROCESSING;
    task.startTime = Date.now();

    try {
      await this.processTask(task);
      
      task.status = TaskStatus.COMPLETED;
      task.endTime = Date.now();
      task.messageNum = 0; // 重置消息计数

      // 修正群聊判断逻辑
      const isGroupChat = task.content.includes('：') || task.isGroup;
      console.log("任务：消息发送成功")
      this.addTaskLog({
        timestamp: new Date(),
        targetName: task.userName,
        content: task.content,
        status: 'completed',
        chatType: isGroupChat ? 'group' : 'single'
      });
    } catch (error: Error | unknown) {
      const err = error as Error
      console.error("任务：消息发送失败",err.message)
      task.status = TaskStatus.FAILED;
      task.lastError = err.message;
      task.retryCount++;
      
       // 添加失败日志（只在最后一次重试失败时添加）
       if (task.retryCount >= 3) {
        task.messageNum = 0; // 重试失败后重置消息计数
        this.addTaskLog({
          timestamp: new Date(),
          targetName: task.userName,
          content: task.content,
          status: 'failed',
          error: err.message,
          chatType: task.isGroup ? 'group' : 'single'
        });
      }
    } finally {
      this.processing.value.delete(task.id);
      this.processNextTask();
    }
  }

   // 添加日志记录方法
   private async addTaskLog(log: TaskLog) {
    try {
      // 发送日志到后端保存
      const response = await fetch('/api/chat/logs', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(log)
      });

      if (response.ok) {
        this.taskLogs.value.unshift(log);
        if (this.taskLogs.value.length > 100) {
          this.taskLogs.value = this.taskLogs.value.slice(0, 100);
        }
      }
    } catch (error) {
      console.error('保存日志失败:', error);
    }
  }
  // 获取任务日志
  public getTaskLogs(): TaskLog[] {
    return this.taskLogs.value;
  }

  // 清理过期日志（可选，比如清理 24 小时前的日志）
  public cleanOldLogs() {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.taskLogs.value = this.taskLogs.value.filter(
      log => log.timestamp.getTime() > twentyFourHoursAgo
    );
  }
  private taskHandler?: (task: ChatTask) => Promise<void>;
  // 添加任务处理器设置方法
  public setTaskHandler(handler: (task: ChatTask) => Promise<void>) {
    this.taskHandler = handler;
  }
  // 修改处理任务的方法
  private async processTask(task: ChatTask): Promise<void> {
    if (!this.taskHandler) {
      throw new Error('Task handler not set');
    }
    await this.taskHandler(task);
  }
  public hasDuplicateTask(userName: string, isGroup: boolean): boolean {
    return this.tasks.value.some(task => 
      task.userName === userName && 
      task.isGroup === isGroup &&
      (task.status === TaskStatus.PENDING)
    );
  }

  // 获取任务的消息数
  public getTaskMessageNum(userName: string): number {
    const task = this.tasks.value.find(t => t.userName === userName);
    return task?.messageNum || 0;
  }

  // 获取任务状态
  public getTaskStatus(taskId: string): TaskStatus | undefined {
    const task = this.tasks.value.find(t => t.id === taskId);
    return task?.status;
  }

  // 取消任务
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.value.find(t => t.id === taskId);
    if (task && task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.FAILED;
      task.lastError = 'Task cancelled';
      return true;
    }
    return false;
  }

  // 清理已完成的任务
  public cleanCompletedTasks() {
    this.tasks.value = this.tasks.value.filter(task => 
      task.status !== TaskStatus.COMPLETED
    );
  }

  // 获取队列统计信息
  public getQueueStats() {
    const stats = {
      total: this.tasks.value.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    this.tasks.value.forEach(task => {
      stats[task.status]++;
    });

    return stats;
  }

    // 新增：记录自动回复消息
    public recordAutoReply(sessionId: number, content: string) {
      console.log()
      this.lastAutoReplies.set(sessionId, content);
    }
  
    // 新增：检查是否是自动回复消息
    public isAutoReplyMessage(sessionId: number, content: string): boolean {
      const lastReply = this.lastAutoReplies.get(sessionId);
      return lastReply === content;
    }
}

// 导出单例
export const taskQueue = new TaskQueue();