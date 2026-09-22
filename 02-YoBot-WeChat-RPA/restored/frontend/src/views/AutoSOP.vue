<template>
  <div class="auto-sop-container">
    <!-- 左侧功能区 -->
    <div class="function-section">
      <div class="section-title">功能</div>
      <div class="function-list">
        <div class="function-item" 
          :class="{ active: currentFunction === 'comment', disabled: !isFunctionEnabled('comment') }"
          :title="functionDisabledReason('comment')"
          @click="switchFunction('comment')"
          data-function="comment">
          <div class="function-icon">
            <img 
              :src="getAutoSopIconPath('comment', currentFunction === 'comment')" 
              class="icon" 
              alt="朋友圈运营"
            >
          </div>
          <div class="function-tooltip">朋友圈运营</div>
        </div>

        <div class="function-item"
          :class="{ active: currentFunction === 'activate', disabled: !isFunctionEnabled('activate') }"
          :title="functionDisabledReason('activate')"
          @click="switchFunction('activate')"
          data-function="activate">
          <div class="function-icon">
            <img 
              :src="getAutoSopIconPath('activate', currentFunction === 'activate')" 
              class="icon" 
              alt="主动推送"
            >
          </div>
          <div class="function-tooltip">主动推送</div>
        </div>
        
        <div class="function-item"
          :class="{ active: currentFunction === 'addFriend', disabled: !isFunctionEnabled('addFriend') }"
          :title="functionDisabledReason('addFriend')"
          @click="switchFunction('addFriend')"
          data-function="addFriend">
          <div class="function-icon">
            <img 
              :src="getAutoSopIconPath('addFriend', currentFunction === 'addFriend')" 
              class="icon" 
              alt="通过好友"
            >
          </div>
          <div class="function-tooltip">通过好友</div>
        </div>

        <div class="function-item"
          :class="{ active: currentFunction === 'addNewFriend', disabled: !isFunctionEnabled('addNewFriend') }"
          :title="functionDisabledReason('addNewFriend')"
          @click="switchFunction('addNewFriend')"
          data-function="addNewFriend">
          <div class="function-icon">
            <img 
              :src="getAutoSopIconPath('addNewFriend', currentFunction === 'addNewFriend')" 
              class="icon" 
              alt="添加好友"
            >
          </div>
          <div class="function-tooltip">添加好友</div>
        </div>

        <!-- 自动跟进功能 -->
        <div class="function-item"
          :class="{ active: currentFunction === 'autoFollow', disabled: !isFunctionEnabled('autoFollow') }"
          :title="functionDisabledReason('autoFollow')"
          @click="switchFunction('autoFollow')"
          data-function="autoFollow">
          <div class="function-icon">
            <img
              :src="getAutoSopIconPath('autoFollow', currentFunction === 'autoFollow')"
              class="icon"
              alt="自动跟进"
            >
          </div>
          <div class="function-tooltip">自动跟进</div>
        </div>

        <!-- SOP编排 -->
        <div class="function-item"
          :class="{ active: currentFunction === 'sop', disabled: !isFunctionEnabled('sop') }"
          :title="functionDisabledReason('sop')"
          @click="switchFunction('sop')"
          data-function="sop">
          <div class="function-icon">
            <el-icon class="icon" :size="22"><Operation /></el-icon>
          </div>
          <div class="function-tooltip">SOP编排</div>
        </div>

        <!-- <div class="function-item"
          :class="{ active: currentFunction === 'chatAnalysis' }"
          @click="switchFunction('chatAnalysis')"
          data-function="chatAnalysis">
          <div class="function-icon">
            <img 
              :src="getAutoSopIconPath('chatAnalysis', currentFunction === 'chatAnalysis')" 
              class="icon" 
              alt="聊天分析"
            >
          </div>
          <div class="function-tooltip">聊天分析</div>
        </div> -->
      </div>
    </div>

    <!-- 中间设置区 -->
    <div class="content-wrapper" ref="contentWrapperRef">
      <div class="config-section">
        <template v-if="currentFunction === 'activate'">
          <MassSendingPanel
            :greeting-groups="greetingGroups"
            :current-instance-nickname="currentInstanceNickname"
            :current-instance-account-id="currentInstanceAccountId"
            :runtime-enabled="isFunctionEnabled('activate')"
            :disabled-reason="functionDisabledReason('activate')"
          />
        </template>
        <template v-if="currentFunction === 'sop'">
          <SopOrchestration
            :greeting-groups="greetingGroups"
            :coze-agents="cozeAgents"
            :groups="groupList"
            :runtime-enabled="isFunctionEnabled('sop')"
            :disabled-reason="functionDisabledReason('sop')"
            :action-availability="sopActionAvailability"
          />
        </template>
        <template v-if="currentFunction === 'comment'">
          <div class="section-title">自动评论朋友圈</div>
          <div class="config-content">
            <el-form :model="commentConfig" label-width="120px">
              <el-form-item label="条数上限">
                <el-input-number 
                  v-model="commentConfig.commentLimit" 
                  :min="1" 
                  :max="1000"
                  placeholder="请输入条数限制"
                  v-tooltip="'请输入条数限制'"
                />
              </el-form-item>
              <el-form-item label="单好友次数">
                <el-input-number 
                  v-model="commentConfig.perFriendLimit" 
                  :min="1" 
                  :max="10"
                  placeholder="单个好友评论次数上限"
                  v-tooltip="'单个好友评论次数的上限'"
                />
              </el-form-item>
              <el-form-item label="循环间隔(分钟)">
                <el-input-number
                  v-model="commentConfig.checkInterval"
                  :min="1"
                  :max="1440"
                  :default-value="120"
                  placeholder="任务循环执行间隔时间"
                  v-tooltip="'任务循环执行间隔时间'"
                />
              </el-form-item>
              <el-form-item label="到达上次位置">
                <el-select v-model="commentConfig.reachLastPosition" placeholder="请选择处理方式">
                  <el-option label="终止本次任务" value="stop" />
                  <el-option label="跳过并继续" value="skip" />
                </el-select>
              </el-form-item>
              <el-form-item label="互动模式">
                <el-select v-model="commentConfig.interactionMode" placeholder="请选择互动模式">
                  <el-option label="仅点赞" value="like_only" />
                  <el-option label="仅评论" value="comment_only" />
                  <el-option label="评论才点赞" value="like_and_comment" />
                  <el-option label="点赞+评论(必点赞)" value="like_always_and_comment" />
                </el-select>
              </el-form-item>
              <el-form-item label="标签(非必须)">
                <el-button 
                  type="primary" 
                  :disabled="!isFunctionEnabled('comment')"
                  :title="functionDisabledReason('comment')"
                  @click="openTagDialog"
                >
                  <el-icon class="el-icon--left"><PriceTag /></el-icon>
                  选择标签
                </el-button>
              </el-form-item>

              <!-- 显示选中的标签 -->
              <el-form-item v-if="commentConfig.selectedTagNames.length > 0" label="">
                <div class="sop-tag-summary">
                    <el-icon style="margin-right: 6px;"><PriceTag /></el-icon>
                    <span style="margin-right: 6px;">已选：</span>
                    <span v-if="commentConfig.selectedTagNames.length <= 3">
                      {{ commentConfig.selectedTagNames.join('、') }}
                    </span>
                    <span v-else>
                      {{ commentConfig.selectedTagNames.slice(0, 3).join('、') }}...等{{ commentConfig.selectedTagNames.length }}个标签
                    </span>
                </div>
              </el-form-item>
              <el-form-item label="选择智能体" class="custom-label-form-item last-form-item">
                <el-select 
                  v-model="commentConfig.agentId" 
                  placeholder="请选择智能体"
                >
                  <el-option
                    v-for="agent in cozeAgents"
                    :key="agent.botId"
                    :label="agent.name"
                    :value="agent.botId"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="" class="align-right-form-item">
                <el-checkbox v-model="commentConfig.multiCycleEnabled" @change="onCommentMultiCycleToggle" :disabled="commentConfig.enabled">
                  多微信循环
                </el-checkbox>
              </el-form-item>
              <div v-if="commentConfig.multiCycleEnabled" class="multi-cycle-box" :class="{ disabled: commentConfig.enabled }" aria-disabled="commentConfig.enabled">
                <div class="multi-cycle-tip">按勾选的账号循环执行朋友圈评论</div>
                <el-checkbox-group v-model="commentConfig.selectedAccounts">
                  <el-checkbox
                    v-for="inst in activeInstances"
                    :key="inst.account_id"
                    :label="inst.account_id"
                    class="instance-item"
                    :disabled="commentConfig.enabled"
                  >
                    {{ inst.nickname }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
              <el-form-item>
                <div class="comment-action">
                  <cosmic-switch
                  v-model="commentConfig.enabled"
                  :loading="isRunning"
                  :disabled="!isFunctionEnabled('comment')"
                  :title="functionDisabledReason('comment')"
                    @change="handleSwitchChange"
                    active-text="开启任务"
                    inactive-text="关闭任务"
                  />
                </div>
              </el-form-item>
            </el-form>
            <!-- 添加提示信息 -->
            <div v-if="commentConfig.enabled" class="comment-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>关闭开关后，等待一会即可自动终止朋友圈自动化任务~</span>
            </div>
          </div>
        </template>

        <!-- 在右侧配置区添加自动通过好友配置 -->
        <template v-if="currentFunction === 'addFriend'">
          <div class="section-title">自动通过好友</div>
          <!-- 添加提示语 -->
          <div class="config-tip" v-if="friendRequestExecutionTime">
            <el-icon><InfoFilled /></el-icon>
            <span>{{ friendRequestExecutionTime }}</span>
          </div>
            <div class="config-content">
            <el-form :model="friendConfig" label-width="120px">
              <el-form-item label="每日通过上限">
                <el-input-number 
                  v-model="friendConfig.maxFriendsPerDay" 
                  :min="1" 
                  :max="100"
                  :step="1"
                />
              </el-form-item>
              
              <el-form-item label="检查间隔(分钟)">
                <el-input-number 
                  v-model="friendConfig.checkInterval" 
                  :min="5" 
                  :max="120"
                  :step="5"
                />
              </el-form-item>
              
              <el-form-item label="单次最大处理">
                <el-input-number 
                  v-model="friendConfig.maxProcessPerTime" 
                  :min="1" 
                  :max="20"
                  :step="1"
                />
              </el-form-item>
              <el-form-item label="打招呼话术">
                <el-select 
                  v-model="friendConfig.greetingGroupId" 
                  placeholder="选择打招呼话术组"
                  clearable
                >
                  <el-option label="不发送打招呼" value="" />
                  <el-option
                    v-for="group in greetingGroups"
                    :key="group.id"
                    :label="group.name"
                    :value="group.id"
                  />
                </el-select>
              </el-form-item>
              <!-- 添加自动拉群配置项 -->
              <el-form-item label="自动拉群">
                <el-select 
                  v-model="friendConfig.targetGroup" 
                  placeholder="选择目标群聊"
                  filterable
                  clearable
                  @focus="loadGroupList"
                >
                  <el-option label="不自动拉群" value="" />
                  <el-option
                    v-for="group in groupList"
                    :key="group.name"
                    :label="group.name"
                    :value="group.name"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="好友标签" class="friend-tag-input">
                <el-input 
                  v-model="friendConfig.tag"
                  placeholder="请输入标签"
                  :maxlength="20"
                  @input="validateTag"
                />
              </el-form-item>
              
              <el-form-item label="">
                <el-checkbox v-model="friendConfig.multiCycleEnabled" @change="onFriendMultiCycleToggle" :disabled="friendConfig.enabled">
                  多微信循环
                </el-checkbox>
              </el-form-item>
              <div v-if="friendConfig.multiCycleEnabled" class="multi-cycle-box" :class="{ disabled: friendConfig.enabled }" aria-disabled="friendConfig.enabled">
                <div class="multi-cycle-tip">按勾选的账号循环自动通过好友</div>
                <el-checkbox-group v-model="friendConfig.selectedAccounts">
                  <el-checkbox
                    v-for="inst in activeInstances"
                    :key="inst.account_id"
                    :label="inst.account_id"
                    class="instance-item"
                    :disabled="friendConfig.enabled"
                  >
                    {{ inst.nickname}}
                  </el-checkbox>
                </el-checkbox-group>
              </div>

              <el-form-item>
                <cosmic-switch
                  v-model="friendConfig.enabled"
                  :loading="isRunning"
                  :disabled="!isFunctionEnabled('addFriend')"
                  :title="functionDisabledReason('addFriend')"
                  active-text="开启任务"
                  inactive-text="关闭任务"
                  @change="handleFriendSwitchChange"
                />
              </el-form-item>
            </el-form>
          </div>
        </template>
        <template v-if="currentFunction === 'addNewFriend'">
          <div class="section-title">
            <span>添加好友</span>
            <div class="button-group sop-header-actions">
              <el-button
                type="primary"
                size="small"
                class="sop-header-btn"
                :disabled="!isFunctionEnabled('addNewFriend')"
                :title="functionDisabledReason('addNewFriend')"
                @click="showImportDialog"
              >
                导入名单
              </el-button>
              <el-button type="info" plain size="small" class="sop-header-btn" @click="showFriendList">
                记录
              </el-button>
            </div>
          </div>
          
          <div class="remaining-count">
            今日已加 {{ todayAddedCount }} 人，剩余可加 {{ remainingCount }} 人
          </div>
          <!-- 风控提示横幅 -->
          <div v-if="riskAccounts.length > 0" class="risk-banner">
            <el-alert
              :title="'微信 ' + riskAccounts.join(', ') + ' 风控中，暂无法加好友'"
              type="warning"
              show-icon
              :closable="false"
              style="margin-top: 10px;"
            />
          </div>
          <!-- 执行时间提示 -->
          <div class="config-tip" v-if="addFriendExecutionTime">
            <el-icon><InfoFilled /></el-icon>
            <span>{{ addFriendExecutionTime }}</span>
          </div>
          <div class="config-content">
            <el-form :model="addFriendConfig" label-width="120px">
              <el-form-item label="每日添加上限">
                <el-input-number 
                  v-model="addFriendConfig.maxFriendsPerDay" 
                  :min="1" 
                  :max="100"
                  :step="1"
                />
              </el-form-item>
              
              <el-form-item label="添加间隔(分钟)">
                <el-input-number 
                  v-model="addFriendConfig.interval" 
                  :min="1" 
                  :max="120"
                  :step="5"
                />
              </el-form-item>
              
              <el-form-item label="单次添加人数">
                <el-input-number 
                  v-model="addFriendConfig.batchSize" 
                  :min="1" 
                  :max="10"
                  :step="1"
                />
              </el-form-item>
              <!-- 添加验证消息配置 -->
              <el-form-item label="验证消息">
                <el-input
                  v-model="addFriendConfig.verifyMessage"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入添加好友时的验证消息"
                />
              </el-form-item>
              <el-form-item label="">
                <el-checkbox v-model="addFriendConfig.multiCycleEnabled" @change="onMultiCycleToggle" :disabled="addFriendConfig.enabled">
                  多微信循环
                </el-checkbox>
              </el-form-item>
              <div v-if="addFriendConfig.multiCycleEnabled" class="multi-cycle-box" :class="{ disabled: addFriendConfig.enabled }" aria-disabled="addFriendConfig.enabled">
                <div class="multi-cycle-tip">按勾选的账号循环添加好友</div>
                <!-- <div v-if="addFriendConfig.enabled" class="multi-cycle-lock-tip">当前任务已开启，关闭后可修改分流配置</div> -->
                <el-checkbox-group v-model="addFriendConfig.selectedAccounts">
                  <el-checkbox
                    v-for="inst in activeInstances"
                    :key="inst.account_id"
                    :label="inst.account_id"
                    class="instance-item"
                    :disabled="addFriendConfig.enabled"
                  >
                    {{ inst.nickname}}
                  </el-checkbox>
                </el-checkbox-group>
              </div>

              <el-form-item>
                <cosmic-switch
                  v-model="addFriendConfig.enabled"
                  :loading="isRunning"
                  :disabled="!isFunctionEnabled('addNewFriend')"
                  :title="functionDisabledReason('addNewFriend')"
                  active-text="开启任务"
                  inactive-text="关闭任务"
                  @change="handleAddFriendSwitchChange"
                />
              </el-form-item>
            </el-form>
          </div>
        </template>

        <!-- 自动跟进功能配置 -->
        <template v-if="currentFunction === 'autoFollow'">
          <AutoFollowTaskList
            ref="autoFollowTaskListRef"
            :runtime-enabled="isFunctionEnabled('autoFollow')"
            :disabled-reason="functionDisabledReason('autoFollow')"
          />
        </template>


      </div>
      <!-- 右侧日志区（SOP编排为整页交互，不展示日志区） -->
      <div v-if="currentFunction !== 'sop'" class="log-section" :class="{ 'hidden': !isLogVisible }">
        <div class="section-title">操作日志</div>
        <div class="log-content">
          <el-scrollbar>
                <!-- 评论朋友圈日志 -->
                <template v-if="currentFunction === 'comment'">
                  <template v-if="momentLogs.length > 0">
                    <div v-for="log in momentLogs" :key="log.id" class="log-item moment-log">
                      <div class="log-header">
                        <div class="log-status-time">
                          <span class="log-time">{{ formatTimestamp(log.timestamp) }}</span>
                          <el-tag v-if="log.account_id" size="small" type="info" style="margin-left: 8px;">{{ log.account_id }}</el-tag>
                        </div>
                      </div>
                      <div class="log-info">
                        <div class="task-details">
                          <div class="publisher">
                            <el-icon><User /></el-icon>
                            <span> {{ log.publisher }}</span>
                          </div>
                          <div class="moment-content">
                            {{ log.content }}
                          </div>

                          <div class="comment-info">
                            <template v-if="log.type.includes('like')">
                              <span class="like-action">❤ 点赞</span>
                            </template>
                            <template v-if="log.type.includes('comment') && log.comment_content && log.comment_content.trim() !== ''">
                              <span class="comment-action">
                                <span class="comment-text">AI评论：{{ log.comment_content }}</span>
                              </span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="empty-state">
                      <img :src="getPngIconPath('empty')" alt="暂无数据" class="empty-icon" />
                      <div class="empty-text">最近没有新的操作记录</div>
                    </div>
                  </template>
                </template>
            
            <!-- 群发任务日志 -->
            <template v-else-if="currentFunction === 'activate'">
              <template v-if="filteredLogs.length > 0">
                <div v-for="log in filteredLogs" :key="log.id" class="log-item task-log">
                  <div class="log-header">
                    <div class="log-status-time">
                      <span class="log-time">{{ formatTimestamp(log.timestamp) }}</span>
                      <el-tag v-if="log.account_id" size="small" type="info" style="margin-left: 8px;">{{ log.account_id }}</el-tag>
                      <!-- <el-tag :type="getStatusType(log.status)" size="small" style="margin-left: 8px;">
                        {{ getStatusText(log.status) }}
                      </el-tag> -->
                    </div>
                  </div>
                  <div class="log-info">
                    <div class="task-details">
                      <div class="task-progress" v-if="log.progress !== undefined">
                        发送给 {{ log.total }} 人，已完成 {{ log.progress }} 人
                      </div>
                      <div class="task-group">
                        话术组：{{ log.params?.agentId || '--' }}
                      </div>
                      <div class="task-schedule" v-if="log.params?.scheduleTime">
                        执行时间：{{ formatScheduleTime(log.params.scheduleTime) }}
                      </div>
                    </div>
                    <div class="task-error" v-if="log.error">
                      <el-icon><Warning /></el-icon>
                      <span>{{ log.error }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="empty-state">
                  <img :src="getPngIconPath('empty')" alt="暂无数据" class="empty-icon" />
                  <div class="empty-text">最近没有新的操作记录</div>
                </div>
              </template>
            </template>

            <!-- 通过好友申请日志 -->
            <template v-else-if="currentFunction === 'addFriend'">
              <template v-if="friendLogs.length > 0">
                <div v-for="log in friendLogs" :key="log.task_id" class="log-item friend-log">
                  <div class="log-header">
                    <div class="log-status-time">
                      <span class="log-time">{{ formatTimestamp(log.time) }}</span>
                      <el-tag v-if="log.account_id" size="small" type="info" style="margin-left: 8px;">{{ log.account_id }}</el-tag>
                      <!-- <el-tag :type="getStatusType(log.status)" size="small" style="margin-left: 8px;">
                        {{ getStatusText(log.status) }}
                      </el-tag> -->
                    </div>
                  </div>
                  <div class="log-info">
                    <div class="task-details">
                      <div class="friend-count">
                        本次执行通过了 {{ log.processed_count }} 个好友申请
                      </div>
                      <div class="friend-tag" v-if="log.tag">
                        <el-icon><PriceTag /></el-icon>
                        <span>标签: {{ log.tag }}</span>
                      </div>
                      <div class="friend-tag" v-if="log.targetGroup">
                        <el-icon><ChatDotRound /></el-icon>
                        <span>拉群: {{ log.targetGroup }}</span>
                      </div>
                      <!-- 新增的目标明细列表 -->
                      <div class="target-list" v-if="log.processed_users && log.processed_users.length > 0">
                        <div v-for="(user, idx) in log.processed_users" :key="idx" class="target-item">
                          <div class="target-left">
                            <span class="target-wxid" :title="user">{{ user }}</span>
                          </div>
                          <div class="target-right">
                            <span class="status-success">已通过</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="empty-state">
                  <img :src="getPngIconPath('empty')" alt="暂无数据" class="empty-icon" />
                  <div class="empty-text">最近没有新的操作记录</div>
                </div>
              </template>
            </template>

            <!-- 添加好友日志 -->
            <template v-else-if="currentFunction === 'addNewFriend'">
              <template v-if="addFriendLogs.length > 0">
                <div v-for="log in addFriendLogs" :key="log.task_id" class="log-item friend-log">
                  <div class="log-header">
                    <div class="log-status-time">
                      <span class="log-time">{{ formatTimestamp(log.time) }}</span>
                      <el-tag v-if="log.account_id" size="small" type="info" style="margin-left: 8px;">{{ log.account_id }}</el-tag>
                    </div>
                  </div>
                  <div class="log-info">
                    <div class="task-details">
                      <div class="friend-info">
                        <span>尝试添加 {{ log.attempt_count }} 人，成功 {{ log.processed_count }} 人</span>
                      </div>
                      <div class="friend-tags" v-if="log.tag">
                        <span class="greeting-text">验证信息：{{ log.tag }}</span>
                      </div>
                      <!-- 新增的目标明细列表 -->
                      <div class="target-list" v-if="log.targets && log.targets.length > 0">
                        <div v-for="(target, idx) in log.targets" :key="idx" class="target-item">
                          <div class="target-left">
                            <span class="target-name" :title="target.nickname">{{ target.nickname || '未知' }}</span>
                            <span class="target-wxid" :title="target.wxid">({{ target.wxid }})</span>
                          </div>
                          <div class="target-right">
                            <span v-if="target.status === 'success'" class="status-success">添加成功</span>
                            <span v-else class="status-failed" :title="target.error_msg">{{ target.error_msg || '添加失败' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="empty-state">
                  <img :src="getPngIconPath('empty')" alt="暂无数据" class="empty-icon" />
                  <div class="empty-text">最近没有新的操作记录</div>
                </div>
              </template>
            </template>

            <!-- 自动跟进执行日志 -->
            <template v-else-if="currentFunction === 'autoFollow'">
              <AutoFollowLogs ref="autoFollowLogsRef" />
            </template>

          </el-scrollbar>
        </div>
      </div>
    </div>
    <import-friend-list-dialog
      v-model:visible="importDialogVisible"
      :cozeAgents="cozeAgents"
      :allowed-types="friendImportTypes"
      @import="handleImportFriendList"
      @importByAgent="handleImportByAgent"
    />
  </div>
  <FriendListDialog
    v-model:visible="friendListVisible"
    @refresh="loadRemainingCount"/>
    <!-- 授权弹窗 -->
    <el-dialog
      title="需要授权"
      v-model="authDialogVisible"
      width="400px"
    >
      <div class="auth-dialog-content">
        <el-alert
          title="需要授权访问飞书文档"
          type="info"
          description="智能体需要获取飞书文档的访问权限，请点击下方按钮前往授权。"
          :closable="false"
          show-icon
        />
        <div class="auth-actions">
          <el-button type="primary" @click="openAuthUrl">去授权</el-button>
          <el-button @click="authDialogVisible = false">取消</el-button>
          <el-button v-if="hasClickedAuth" type="success" @click="authDialogVisible = false">我已授权</el-button>
        </div>
      </div>
    </el-dialog>
    <!-- 标签选择弹窗 -->
    <el-dialog
      v-model="tagDialogVisible"
      title="选择标签"
      width="500px"
      @close="cancelTagSelection"
      class="tag-selection-dialog"
    >
      <div class="tag-selection-content">
        <el-checkbox-group v-model="tempSelectedTags" class="tag-checkbox-group">
          <el-checkbox 
            v-for="tag in userTags" 
            :key="tag.id" 
            :label="tag.id"
            class="tag-checkbox-item"
          >
            <span class="tag-name">{{ tag.name }}</span>
            <span class="tag-count">({{ tag.count }})</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer>
        <div class="dialog-footer-custom">
          <el-button @click="resetTagSelection" type="danger" plain>重置</el-button>
          <div class="action-buttons">
            <el-button @click="cancelTagSelection">取消</el-button>
            <el-button type="primary" @click="confirmTagSelection">确定</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref,onMounted,computed,onUnmounted ,watch, onActivated} from 'vue'
import {User, Warning,PriceTag, InfoFilled, Operation} from '@element-plus/icons-vue'
import FriendListDialog from '@/components/sop/FriendListDialog.vue'
import ImportFriendListDialog from '@/components/sop/ImportFriendListDialog.vue'
import { ElMessage } from 'element-plus'
import { getConfig, saveConfig } from '@/api/config'
import type { CozeAgent } from '@/types/coze' 
import {getTaskLogs,toggleAutoAddFriend,getFriendRequestLogs,getRemainingFriendCount,getFriendRequestRiskRecords,
  toggleAutoAddNewFriend,importFriendList,toggleAutoComment,importFriendListByAgent,getAddFriendLogs, getMomentLogs} from '@/api/autosop'
import MassSendingPanel from '@/components/sop/MassSendingPanel.vue'
import SopOrchestration from '@/components/sop/SopOrchestration.vue'
import AutoFollowTaskList from '@/components/AutoFollowTaskList.vue'
import AutoFollowLogs from '@/components/AutoFollowLogs.vue'
import { getContactTags ,getGroups, Tag} from '@/api/contact'
import { useRoute } from 'vue-router'
import CosmicSwitch from '@/components/ui/CosmicSwitch.vue'
import { getActiveInstances, type Instance } from '@/api/moments'
import { getAutoSopIconPath, getPngIconPath } from '@/utils/iconImages'
import {
  AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID,
  SOP_EDITOR_ACTION_KEY_BY_TYPE
} from '@/runtime/capabilities'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'
import '@/styles/sop.css'
const route = useRoute()
const {
  resolveAction,
  isActionEnabled,
  actionReason,
  requireAction,
  isMacStrictRuntime
} = useRuntimeCapabilityPresentation()
const friendImportTypes = computed<Array<'excel' | 'agent' | 'api'>>(() => (
  isMacStrictRuntime.value ? ['excel'] : ['excel', 'agent', 'api']
))
const functionActionKey = (func: string) => AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID[func] || ''
const isFunctionEnabled = (func: string) => {
  const actionKey = functionActionKey(func)
  return actionKey ? isActionEnabled(actionKey) : false
}
const functionDisabledReason = (func: string) => {
  const actionKey = functionActionKey(func)
  return actionKey ? actionReason(actionKey) : '当前页面功能尚未登记能力规则'
}
const requireFunction = (func: string) => {
  const actionKey = functionActionKey(func)
  return actionKey ? requireAction(actionKey) : false
}
const sopActionAvailability = computed(() => Object.fromEntries(
  Object.entries(SOP_EDITOR_ACTION_KEY_BY_TYPE).map(([type, actionKey]) => {
    const resolution = resolveAction(actionKey)
    return [type, {
      enabled: resolution.enabled,
      reason: resolution.enabled ? '' : actionReason(actionKey)
    }]
  })
))
const groupList = ref<any[]>([])
// 添加评论配置
const commentConfig = ref({
  commentLimit: 10,
  perFriendLimit: 2,
  autoLike: false,
  interactionMode:'like_and_comment',
  checkInterval: 120, // 默认120分钟
  reachLastPosition: 'stop', // 默认终止任务
  blacklist: '',
  agentId: '',
  enabled: false,
  multiCycleEnabled: false,
  selectedAccounts: [] as string[],
  selectedTags:[] as string[], // 选中的标签ID列表
  selectedTagNames: [] as string[] // 选中的标签名称列表（用于显示）
})
const addFriendConfig = ref({
  maxFriendsPerDay: 10,
  interval: 30,
  batchSize: 1,
  targetGroup: '',
  verifyMessage:'',
  enabled: false,
  multiCycleEnabled: false,
  selectedAccounts: [] as string[]
})
const restTimeSettings = ref<RestTimeSettings>({
  startTime: 0,
  endTime: 28,
  selectedTasks: []
})
const addFriendLogs = ref<AddFriendLog[]>([])
const riskAccounts = ref<string[]>([])
const remainingCount = ref(0)
const todayAddedCount = ref(0)
const importDialogVisible = ref(false)
const friendListVisible = ref(false)
// 添加统一的日志参数接口定义
interface LogParams {
  content?: string
  scheduleTime?: string
  contentType?: string
  progress?: number
  total?: number
  greetingGroupId?: string
  timestamp?: string
}
interface RestTimeSettings {
  startTime: number
  endTime: number
  selectedTasks: string[]
}
interface AddFriendLog {
  task_id: string
  account_id?: string // 微信账号
  time: string  // 任务执行时间
  processed_count: number  // 成功数量
  attempt_count: number  // 尝试总数
  tag: string  // 打招呼话术
  targets?: Array<{ // 新增的目标明细
    wxid: string
    nickname: string
    status: string
    error_msg: string
  }>
}

interface GreetingGroup {
  id: string
  name: string
  greetings: Array<{
    type: 'text' | 'file'
    content: string
    filePath?: string
  }>
}
// 添加朋友圈日志的类型定义
interface MomentLog {
  id: string;
  timestamp: string;
  account_id?: string; // 微信账号
  type: string[];
  publisher: string;
  content: string;
  publish_time?: string;
  comment_content: string;
}

// 添加好友配置接口
export interface FriendConfig {
  maxFriendsPerDay: number
  checkInterval: number
  maxProcessPerTime: number
  greetingGroupId: string
  targetGroup:string
  tag: string
  enabled: boolean
  multiCycleEnabled: boolean
  selectedAccounts: string[]
}
// 添加好友日志接口
interface FriendLog {
  task_id: string
  time: string
  account_id?: string
  processed_count: number
  tag?: string
  greetingGroupId?: string
  targetGroup?: string
  processed_users?: string[]
  status: string
  error?: string
}
// 使用SVG加载器
// 添加好友配置响应式对象
const friendConfig = ref<FriendConfig>({
  maxFriendsPerDay: 100,
  checkInterval: 10,
  maxProcessPerTime: 5,
  tag: '',
  targetGroup:'',
  greetingGroupId: '',
  enabled: false,
  multiCycleEnabled: false,
  selectedAccounts: []
})
const showImportDialog = () => {
  if (!requireFunction('addNewFriend')) return
  importDialogVisible.value = true
}
// 添加授权弹窗相关状态
const authDialogVisible = ref(false)
const authUrl = ref('')
const hasClickedAuth = ref(false)
// 添加打开授权链接的方法
const openAuthUrl = () => {
  if (authUrl.value) {
    window.open(authUrl.value, '_blank')
    hasClickedAuth.value = true
  }
}
// 添加执行时间显示的计算属性
const friendRequestExecutionTime = computed(() => {
  if (!restTimeSettings.value.selectedTasks.includes('自动通过好友')) {
    return null // 没有配置时隐藏提示
  }
  return formatExecutionTime(restTimeSettings.value.startTime, restTimeSettings.value.endTime)
})

const addFriendExecutionTime = computed(() => {
  if (!restTimeSettings.value.selectedTasks.includes('自动加好友')) {
    return null // 没有配置时隐藏提示
  }
  return formatExecutionTime(restTimeSettings.value.startTime, restTimeSettings.value.endTime)
})

// 添加时间格式化函数
const formatExecutionTime = (startTime: number, endTime: number) => {
  const formatInterval = (interval: number) => {
    const hour = Math.floor(interval / 4)
    const minute = (interval % 4) * 15
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
  
  const startTimeStr = formatInterval(startTime)
  const endTimeStr = formatInterval(endTime)
  
  if (startTime <= endTime) {
    return `${startTimeStr}-${endTimeStr}为休息时间，暂停执行任务，可前往配置页修改`
  } else {
    return `${startTimeStr}-次日${endTimeStr}为休息时间，暂停执行任务，可前往配置页修改`
  }
}

// 添加加载休息时间配置的函数
const loadRestTimeSettings = async () => {
  try {
    const result = await getConfig('rest_time_settings')
    if (result.success && result.data?.rest_time_settings) {
      restTimeSettings.value = {
        startTime: result.data.rest_time_settings.startTime || 0,
        endTime: result.data.rest_time_settings.endTime || 28,
        selectedTasks: result.data.rest_time_settings.selectedTasks || []
      }
    }
  } catch (error) {
    console.error('加载休息时间配置失败:', error)
  }
}
// 添加智能体导入处理方法
const handleImportByAgent = async (agentId: string) => {
  if (!requireFunction('addNewFriend')) return
  try {
    ElMessage.info('正在通过智能体导入名单...')
    const result = await importFriendListByAgent(agentId)
    
    // 检查是否需要授权
    if (result.needsAuth && result.authUrl) {
      authUrl.value = result.authUrl
      authDialogVisible.value = true
      return
    }
    
    if (result.success) {
      ElMessage.success(`成功导入${result.count}条数据，剩余${result.remaining}条待添加`)
      remainingCount.value = result.remaining
    }
  } catch (error) {
    ElMessage.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
const showFriendList = () => {
  friendListVisible.value = true
}
const saveAddFriendConfig = () => {
  try {
    // 自动加好友开关属于当前 Control 进程的运行态。后端不会在重启后
    // 恢复该调度任务，因此本地缓存也只能保存表单参数，不能保存开启态。
    localStorage.setItem('addFriendConfig', JSON.stringify({
      ...addFriendConfig.value,
      enabled: false
    }))
    saveSopCache('addFriendConfig')
  } catch (error) {
    console.error('保存添加好友配置失败:', error)
  }
}
// 添加加载群聊列表的方法
const loadGroupList = async () => {
  if (groupList.value.length === 0) {
    try {
      groupList.value = await getGroups()
    } catch (error) {
      console.error('获取群聊列表失败:', error)
      ElMessage.error('获取群聊列表失败')
    }
  }
}
const activeInstances = ref<Instance[]>([])
const loadActiveInstancesForAddFriend = async () => {
  try {
    const result = await getActiveInstances()
    if (result.success) {
      activeInstances.value = result.instances || []
      if (addFriendConfig.value.multiCycleEnabled && addFriendConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
        addFriendConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
      }
    }
  } catch (e) {
    console.error('获取活跃实例失败:', e)
  }
}
const onMultiCycleToggle = async (val: any) => {
  if (addFriendConfig.value.enabled) {
    return
  }
  if (Boolean(val)) {
    await loadActiveInstancesForAddFriend()
    if (addFriendConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
      addFriendConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
    }
  }
  saveAddFriendConfig()
}

const onFriendMultiCycleToggle = async (val: any) => {
  if (friendConfig.value.enabled) {
    return
  }
  if (Boolean(val)) {
    await loadActiveInstancesForAddFriend() // we can reuse this since it just calls getActiveInstances()
    if (friendConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
      friendConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
    }
  }
  localStorage.setItem('friendConfig', JSON.stringify(friendConfig.value))
  saveSopCache('friendConfig')
}

const loadActiveInstancesForComment = async () => {
  try {
    const result = await getActiveInstances()
    if (result.success) {
      activeInstances.value = result.instances || []
      if (commentConfig.value.multiCycleEnabled && commentConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
        commentConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
      }
    }
  } catch (e) {
    console.error('获取活跃实例失败:', e)
  }
}

const onCommentMultiCycleToggle = async (val: any) => {
  if (commentConfig.value.enabled) {
    return
  }
  if (Boolean(val)) {
    await loadActiveInstancesForComment()
    if (commentConfig.value.selectedAccounts.length === 0 && activeInstances.value.length > 0) {
      commentConfig.value.selectedAccounts = [activeInstances.value[0].account_id]
    }
  }
  saveCommentConfig()
}
const handleAddFriendSwitchChange = async (val: string | number | boolean) => {
  if (!requireFunction('addNewFriend')) {
    addFriendConfig.value.enabled = false
    return
  }
  const value = Boolean(val)  // 将输入值转换为布尔值
  try {
    const result = await toggleAutoAddNewFriend(value, addFriendConfig.value)
    if (result.success) {
      ElMessage.success(value ? '已开启自动加好友' : '已关闭自动加好友')
    } else {
      addFriendConfig.value.enabled = !value
      ElMessage.error(result.error || '操作失败')
    }
    saveAddFriendConfig()//保存开关的状态
  } catch (error) {
    addFriendConfig.value.enabled = !value
    ElMessage.error('操作失败')
    saveAddFriendConfig()
  }
}
const handleImportFriendList = async (fileData: any) => {
  if (!requireFunction('addNewFriend')) return
  try {
    const result = await importFriendList(fileData)
    if (result.success) {
      ElMessage.success('导入成功')
      await loadRemainingCount()
    } else {
      ElMessage.error('导入失败')
    }
  } catch (error) {
    ElMessage.error('导入失败')
    console.error("导入名单失败",error)
  }
}
const handleSwitchChange = async (value: boolean) => {
  if (!requireFunction('comment')) {
    commentConfig.value.enabled = false
    return
  }
  try {
    await toggleAutoComment(value, value ? commentConfig.value : {})
    saveCommentConfig()
    ElMessage.success(`自动评论已${value ? '开启' : '关闭'}`)
  } catch (error) {
    ElMessage.error(`${value ? '开启' : '关闭'}自动评论失败`)
    commentConfig.value.enabled = !value
    saveCommentConfig()
  }
}

// 验证标签格式
const validateTag = (value: string) => {
  const regex = /^[a-zA-Z0-9\u4e00-\u9fa5]+$/
  if (value && !regex.test(value)) {
    friendConfig.value.tag = value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
    ElMessage.warning('标签只能包含中文、英文和数字')
  }
}
const userTags = ref<Tag[]>([])
const tagDialogVisible = ref(false)
const tempSelectedTags = ref<string[]>([])
// 打开标签选择弹窗
const openTagDialog = async () => {
  if (!requireFunction('comment')) return
  try {
    userTags.value = await getContactTags()
    tempSelectedTags.value = [...commentConfig.value.selectedTags]
    tagDialogVisible.value = true
  } catch (error) {
    console.error('获取标签列表失败:', error)
    ElMessage.error('获取标签列表失败')
  }
}
// 重置标签选择
const resetTagSelection = () => {
  tempSelectedTags.value = []
  commentConfig.value.selectedTags = []
  commentConfig.value.selectedTagNames = []
  saveCommentConfig()
  ElMessage.success('标签已重置')
}
// 确认标签选择
const confirmTagSelection = () => {
  commentConfig.value.selectedTags = [...tempSelectedTags.value]
  commentConfig.value.selectedTagNames = tempSelectedTags.value.map(tagId => {
    const tag = userTags.value.find(t => t.id === tagId)
    return tag ? tag.name : tagId
  })
  tagDialogVisible.value = false
  saveCommentConfig()
}

// 取消标签选择
const cancelTagSelection = () => {
  tempSelectedTags.value = [...commentConfig.value.selectedTags]
  tagDialogVisible.value = false
}
// 添加加载用户标签方法
const loadUserTags = async () => {
  try {
    userTags.value = await getContactTags()
  } catch (error) {
    console.error('加载用户标签失败:', error)
    ElMessage.error('加载用户标签失败')
  }
}
// 添加状态文案转换方法
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '等待执行',
    'running': '执行中',
    'completed': '已完成',
    'failed': '执行失败',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}
// 添加状态类型转换方法
const getStatusType = (status: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
    'pending': 'info',
    'running': 'warning',
    'completed': 'success',
    'failed': 'danger',
    'cancelled': 'info'
  }
  return statusMap[status] || 'info'
}

// 格式化定时执行时间
const formatScheduleTime = (time: string) => {
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '时间格式错误'
  }
}
const friendLogs = ref<FriendLog[]>([])
// 加载好友请求日志
const loadFriendLogs = async () => {
  try {
    const logs = await getFriendRequestLogs()
    friendLogs.value = logs
    console.debug('好友请求日志:', logs)
  } catch (error) {
    console.error('加载好友请求日志失败:', error)
    ElMessage.error('加载好友请求日志失败')
  }
}
// 修改 filteredLogs computed 属性
const filteredLogs = computed<any[]>(() => {
  if (currentFunction.value === 'addFriend') {
    return friendLogs.value.map(log => ({
      id: log.task_id,
      timestamp: log.time,
      processed_count: log.processed_count,
      tag: log.tag,
      status: log.status || 'completed',
      type: 'friend_request',
      error: log.error,
      progress: log.processed_count,
      total: undefined,
      params: {
        content: `通过了 ${log.processed_count} 个好友申请`,
        scheduleTime: undefined,
        progress: log.processed_count,
        total: undefined,
        greetingGroupId: undefined
      } as LogParams
    }))
  } else if (currentFunction.value === 'comment') {
    return momentLogs.value.map((log: MomentLog) => ({
      id: log.timestamp,
      timestamp: new Date(log.timestamp).getTime(),
      taskType: 'comment',
      status: 'completed',
      publisher: log.publisher,
      content: log.content,
      comment_content: log.comment_content,
      description: `${log.publisher} 的朋友圈`,
      progress: undefined,
      total: undefined,
      params: {
        content: log.content,
        scheduleTime: undefined,
        progress: undefined,
        total: undefined,
        greetingGroupId: undefined
      } as LogParams,
      error: null
    }))
  } else if (currentFunction.value === 'activate') {
    console.debug("群发日志信息。。。",taskLogs.value)
    return taskLogs.value.map(log => ({
      ...log,
      progress: log.params?.progress,
      total: log.params?.total,
      params: {
        content: log.params?.content || '',
        scheduleTime: log.params?.scheduleTime,
        contentType: log.params?.contentType,
        progress: log.params?.progress,
        total: log.params?.total,
        greetingGroupId: log.params?.greetingGroupId,
        agentId: log.params?.agentId
      } as LogParams
    }))
  } else if (currentFunction.value === 'chatAnalysis') {
    console.debug("聊天采集日志信息。。。", taskLogs.value)
    return taskLogs.value.map(log => ({
      ...log,
      params: {
        total: log.params?.total || 0,
        progress: log.params?.progress || 0
      } as LogParams
    }))
  }
  return taskLogs.value
})
// 添加朋友圈日志状态
const momentLogs = ref<MomentLog[]>([])
// 添加加载朋友圈日志的方法
const loadMomentLogs = async () => {
  try {
    const logs = await getMomentLogs()
    // console.debug('加载朋友圈日志:', logs)
    // 确保每条日志都有ID，如果没有则使用时间戳
    momentLogs.value = (logs || []).map((log: any) => ({
      ...log,
      id: log.id || log.timestamp
    }))
  } catch (error) {
    console.error('加载朋友圈日志失败:', error)
  }
}
const cozeAgents = ref<CozeAgent[]>([])
const currentFunction = ref('comment')
const isRunning = ref(false)
// const activateTasks = ref<ActivateTask[]>([])
// const userTags = ref<UserTag[]>([])
const greetingGroups = ref<GreetingGroup[]>([])
const taskLogs = ref<LogItem[]>([])

// 加载任务日志
const loadTaskLogs = async () => {
  try {
    const response = await getTaskLogs()
    taskLogs.value = response;
  } catch (error) {
    console.error('加载任务日志失败:', error)
    taskLogs.value = []
  }
}

interface LogItem {
  id: string
  timestamp: string | number
  taskType: string
  description: string
  status: string
  progress?: number
  total?: number
  error?: string | null
  publisher?: string
  content?: string
  comment_content?: string
  account_id?: string
  params?: {
    content?: string
    scheduleTime?: string
    progress?: number
    total?: number
    greetingGroupId?: string
    contentType?: string
    agentId?: string
  }
}

// 添加话术组加载方法
const loadGreetingGroups = async () => {
  try {
    const result = await getConfig('greeting_config')
    if (result?.data?.greeting_config?.greeting_config) {
      const config = result.data.greeting_config.greeting_config
      greetingGroups.value = config.map((group: any) => ({
        id: group.name,
        name: group.name,
        greetings: Array.isArray(group.greetings) ? group.greetings : [] // 确保 greetings 属性存在
      }))
    }
  } catch (error) {
    console.error('加载话术组失败:', error)
    ElMessage.error('加载话术组失败')
  }
}

// 处理自动加好友开关变化
const handleFriendSwitchChange = async (val: string | number | boolean) => {
  if (!requireFunction('addFriend')) {
    friendConfig.value.enabled = false
    return
  }
  const originalValue = friendConfig.value.enabled  // 保存原始状态
  const value = Boolean(val)
  
  try {
    const result = await toggleAutoAddFriend(value, friendConfig.value)
    if (result.success) {
      ElMessage.success(value ? '已开启自动通过好友，3秒后会开始执行任务' : '已关闭自动通过好友')
      friendConfig.value.enabled = value  // 更新状态
      localStorage.setItem('friendConfig', JSON.stringify(friendConfig.value))
      saveSopCache('friendConfig')
    } else {
      // 如果后端返回失败，恢复原始状态
      friendConfig.value.enabled = originalValue
      friendConfig.value = { ...friendConfig.value }
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    // 发生错误时恢复原始状态
    friendConfig.value.enabled = originalValue
    friendConfig.value = { ...friendConfig.value }
    console.error('切换自动通过好友失败:', error)
    ElMessage.error('操作失败')
  }
}
// 日志区显隐：基于「真实内容区宽度」而非整窗宽度，用 ResizeObserver 观测，
// 任何尺寸/布局变化（窗口拖拽、侧栏变化、缩放）都会触发，避免出现状态卡死、拖拽无效的情况。
const LOG_MIN_WIDTH = 570 // 内容区(content-wrapper)宽度低于此值时自动隐藏日志，防止与左侧列表挤压/重叠
const isLogVisible = ref(true)
const contentWrapperRef = ref<HTMLElement | null>(null)
let logResizeObserver: ResizeObserver | null = null
const updateLogVisibility = () => {
  const el = contentWrapperRef.value
  const width = el ? el.clientWidth : window.innerWidth
  isLogVisible.value = width >= LOG_MIN_WIDTH
}
onMounted(async () => {
  //注册广播监听
  await loadCozeAgents()
  // await loadTaskLogs()
  if (isFunctionEnabled('comment')) await loadMomentLogs()
  if (isFunctionEnabled('comment')) await loadUserTags()
  await loadGreetingGroups()
  if (isFunctionEnabled('comment')) await loadCommentConfig()


  if (isFunctionEnabled('addFriend')) await loadFriendConfig()
  if (isFunctionEnabled('addNewFriend')) await loadAddNewFriendConfig()
  await loadRestTimeSettings()
  updateLogVisibility()
  if (typeof ResizeObserver !== 'undefined' && contentWrapperRef.value) {
    logResizeObserver = new ResizeObserver(() => updateLogVisibility())
    logResizeObserver.observe(contentWrapperRef.value)
  } else {
    // 兜底：环境不支持 ResizeObserver 时退回 window resize
    window.addEventListener('resize', updateLogVisibility)
  }
  if (isFunctionEnabled('addNewFriend')) await loadActiveInstancesForAddFriend()
  if (Object.values(AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID).some(isActionEnabled)) {
    await loadActiveInstances()
  }

  if (!isFunctionEnabled(currentFunction.value)) {
    const firstAvailable = Object.keys(AUTO_SOP_FUNCTION_ACTION_KEY_BY_ID).find(isFunctionEnabled)
    if (firstAvailable) switchFunction(firstAvailable)
  }
})

onUnmounted(() => {
  if (logResizeObserver) {
    logResizeObserver.disconnect()
    logResizeObserver = null
  }
  window.removeEventListener('resize', updateLogVisibility)
})

const loadActiveInstances = async () => {
  try {
    const result = await getActiveInstances()
    if (result.success) {
      activeInstances.value = result.instances || []
    }
  } catch (e) {
    console.error('获取活跃实例失败:', e)
  }
}

onActivated(() => {
  loadActiveInstances()
})

const currentInstanceNickname = computed(() => {
  const list = activeInstances.value || []
  const active = list.find(i => i.is_active)
  return active ? active.nickname : (list[0]?.nickname || '')
})

const currentInstanceAccountId = computed(() => {
  const list = activeInstances.value || []
  const active = list.find(i => i.is_active)
  return active ? active.account_id : (list[0]?.account_id || '')
})

// 加载智能体列表
const loadCozeAgents = async () => {
  try {
    const result = await getConfig('agents')
    if (result.success && result.data) {
      const agents = Array.isArray(result.data) ? result.data : 
                    Array.isArray(result.data.agents) ? result.data.agents : []
      
      cozeAgents.value = agents.filter((agent: CozeAgent) => agent.name && agent.botId)
      
      // 新配置尚未选择智能体时，使用列表第一项作为表单初始值
      const selectedAgentExists = cozeAgents.value.some(agent => agent.botId === commentConfig.value.agentId)
      if (!selectedAgentExists && cozeAgents.value.length > 0) {
        commentConfig.value.agentId = cozeAgents.value[0].botId
      }
    }
  } catch (error) {
    console.error('加载智能体配置失败:', error)
  }
}

const loadCommentConfig = async () => {
  try {
    // 优先从本地存储读取配置
    const savedConfig = localStorage.getItem('commentConfig')
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      // 朋友圈开关是本次进程的运行态，不是配置项。Windows 端重启后
      // 不恢复该任务；这里只恢复表单参数，并始终以关闭状态进入页面。
      commentConfig.value = {
        ...commentConfig.value,
        ...parsedConfig,
        enabled: false
      }
      return
    }
    await loadSopCache()
    if (sopCache.value?.commentConfig) {
      const cachedConfig = sopCache.value.commentConfig
      // 过滤掉 selectedAccounts，避免使用缓存的账号列表
      const { selectedAccounts, ...restConfig } = cachedConfig
      commentConfig.value = { 
        ...commentConfig.value,
        ...restConfig,
        enabled: false
      }
      return
    }
    const result = await getConfig('moment_settings')
    if (result.success && result.data?.moment_settings) {
      commentConfig.value = {
        commentLimit: result.data.moment_settings.commentLimit,
        perFriendLimit: result.data.moment_settings.perFriendLimit || 2,
        autoLike: result.data.moment_settings.autoLike,
        interactionMode: result.data.moment_settings.interactionMode || 'like_and_comment',
        blacklist: result.data.moment_settings.blacklist || '',
        agentId: result.data.moment_settings.agentId || commentConfig.value.agentId,
        checkInterval:120,
        reachLastPosition: 'stop',
        enabled: false,
        multiCycleEnabled: commentConfig.value.multiCycleEnabled || false,
        selectedAccounts: Array.isArray(commentConfig.value.selectedAccounts) ? commentConfig.value.selectedAccounts : [],
        selectedTags: [],//标签默认不在配置页中设置
        selectedTagNames: []
      }
    }
  } catch (error) {
    console.error('加载评论配置失败:', error)
  }
}
// 统一的SOP缓存读写
const sopCache = ref<any>(null)
const loadSopCache = async () => {
  try {
    if (!sopCache.value) {
      const res = await getConfig('sop_cache')
      if (res.success) {
        sopCache.value = res.data || {}
      }
    }
  } catch (e) {
    console.error('加载SOP缓存失败:', e)
  }
}
const saveSopCache = async (key: 'commentConfig' | 'addFriendConfig' | 'friendConfig') => {
  try {
    const res = await getConfig('sop_cache')
    const base = (res.success && res.data) ? res.data : {}
    
    // 构建需要缓存的数据，过滤掉 selectedAccounts
    let configToCache = {}
    if (key === 'commentConfig') {
      const { selectedAccounts, ...rest } = commentConfig.value
      configToCache = rest
    } else if (key === 'addFriendConfig') {
      const { selectedAccounts, ...rest } = addFriendConfig.value
      configToCache = rest
    } else if (key === 'friendConfig') {
      const { selectedAccounts, ...rest } = friendConfig.value
      configToCache = rest
    }

    const payload = {
      commentConfig: {
        ...(base.commentConfig || {}),
        ...(key === 'commentConfig' ? configToCache : {}),
        enabled: false
      },
      addFriendConfig: {
        ...(base.addFriendConfig || {}),
        ...(key === 'addFriendConfig' ? addFriendConfig.value : {}),
        enabled: false
      },
      friendConfig: {
        ...(base.friendConfig || {}),
        ...(key === 'friendConfig' ? friendConfig.value : {}),
        enabled: false
      }
    }
    await saveConfig('sop_cache', payload)
  } catch (e) {
    console.error('保存SOP缓存失败:', e)
  }
}
// 添加保存配置的方法
const saveCommentConfig = () => {
  try {
    // 不持久化任务运行态，避免客户端重启后显示为已开启，而后端实际
    // 没有对应的朋友圈调度任务。
    localStorage.setItem('commentConfig', JSON.stringify({
      ...commentConfig.value,
      enabled: false
    }))
    saveSopCache('commentConfig')
  } catch (error) {
    console.error('保存评论配置失败:', error)
  }
}

const switchFunction = (func: string) => {
  if (!requireFunction(func)) return
  console.debug('切换功能到:', func)
  currentFunction.value = func
  
  if (func === 'addFriend') {
    loadFriendLogs()
  } else if (func === 'activate') {
    loadTaskLogs()
  } else if (func === 'addNewFriend') {
    loadAddFriendLogs()
    loadRemainingCount()
    loadRiskAccounts()
  } else if (func === 'chatAnalysis') {
    loadTaskLogs()
  } else if (func === 'comment') {
    loadMomentLogs()
  } else if (func === 'sop') {
    // SOP编排的"拉群"动作需要群列表；话术组/智能体已在挂载时加载
    loadGroupList()
  }
}

// 添加加载日志的方法
const loadAddFriendLogs = async () => {
  try {
    const logs = await getAddFriendLogs()
    addFriendLogs.value = logs
  } catch (error) {
    console.error('加载添加好友日志失败:', error)
    ElMessage.error('加载日志失败')
  }
}

const loadRemainingCount = async () => {
  try {
    const result = await getRemainingFriendCount()
    if (typeof result === 'object' && result !== null) {
      remainingCount.value = result.remaining
      todayAddedCount.value = result.today_added || 0
    } else {
      // 兼容旧接口返回
      remainingCount.value = Number(result)
      todayAddedCount.value = 0
    }
  } catch (error) {
    console.error('获取剩余可添加好友数量失败:', error)
  }
}

const loadRiskAccounts = async () => {
  try {
    const result = await getFriendRequestRiskRecords()
    if (result && result.success && Array.isArray(result.data)) {
      const accounts = new Set<string>()
      result.data.forEach((item: any) => {
        if (item.risk_type === 'ADD_FRIEND_FREQUENT' && item.account_id) {
          accounts.add(item.account_id)
        }
      })
      riskAccounts.value = Array.from(accounts)
    }
  } catch (error) {
    console.error('获取风控记录失败:', error)
  }
}

const loadFriendConfig = async () => {
  try {
    const savedConfig = localStorage.getItem('friendConfig')
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig)
      friendConfig.value = {
        ...friendConfig.value,
        ...parsed
      }
      return
    }
    await loadSopCache()
    if (sopCache.value?.friendConfig) {
      const { selectedAccounts, ...rest } = sopCache.value.friendConfig
      friendConfig.value = { ...friendConfig.value, ...rest, enabled: false }
    }
  } catch (error) {
    console.error('加载好友配置失败:', error)
  }
}

const loadAddNewFriendConfig = async () => {
  try {
    const savedConfig = localStorage.getItem('addFriendConfig')
    if (savedConfig) {
      // 兼容历史上已经写入 enabled=true 的缓存：每次新进程进入页面
      // 都以关闭状态显示，和后端“不恢复自动加好友任务”的语义一致。
      addFriendConfig.value = {
        ...addFriendConfig.value,
        ...JSON.parse(savedConfig),
        enabled: false
      }
      return
    }
    await loadSopCache()
    if (sopCache.value?.addFriendConfig) {
      addFriendConfig.value = { ...addFriendConfig.value, ...sopCache.value.addFriendConfig, enabled: false }
    }
  } catch (error) {
    console.error('加载好友配置失败:', error)
  }
}

// 修改时间格式化函数，使其兼容不同的日志时间格式
const formatTimestamp = (timestamp: string | number | undefined) => {
  try {
    if (!timestamp) {
      return '时间未知'
    }

    // 彻底解决时区多加8小时的问题：
    // 后端传过来的时间是：2026-03-31T11:02:06.942Z 或 2026-03-31T11:02:06.942+08:00
    // 我们直接截取 "T" 前面的日期和 "T" 后面的时间（去掉毫秒和时区），自己手动拼接即可。
    // 这样彻底绕过 JS 的 new Date() 时区转换坑。
    
    let timeStr = String(timestamp);
    
    // 如果是 ISO 格式包含 'T'
    if (timeStr.includes('T')) {
      const parts = timeStr.split('T');
      const datePart = parts[0]; // 2026-03-31
      
      let timePart = parts[1]; // 11:02:06.942Z 或 11:02:06.942+08:00
      
      // 核心修复：先去掉末尾的 'Z'
      timePart = timePart.replace('Z', '');
      // 再去掉时区符号 +08:00 等
      timePart = timePart.split('+')[0].split('-')[0];
      // 去掉毫秒
      timePart = timePart.split('.')[0];
      
      return `${datePart} ${timePart}`;
    }

    // 兜底逻辑：如果是其他格式，用 Date 解析
    // 检查是否是纯数字的时间戳字符串
    const isNumeric = /^\d+$/.test(timeStr);
    const date = new Date(isNumeric ? Number(timeStr) : timeStr);
    if (isNaN(date.getTime())) {
      return timestamp || '时间格式错误'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('时间格式化错误:', error, 'timestamp:', timestamp)
    return timestamp || '时间格式错误'
  }
}

watch(
  () => route.query.function,
  (newValue) => {
    console.debug("AutoSOP==>watch", newValue)
    console.debug("AutoSOP类型检查:", {
      value: newValue,
      type: typeof newValue,
      isString: typeof newValue === 'string',
      isValid: ['comment', 'activate', 'addFriend', 'autofollow'].includes(newValue as string)
    })
    
    if (newValue && typeof newValue === 'string' && ['comment', 'activate', 'addFriend', 'autofollow'].includes(newValue)) {
      console.debug('AutoSOP条件判断通过，准备切换功能')
      try {
        console.debug('当前功能值:', currentFunction.value)
        // 处理autofollow到autoFollow的映射
        const targetFunction = newValue === 'autofollow' ? 'autoFollow' : newValue
        if (!requireFunction(targetFunction)) return
        currentFunction.value = targetFunction
        console.debug('AutoSOP当前功能已切换到:', currentFunction.value)
        
        if (newValue === 'addFriend') {
          console.debug('AutoSOP准备加载好友日志')
          loadFriendLogs()
        } else if (newValue === 'activate') {
          console.debug('AutoSOP准备加载任务日志')
          loadTaskLogs()
        } else if (newValue === 'autofollow') {
          console.debug('AutoSOP准备加载自动跟单任务')
          // 这里可以添加加载自动跟单任务的逻辑
        }
      } catch (error) {
        console.error('AutoSOP切换功能时发生错误:', error)
      }
    } else {
      console.debug('AutoSOP条件判断未通过，不执行切换')
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.auto-sop-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.task-list {
  margin-bottom: 8px;
  border-radius: 4px;
  padding: 0;
}

.task-item {
  padding: 6px;
  margin-left: 10px;
  margin-right: 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 14px;
  margin-right: 10px; /* 与状态标签的间距 */
}


.task-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.task-schedule{
  font-size: 14px;
}
.switch-label {
  margin-left: 8px;
  vertical-align: middle;
}

.task-tags, .task-group {
  display: flex;
  align-items: center;
  font-size: 14px;
}
.tag-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.label {
  color: #909399;
  min-width: 70px;
  font-size: 14px;
}
.group-name {
  color: #606266;
}
.el-button {
    margin-left: auto;  /* 将按钮推到右侧 */
  }

.task-progress {
  color: #409EFF;
  font-size: 14px;
}

.multi-cycle-box {
  padding: 8px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #f8f9fa;
}
.multi-cycle-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  line-height: 18px;
  padding: 6px 8px;
  background-color: #f5f7fa;
  border-left: 3px solid var(--el-color-primary);
  border-radius: 4px;
  margin-bottom: 10px;
}
.multi-cycle-lock-tip {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}
.multi-cycle-box.disabled {
  pointer-events: none;
  opacity: 0.6;
}
.instance-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  margin-right: 8px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fff;
}

.align-right-form-item .el-form-item__content {
  display: flex;
  justify-content: flex-end;
}

.task-actions {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}
.greeting-group-box {
  margin-top: 4px;
  padding: 2px 4px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
}
.greeting-label {
  color: #606266;
  font-size: 13px;
}
.new-task-form {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.day-select {
  margin-right: 12px;
  width: 100px;
}

.time-picker {
  width: 120px;
}
.function-section {
  width: 80px;
  position: relative;
  z-index: 1000;
  background-color: #f5f7fa;
  flex-shrink: 0;
  .function-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .function-item {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background-color: var(--el-bg-color);
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: var(--el-color-primary);
      transform: translateX(4px);
      
      .function-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateX(0);
        background-color: #2c3e50;
        z-index: 1000;
      }
      
      .function-icon {
        color: #fff;
      }
    }
    
    &.active {
      background-color: var(--el-color-primary);
      
      .function-icon {
        color: #fff;
      }
    }

    .function-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--el-text-color-regular);
      transition: color 0.3s ease;
      
      .el-icon {
        font-size: 24px;
      }
      .icon {
        width: 24px !important;
        height: 24px !important;
        flex-shrink: 0;
        }
      
      .check-icon, .plus-icon {
        position: absolute;
        font-size: 12px;
        right: 8px;
        bottom: 8px;
      }
    }

    .function-tooltip {
      position: absolute;
      left: calc(100% + 8px);
      top: 50%;
      transform: translateX(-10px) translateY(-50%);
      background-color: var(--el-color-primary);
      color: #eaf0f7;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 100;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      
      &::before {
        content: '';
        position: absolute;
        left: -4px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
        width: 8px;
        height: 8px;
        background-color: var(--el-color-primary);
      }
    }
  }
}
.function-section .section-title,
.config-section .section-title,
.log-section .section-title {
  height: 48px;
  line-height: 48px;
}
.config-section .section-title,
.log-section .section-title {
  margin: 0 0 16px;
}
.section-title .el-button {
  margin: 0;
}
.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  width: 100%;
}
.config-section {
  flex: 1;
  /* 关键：flex 子项默认 min-width:auto，会被内部超长内容(如很长的群名)撑大，
     导致两栏比例失衡甚至相互挤压/覆盖。置 0 后 flex:1 才能真正按比例收缩。 */
  min-width: 0;
  overflow-y: auto;
  width: 100%;
  max-width: none;
  margin: 0;
  background: #fff;
  border-radius: 8px;
}
.log-section {
  flex: 1;
  /* 同上：防止日志里超长名称把日志区撑宽、挤掉左侧列表 */
  min-width: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
  z-index: 1;
  /* 添加平滑过渡 */
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
  transform: translateX(0);
  opacity: 1;
}
:deep(.el-form-item__label) {
  text-align: left;
  justify-content: flex-start;
}

:deep(.el-form-item__content) {
  display: flex;
  justify-content: flex-end;
  margin-left: auto !important;
}
.file-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-file {
  color: #606266;
  font-size: 14px;
}

.config-content {
  width: 100%;
  padding: 10px;
  overflow-y: auto;
}
.config-group {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
:deep(.el-form) {
  width: 100%;
}

.config-group h4 {
  margin: 0 0 16px;
  color: #303133;
}

.greeting-list {
  margin-bottom: 16px;
}

.greeting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.greeting-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.separator {
  margin: 0 8px;
}

.section-title {
  height: 48px;
  line-height: 48px;
  padding: 0 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.section-title .button-group {
  display: flex;
  gap: 10px;
  align-items: center;
}
.section-title .button-group .el-button {
  margin: 0;
}
.function-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.function-item {
  position: relative;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}
.function-item:hover {
  background-color: #ecf5ff;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.function-item.active {
  background-color: #ecf5ff;
  border-right: 2px solid #409eff;
}

.function-item.disabled,
.function-item.disabled:hover {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
  background-color: transparent;
}

.function-icon {
  font-size: 24px;
  color: #606266;
  margin-bottom: 8px;
}

.function-name {
  font-size: 14px;
}

.log-content {
  flex: 1;
  overflow: hidden; /* 防止内容溢出 */
  padding: 6px;
}
.el-scrollbar {
  height: 100%; /* 让滚动条占满容器高度 */
}
.log-item {
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.task-header {
  display: flex;
  align-items: center;
}


.log-time {
  color: #909399;
  font-size: 13px;
  margin-right: 6px;
  margin-left: 8px; /* 将日期推到左侧 */
}


.log-info {
  padding: 8px;
}

.log-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
/* 朋友圈日志样式 */
.moment-log .log-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.publisher {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #409EFF;
  font-size: 14px;
  /* 防止超长不可断的发布者名称在面板内横向溢出 */
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
/* 添加功能图标样式 */
.function-icon img.icon {
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}
.moment-content {
  background: #f5f7fa;
  padding: 4px;
  font-size: 14px;
  border-radius: 6px;
  color: #606266;
  margin: 4px 0;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 防止超长不可断字符串横向溢出 */
  overflow-wrap: anywhere;
  word-break: break-word;
  word-break: break-word;
}

.comment-info {
  margin-top: 4px;
  
  .action-items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .like-action {
    color: #ff4949;
    display: inline-flex;
    align-items: center;
    font-size: 14px;
  }

  .comment-action {
    display: inline-flex;
    align-items: center;
    margin-top: 4px;
    gap: 4px;
    
    .comment-text {
      word-break: break-word;
      font-size: 14px;
    }
  }
}
.comment-action,
:deep(.el-form-item:last-child .el-form-item__content) {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 20px;
}
.log-type.like {
  background: #e1f3d8;
  color: #67c23a;
}

.log-type.comment {
  background: #fdf6ec;
  color: #e6a23c;
}

.log-type.info {
  background: #ecf5ff;
  color: #409eff;
}

.log-type.error {
  background: #fef0f0;
  color: #f56c6c;
}

.log-message {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}
.auth-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.auth-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.action-bar {
  padding: 20px;
  border-top: 1px solid #eee;
  text-align: center;
}
.comment-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 20px 0;
  background-color: #f4f4f5;
  border-radius: 4px;
  color: #909399;
  font-size: 14px;
}
.plus-icon {
  position: absolute;
  right: -4px;
  bottom: -4px;
  font-size: 12px;
}
.comment-tip .el-icon {
  font-size: 16px;
  color: #909399;
}
.task-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
/* 自定义 el-scrollbar 样式 */
:deep(.el-scrollbar__bar) {
  opacity: 0;
  transition: opacity 0.3s;
}
.config-section {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.config-section::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
/* 鼠标悬停时显示滚动条 */
.config-section:hover :deep(.el-scrollbar__bar) {
  opacity: 1;
}
:deep(.el-scrollbar__wrap::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}
:deep(.el-scrollbar__wrap) {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px; /* 设置行间距为4px */
}
.task-row {
  padding-left: 10px; /* 统一左边距 */
  width: 100%;
  box-sizing: border-box;
}
.task-tag {
  display: flex;
  gap: 8px;
}
.create-task-btn {
  margin-right: 8px;  /* 右侧留出间距 */
}
.task-log {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 6px;
}
/* 任务日志样式 */
.task-log .log-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}


.task-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f56c6c;
  margin-top: 8px;
}

.el-icon {
  vertical-align: middle;
}
.greeting-text {
  color: #606266;
  font-size: 13px;
  margin-top: 4px;
  display: block;
}

.friend-info {
  font-weight: 500;
  font-size: 13px;
  color: #303133;
}
.friend-log {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
}
.friend-count {
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}
.friend-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
  font-size: 13px;
}
.config-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  background-color: #f4f4f5;
  border-radius: 4px;
  color: #909399;
  font-size: 14px;
}

.config-tip .el-icon {
  color: #909399;
  font-size: 16px;
}
.friend-tag-input :deep(.el-input) {
  margin-right: 10px;
}
.comment-action {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
:deep(.el-input), 
:deep(.el-input-number),
:deep(.el-select) {
  width: 100%;
  max-width: 300px;
}
.remaining-count {
  text-align: center;
  font-weight: bold;
  padding: 15px 0;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 10px;
}
:deep(.last-form-item .el-form-item__content) {
  margin: 0 !important;
  padding-right: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.check-icon {
  position: absolute;
  right: -2px;
  bottom: -2px;
  font-size: 12px;
  color: var(--el-color-success);
}
.log-section.hidden {
  transform: translateX(100%);
  opacity: 0;
  /* 添加指针事件禁用，避免隐藏时仍可交互 */
  pointer-events: none;
  /* 彻底塌缩：不再占据 flex 空间，左侧列表占满；物理上不可能盖住列表 */
  flex: 0 0 0 !important;
  width: 0 !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden;
  box-shadow: none;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

/* 新增目标明细列表样式 */
.friend-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.greeting-text {
  color: #606266;
  font-size: 13px;
}

.target-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.target-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f4f4f5;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.target-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0; /* 允许子元素截断 */
  margin-right: 12px;
}

.target-name {
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.target-wxid {
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.target-right {
  flex-shrink: 0;
  white-space: nowrap;
}

.status-success {
  color: #409EFF; /* 淡蓝色 */
}

.status-failed {
  color: #F56C6C; /* 淡红色 */
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}
/* 标签选择弹窗样式优化 */
.tag-selection-dialog :deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.tag-selection-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #e4e7ed;
  padding: 20px 24px;
}

.tag-selection-dialog :deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 16px;
}

.tag-selection-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  font-size: 18px;
}

.tag-selection-dialog :deep(.el-dialog__body) {
  padding: 24px;
  background: #fafbfc;
}

.tag-selection-content {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.tag-selection-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.tag-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-checkbox-item {
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 0;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.tag-checkbox-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
}

.tag-checkbox-item :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #667eea;
  border-color: #667eea;
}

.tag-checkbox-item :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #667eea;
  font-weight: 500;
}

.tag-name {
  font-weight: 500;
  color: #2c3e50;
}

.tag-count {
  color: #7f8c8d;
  font-size: 14px;
  margin-left: 4px;
}

.dialog-footer-custom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0 0;
  border-top: 1px solid #e1e8ed;
  margin-top: 16px;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
}




/*
 * 注意：此前这里用 @media(max-width:650px) 把 .log-section 改成 position:fixed 浮层，
 * 当 JS 的 isLogVisible 与媒体查询断点出现错位时，浮层会盖死左侧任务列表且拖拽无法恢复。
 * 现在显隐完全由 ResizeObserver + .hidden(塌缩) 控制，日志区始终在正常文档流内，
 * 不再使用 fixed 浮层，从根本上杜绝"盖住列表"的问题，故移除该媒体查询覆盖。
 */
</style>
