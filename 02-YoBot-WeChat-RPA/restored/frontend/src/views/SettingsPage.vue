<template>
  <div class="settings-page-container">
    <!-- 左侧导航 -->
    <div class="settings-nav" v-show="!isNarrowScreen">
      <div class="nav-title">
        <el-icon><Setting /></el-icon>
        配置导航
      </div>
      <div class="nav-items">
        <div 
          v-for="item in navItems" 
          :key="item.id"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
          @click="scrollToSection(item.id)">
          {{ item.name }}
        </div>
      </div>
      <div v-if="!isMacStrictRuntime" class="settings-backup-nav-entry">
        <SettingsBackup :after-import="handleSettingsImported" />
      </div>
    </div>
    <div class="settings-content" ref="contentRef" :class="{ 'full-width': isNarrowScreen }">
      <div v-if="isNarrowScreen && !isMacStrictRuntime" class="settings-backup-mobile-entry">
        <SettingsBackup compact :after-import="handleSettingsImported" />
      </div>
      <!-- AI接入设置卡片 -->
      <el-card
        id="ai-settings"
        class="setting-card collapsible-setting-card"
        :class="{ 'is-collapsed': !aiSettingsExpanded }"
      >
        <template #header>
          <button
            type="button"
            class="card-header collapsible-card-header"
            :aria-expanded="aiSettingsExpanded"
            @click="aiSettingsExpanded = !aiSettingsExpanded"
          >
            <span>AI接入配置</span>
            <el-icon
              class="collapse-icon"
              :class="{ expanded: aiSettingsExpanded }"
            >
              <ArrowDown />
            </el-icon>
          </button>
        </template>
        
        <!-- Coze设置 -->
        <div class="setting-section">
          <h4 class="platform-title">
            <span class="platform-title-content" title="点击跳转coze" @click="openExternalLink('https://code.coze.cn/playground')">
              <img :src="getPlatformIconPath('coze')" alt="Coze" class="platform-icon" />
              Coze平台
            </span>
            <!-- <el-button 
              v-if="cozeSettings.token"
              type="primary" 
              size="small" 
              plain
              class="benefit-btn"
              @click="showBenefitDialog"
            >
              查看积分权益
            </el-button> -->
            <el-button
              v-if="!isMacStrictRuntime"
              type="info" 
              size="small" 
              plain
              class="clear-cache-btn"
              @click="showClearCacheDialog"
            >
              清除会话缓存
            </el-button>
          </h4>
          <el-form :model="cozeSettings" label-width="120px">
            <el-form-item label="Coze Token">
              <el-input 
                v-model="cozeSettings.token" 
                type="password" 
                show-password 
                @keydown.enter.prevent
                :placeholder="cozeSettings.hasToken ? '已配置，输入新 Token 可替换' : '请输入Coze Token'"
                @input="autoSaveCozeSettings"
              />
              <!-- <div v-if="cozeSettings.token && cozeSettings.tokenLastUpdated" class="token-reminder">
                token已绑定 {{ daysTokenBound }} 天，如非永久期限，记得到期及时更换
              </div> -->
            </el-form-item>
          </el-form>
        </div>

        <!-- Fireflow设置 -->
        <!-- <div v-if="brandConfig.enableFireflow" class="setting-section">
          <h4 class="platform-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span class="platform-title-content" title="点击跳转fireflow" @click="openExternalLink('https://fireflow.yokoagi.com')">
              <img src="/icon/fireflow.png" alt="Fireflow" class="platform-icon" />
              FireFlow
            </span>
            <el-button 
              type="primary" 
              link 
              style="color: #999; font-weight: normal; font-size: 13px;" 
              @click.stop="openExternalLink('https://n2b8xxdgjx.feishu.cn/wiki/Snn4w5bdKibFUzkWqh0c3Whbnkh')"
            >
              FireFlow是什么？
            </el-button>
          </h4>
          <el-form label-width="120px">
            <el-form-item label="服务器地址">
              <el-input 
                value="https://fireflow.yokoagi.com/" 
                readonly
                disabled
              />
            </el-form-item>
          </el-form>
        </div> -->

        <div v-if="!isMacStrictRuntime" class="more-platforms-btn-container" style="text-align: center; margin: 10px 0;">
          <el-button type="primary" link @click="showMorePlatforms = !showMorePlatforms">
            {{ showMorePlatforms ? '收起更多平台' : '更多平台' }}
            <el-icon class="el-icon--right">
              <ArrowUp v-if="showMorePlatforms" />
              <ArrowDown v-else />
            </el-icon>
          </el-button>
        </div>

        <!-- Dify设置 -->
        <el-collapse-transition v-if="!isMacStrictRuntime">
          <div v-show="showMorePlatforms" class="setting-section">
            <h4 class="platform-title">
              <img src="/icon/dify.png" alt="Dify" class="platform-icon" />
              Dify平台
            </h4>
            <el-form :model="difySettings" label-width="120px">
              <el-form-item label="服务器地址">
                <el-input 
                  v-model="difySettings.baseUrl" 
                  placeholder="如果是本地则默认可填入：http://localhost/v1"
                  @input="autoSaveDifySettings"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-collapse-transition>
      </el-card>

      <!-- AI 语音配置（豆包声音复刻 + TTS） -->
      <el-card v-if="isSettingsSectionAvailable('voice-settings')" class="setting-card" id="voice-settings">
        <template #header>
          <div class="card-header">
            <span>AI 语音平台配置</span>
          </div>
        </template>
        <VoiceConfig />
      </el-card>

      <!-- 我的音色（声音复刻库 + 试听） -->
      <el-card v-if="isSettingsSectionAvailable('voice-library')" class="setting-card" id="voice-library">
        <template #header>
          <div class="card-header">
            <span>我的音色</span>
          </div>
        </template>
        <VoiceLibrary />
      </el-card>

      <!-- 新增：智能体配置卡片 -->
    <el-card class="setting-card" id="agent-settings">
      <template #header>
        <div class="card-header">
          <span>智能体管理</span>
          <el-button
            v-if="!isMacStrictRuntime"
            type="primary"
            size="small"
            :icon="Connection"
            :loading="testing"
            @click="showTestAgentDialog"
          >
            测试
          </el-button>
        </div>
      </template>

      <!-- 智能体列表 -->
      <div class="agents-list">
        <template v-if="cozeAgents.length">
          <div v-for="agent in cozeAgents" :key="agent.botId" class="agent-item">
            <div class="agent-info">
              <!-- 添加平台图标 -->
              <img 
                :src="getPlatformIconPath(agent.platform)" 
                :alt="agent.platform || 'coze'" 
                class="platform-icon" 
              />
              <div class="agent-details">
                <span class="agent-name">{{ agent.name }}</span>
                <span class="agent-botid">{{ getPlatformIdLabel(agent.platform) }}: {{ formatId(agent.botId) }}</span>
                <span v-if="(agent.platform === 'coze3' || agent.platform === 'agentic') && agent.apiUrl" class="agent-botid">
                  API: {{ agent.apiUrl }}
                </span>
              </div>
            </div>
            <div class="agent-actions">
              <el-button
                type="primary"
                link
                :icon="Edit"
                @click="editAgent(agent)"
              >
                修改
              </el-button>
              <el-button 
                type="danger" 
                link 
                @click="deleteAgent(agent)"
              >
              <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无配置的智能体" />
      </div>

      <!-- 添加智能体按钮 -->
      <div class="actions">
        <el-button 
          type="primary" 
          :icon="Plus"
          @click="showAgentConfig"
        >
          添加智能体
        </el-button>
      </div>
    </el-card>
    <el-card v-if="isSettingsSectionAvailable('moment-settings')" class="setting-card" id="moment-settings">
      <template #header>
        <div class="card-header">
          <span>朋友圈黑名单</span>
        </div>
      </template>
  
      <div class="setting-section">
        <el-form :model="momentSettings" label-width="120px">
          <!-- <el-form-item label="总评论条数限制">
            <el-input-number 
              v-model="momentSettings.commentLimit" 
              :min="1" 
              :max="1000" 
              placeholder="每次评论条数上限"
              @keydown.enter.prevent
            />
          </el-form-item>
          <el-form-item label="单好友评论次数">
            <el-input-number 
              v-model="momentSettings.perFriendLimit" 
              :min="1" 
              :max="10" 
              :default-value="2"
              placeholder="单个好友评论次数上限"
              @keydown.enter.prevent
            />
          </el-form-item>
          <el-form-item label="互动模式">
            <el-select v-model="momentSettings.interactionMode" placeholder="请选择点评模式">
              <el-option label="仅点赞" value="like_only" />
              <el-option label="仅评论" value="comment_only" />
              <el-option label="点赞&评论" value="like_and_comment" />
            </el-select>
          </el-form-item>
          <el-form-item label="选择智能体">
            <el-select 
              v-model="momentSettings.agentId" 
              placeholder="请选择智能体"
            >
              <el-option
                v-for="agent in cozeAgents"
                :key="agent.botId"
                :label="agent.name"
                :value="agent.botId"
              />
            </el-select>
          </el-form-item> -->
            <div class="custom-info-box" style="margin-top: 0; margin-bottom: 15px;">
              <div class="info-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="info-content">
                <div class="info-text">黑名单用户跳过点赞&评论</div>
              </div>
            </div>
            <el-input 
              v-model="momentSettings.blacklist" 
              type="textarea" 
              :rows="4"
              placeholder="黑名单用户默认不评论和点赞，多个黑名单中间用、隔开"
              @change="saveMomentSettings"
            />
        </el-form>
        <!-- <div class="actions">
          <el-button type="primary" :icon="Select" @click="saveMomentSettings">保存设置</el-button>
        </div> -->
      </div>
    </el-card>

      <!-- 智能体配置弹窗 -->
      <coze-agent-config
        v-model:visible="agentConfigVisible"
        v-model:agents="cozeAgents"
        :editing-agent="editingAgent"
        :allowed-platforms="isMacStrictRuntime ? ['coze', 'fireflow', 'agentic'] : undefined"
      />
          <!-- 打招呼话术配置卡片 -->
      <el-card v-if="isSettingsSectionAvailable('greeting-settings')" class="setting-card" id="greeting-settings">
        <template #header>
          <div class="card-header">
            <span>话术组配置（可配合智能体）</span>
          </div>
        </template>
        <greeting-config
          :allowed-types="allowedGreetingTypes"
        />
      </el-card>

      <!-- 聊天记录配置卡片 -->
      <el-card class="setting-card" id="chat-history-settings">
        <template #header>
          <div class="card-header">
            <span>AI回复配置</span>
          </div>
          <div class="tip-text">聊天记录自动保存本地data文件夹</div>
        </template>
        <div class="setting-section">
          <el-form :model="chatHistorySettings" label-width="0px">
              <!-- 消息合并回复配置 -->
            <el-form-item class="chat-history-form-item">
              <span class="form-item-label">消息合并回复</span>
              <div class="form-item-content">
                <el-select
                  v-model="chatHistorySettings.messageMerge.mode"
                  @change="saveChatHistorySettings"
                  class="merge-mode-select"
                >
                  <el-option label="不合并" value="none" />
                  <!-- <el-option label="上下文方式" value="context" /> -->
                  <el-option label="消息合并" value="concat" />
                </el-select>
                <el-tooltip
                  content="一个监听周期内，好友连续发消息可合并回复"
                  placement="left">
                  <el-icon class="help-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
            </el-form-item>
            
            <!-- 消息监听间隔配置 -->
            <el-form-item class="chat-history-form-item">
              <span class="form-item-label">消息监听间隔(秒)</span>
              <div class="form-item-content">
                <el-input-number
                  v-model="chatHistorySettings.messageMerge.interval"
                  :min="4"
                  :max="120"
                  :step="1"
                  @change="saveChatHistorySettings"
                  class="interval-input"
                  @keydown.enter.prevent
                />
                <el-tooltip
                  content="读取会话列表的频率，默认5秒"
                  placement="left">
                  <el-icon class="help-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
            </el-form-item>
            <!-- AI 上下文已改为单聊默认携带，不再提供前端开关。
            <el-form-item class="chat-history-form-item">
              <span class="form-item-label">AI智能体上下文</span>
              <el-switch
                v-model="chatHistorySettings.includeContext"
                active-text="开启"
                inactive-text="关闭"
                @change="saveChatHistorySettings"
              />
            </el-form-item>
            -->
            <!-- 添加解析上下文条数配置 无需配置默认携带整个窗口 -->
            <!-- <el-form-item class="chat-history-form-item" v-if="chatHistorySettings.includeContext">
              <span class="form-item-label">携带上下文条数</span>
              <div class="form-item-content">
                <el-input-number
                  v-model="chatHistorySettings.contextCount"
                  :min="3"
                  :max="15"
                  :step="1"
                  @change="saveChatHistorySettings"
                  class="context-count-input"
                  @keydown.enter.prevent
                />
                <el-tooltip
                  content="上下文可提升AI回复质量，推荐3-10条"
                  placement="left">
                  <el-icon class="help-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
            </el-form-item> -->

            <el-form-item class="chat-history-form-item">
              <span class="form-item-label">自动分割</span>
              <div class="form-item-content">
                <el-select
                  v-model="chatHistorySettings.autoSplitMode"
                  class="merge-mode-select"
                  @change="saveChatHistorySettings"
                >
                  <el-option label="不分割" value="none" />
                  <el-option label="连续2个换行符" value="double_newline" />
                  <el-option label="连续3个换行符" value="triple_newline" />
                </el-select>
                <el-tooltip
                  content="AI 返回长文本时，按选定的连续换行数量拆成多条微信消息"
                  placement="left">
                  <el-icon class="help-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
            </el-form-item>

            <el-divider border-style="dashed" style="margin: 28px 0; border-color: #e4e7ed;" />

            <!-- 添加转人工配置模块 -->
            <el-form-item class="transfer-form-item">
              <div class="transfer-title">
                <span class="form-item-label">转人工配置</span>
                <el-checkbox
                  v-model="chatHistorySettings.transferConfig.notSendToCustomer"
                  @change="handleNotSendToCustomerChange"
                  style="margin-left: 20px;"
                >
                  转人工话术不发送客户
                </el-checkbox>
                <!-- <p class="transfer-description">设置AI回复中包含哪些话术时触发转人工通知</p> -->
              </div>
              <div class="transfer-content">
                <div class="config-section">
                  <div class="section-header">
                    <h3>触发词</h3>
                    <el-button 
                      type="primary" 
                      size="small"
                      :icon="Plus"
                      @click="addPhraseItem"
                      :disabled="chatHistorySettings.transferConfig.phrases.length >= 3"
                    >
                      添加
                    </el-button>
                  </div>
                  <p class="description">当AI回复命中触发词时，触发转人工通知</p>
                  <div class="form-item">
                    <div class="phrases-list">
                      <el-tag
                        v-for="(phrase, index) in chatHistorySettings.transferConfig.phrases"
                        :key="index"
                        closable
                        @close="removePhraseItem(index)"
                      >
                        {{ phrase }}
                      </el-tag>
                      <el-input
                        v-if="phraseInputVisible"
                        ref="phraseInputRef"
                        v-model="phraseInputValue"
                        class="phrase-input"
                        size="small"
                        placeholder="请输入触发词"
                        @keyup.enter="confirmPhrase"
                        @blur="confirmPhrase"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="config-section">
                  <div class="section-header">
                    <h3>接收通知的微信会话</h3>
                  </div>
                  <p class="description">转人工通知将优先发送给该好友或群聊</p>
                  <div class="form-item">
                    <el-input 
                      v-model="chatHistorySettings.transferConfig.notifyWechat" 
                      placeholder="请输入接收通知的好友或群聊名称"
                      @change="saveChatHistorySettings"
                      @keydown.enter.prevent
                    />
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
       <!-- 外部API配置卡片 -->
      <!-- <el-card class="setting-card" id="external-api-settings">
          <template #header>
            <div class="card-header">
              <span>外部API配置</span>
            </div>
          </template>
          
          <div class="setting-section">
          <div class="api-description">
            <div class="custom-info-box">
              <div class="info-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="info-content">
                <div class="info-text">定制API需要对接调试，可联系客服咨询</div>
              </div>
            </div>
          </div>
            
          <el-form :model="externalApiSettings" label-width="0" class="external-api-form">
            <el-form-item class="api-identifier-form-item">
              <div class="api-identifier-container">
                <span class="form-item-label">API标识符</span>
                <div class="api-identifier-input">
                  <el-input 
                    v-model="externalApiSettings.identifier" 
                    placeholder="请输入API标识符"
                    @input="handleIdentifierChange"
                    :formatter="formatIdentifierDisplay"
                    :parser="parseIdentifierInput"
                    maxlength="50"
                  />
                  <el-button 
                    type="primary" 
                    :icon="Connection"
                    :loading="testingConnection"
                    :disabled="!externalApiSettings.identifier || externalApiSettings.identifier.length < 4"
                    @click="testApiConnection"
                    class="test-connection-btn"
                  >
                    测试
                  </el-button>
                </div>
              </div>
            </el-form-item>
            <el-form-item v-if="connectionStatus" class="connection-status-form-item">
              <div class="connection-status-container">
                <span class="form-item-label">连接状态</span>
                <el-tag 
                  :type="connectionStatus.success ? 'success' : 'danger'"
                  :icon="connectionStatus.success ? SuccessFilled : CircleCloseFilled"
                >
                  {{ connectionStatus.message }}
                </el-tag>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card> -->
      <!-- 飞书通知设置卡片 -->
      <el-card v-if="isSettingsSectionAvailable('feishu-settings')" class="setting-card" id="feishu-settings">
        <template #header>
          <div class="card-header">
            <span>飞书通知</span>
          </div>
        </template>
        <div class="setting-section">
          <div class="api-description">
            <div class="custom-info-box">
              <div class="info-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="info-content">
                <div class="info-text">配置飞书应用与账号，开启转人工等飞书提醒</div>
              </div>
            </div>
          </div>
          
          <el-form :model="feishuSettings" label-width="0">
            <el-form-item class="feishu-form-item">
              <div class="alert-container">
                <span class="form-item-label">APP ID</span>
                <el-input
                  v-model="feishuSettings.appId"
                  placeholder="形如：cli_a9bfed9574f8dcd5"
                  @blur="handleFeishuAppIdBlur"
                  @keydown.enter.prevent
                  class="alert-input"
                />
              </div>
            </el-form-item>
            <el-form-item class="feishu-form-item">
              <div class="alert-container">
                <span class="form-item-label">App Secret</span>
                <el-input
                  v-model="feishuSettings.appSecret"
                  type="password"
                  show-password
                  placeholder="应用密钥，长度需大于10"
                  @blur="handleFeishuSecretBlur"
                  @keydown.enter.prevent
                  class="alert-input"
                />
              </div>
            </el-form-item>
            <el-form-item class="feishu-form-item">
              <div class="alert-container">
                <span class="form-item-label">手机号</span>
                <el-input
                  v-model="feishuSettings.phone"
                  placeholder="请输入飞书注册手机号"
                  maxlength="11"
                  @input="handleFeishuPhoneInput"
                  @blur="handleFeishuPhoneBlur"
                  @keydown.enter.prevent
                  class="alert-input"
                >
                  <template #prepend>+86</template>
                </el-input>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      <!-- 文件库设置卡片 -->
      <el-card v-if="isSettingsSectionAvailable('file-library-settings')" class="setting-card" id="file-library-settings">
        <template #header>
          <div class="card-header">
            <span>文件库</span>
            <el-button type="primary" size="small" :icon="Plus" @click="fileLibraryDialogVisible = true">
              添加文件
            </el-button>
          </div>
        </template>
        <div class="setting-section">
          <div class="custom-info-box" style="margin-bottom: 16px;">
            <div class="info-icon"><el-icon><InfoFilled /></el-icon></div>
            <div class="info-content">
              <p>上传文件，并在工作流中输出 <code>[send_file:标识]</code> 即可自动匹配文件并发送，适合保密文件或大文件发送</p>
            </div>
          </div>

          <!-- 文件列表 -->
          <div v-if="fileLibraryLoading" style="text-align:center; padding: 20px;">
            <el-icon class="is-loading"><Loading /></el-icon> 加载中...
          </div>
          <el-empty v-else-if="fileLibraryList.length === 0" description="暂无文件，点击「添加文件」上传" :image-size="60" />
          <el-table v-else :data="fileLibraryList" style="width:100%" size="small">
            <el-table-column label="标识 (Key)" prop="key" min-width="110">
              <template #default="{ row }">
                <el-tag type="primary" size="small" style="font-family:monospace; max-width:100%; overflow:hidden; text-overflow:ellipsis;">
                  {{ row.key }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="文件名" prop="filename" show-overflow-tooltip />
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <div style="display:flex; gap:4px; align-items:center;">
                  <el-tooltip content="复制引用格式" placement="top">
                    <el-button size="small" :icon="CopyDocument" circle @click="copyFileKey(row.key)" />
                  </el-tooltip>
                  <el-tooltip content="文件详情" placement="top">
                    <el-button size="small" :icon="Document" circle @click="showFileDetail(row)" />
                  </el-tooltip>
                  <el-tooltip content="删除文件" placement="top">
                    <el-button size="small" type="danger" :icon="Delete" circle @click="deleteFileLibraryItem(row.key)" />
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- 文件详情弹窗 -->
      <el-dialog v-model="fileDetailDialogVisible" title="文件详情" width="420px">
        <el-descriptions :column="1" border size="small" v-if="fileDetailItem">
          <el-descriptions-item label="标识 Key">
            <el-tag type="primary" size="small" style="font-family:monospace;">{{ fileDetailItem.key }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="AI 引用格式">
            <code style="font-size:12px;">[send_file:{{ fileDetailItem.key }}]</code>
            <el-button link size="small" style="margin-left:8px;" @click="copyFileKey(fileDetailItem.key)">复制</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="文件名">{{ fileDetailItem.filename }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ fileDetailItem.size_mb < 1 ? (fileDetailItem.size_mb * 1024).toFixed(0) + ' KB' : fileDetailItem.size_mb + ' MB' }}
          </el-descriptions-item>
          <el-descriptions-item label="文件状态">
            <el-tag :type="fileDetailItem.exists ? 'success' : 'danger'" size="small">
              {{ fileDetailItem.exists ? '正常' : '文件缺失' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ formatUploadTime(fileDetailItem.upload_time) }}</el-descriptions-item>
          <el-descriptions-item label="备注" v-if="fileDetailItem.description">{{ fileDetailItem.description }}</el-descriptions-item>
        </el-descriptions>
        <template #footer>
          <el-button @click="fileDetailDialogVisible = false">关闭</el-button>
        </template>
      </el-dialog>

      <!-- 上传文件弹窗 -->
      <el-dialog v-model="fileLibraryDialogVisible" title="添加文件到文件库" width="480px" :close-on-click-modal="false">
        <el-form :model="fileLibraryForm" label-width="80px" @submit.prevent>
          <el-form-item label="标识 Key" required>
            <el-input v-model="fileLibraryForm.key" placeholder="如：产品手册、报价单（全局唯一）" clearable
              @blur="checkFileLibraryKey" />
            <div v-if="fileLibraryKeyError" class="form-error">{{ fileLibraryKeyError }}</div>
          </el-form-item>
          <el-form-item label="选择文件" required>
            <el-upload
              ref="fileLibraryUploadRef"
              :auto-upload="false"
              :limit="1"
              :on-change="onFileLibraryFileChange"
              :on-exceed="() => ElMessage.warning('每次只能上传一个文件')"
              :show-file-list="true"
              action="#"
            >
              <el-button>点击选择文件</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="fileLibraryForm.description" placeholder="可选，描述文件用途" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="fileLibraryDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="fileLibraryUploading" @click="submitFileLibraryUpload">
            上传
          </el-button>
        </template>
      </el-dialog>

      <!-- 休息时间设置卡片 -->
      <el-card v-if="isSettingsSectionAvailable('rest-time-settings')" class="setting-card" id="rest-time-settings">
        <template #header>
          <div class="card-header">
            <span>休息时间</span>
          </div>
        </template>
        <div class="setting-section">
          <div class="api-description">
            <div class="custom-info-box">
              <div class="info-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="info-content">
                <div class="info-text">设置任务休息的时间，此期间任务将暂停执行</div>
              </div>
            </div>
          </div>
          
          <!-- 当前设置显示 -->
          <div class="rest-time-display">
            <div class="current-setting">
              <div class="setting-indicator"></div>
              <span class="setting-label">休息时间：</span>
              <span class="setting-value">
                {{ intervalToTime(restTimeSettings.startTime) }} - {{ intervalToTime(restTimeSettings.endTime) }}
              </span>
            </div>
          </div>

          <!-- 时间轴容器 -->
          <div class="timeline-container">
            <!-- 时间轴主体 -->
            <div class="timeline-wrapper" ref="timelineRef">
              <!-- 背景轨道 -->
              <div class="timeline-track">
                <!-- 启用区域（绿色） -->
                <div class="enabled-range"></div>
                
                <!-- 禁用区域（红色） -->
                <template v-if="Array.isArray(disabledRange)">
                  <div 
                    v-for="(range, index) in disabledRange" 
                    :key="index"
                    class="disabled-range"
                    :style="{
                      left: `${range.start}%`,
                      width: `${range.width}%`
                    }"
                  />
                </template>
                <div 
                  v-else
                  class="disabled-range"
                  :style="{
                    left: `${disabledRange.start}%`,
                    width: `${disabledRange.width}%`
                  }"
                />

                <!-- 开始时间控制点 -->
                <div
                  class="time-control start-control"
                  :style="{ left: `${getPosition(restTimeSettings.startTime)}%` }"
                  @mousedown="(e: MouseEvent) => handleMouseDown('start', e)"
                >
                  <!-- <div class="time-tooltip">
                    {{ intervalToTime(restTimeSettings.startTime) }}
                  </div> -->
                </div>

                <!-- 结束时间控制点 -->
                <div
                  class="time-control end-control"
                  :style="{ left: `${getPosition(restTimeSettings.endTime)}%` }"
                  @mousedown="(e: MouseEvent) => handleMouseDown('end', e)"
                >
                  <!-- <div class="time-tooltip">
                    {{ intervalToTime(restTimeSettings.endTime) }}
                  </div> -->
                </div>
              </div>
            </div>
          </div>

          <!-- 精确时间输入 -->
          <div class="time-inputs">
            <div class="time-input-group">
              <el-select
                v-model="startTimeDisplay"
                @change="handleStartTimeChange"
                placeholder="🕐 休息开始时间"
                class="time-select"
              >
                <el-option
                  v-for="i in 96"
                  :key="i-1"
                  :value="intervalToTime(i-1)"
                  :label="intervalToTime(i-1)"
                />
              </el-select>
            </div>
            <div class="time-input-group">
              <el-select
                v-model="endTimeDisplay"
                @change="handleEndTimeChange"
                placeholder="🕐 休息结束时间"
                class="time-select"
              >
                <el-option
                  v-for="i in 96"
                  :key="i-1"
                  :value="intervalToTime(i-1)"
                  :label="intervalToTime(i-1)"
                />
              </el-select>
            </div>
          </div>
          <!-- 应用场景选择 -->
          <div class="task-selection">
            <!-- <h4 class="selection-title">应用于</h4> -->
            <div class="task-options">
              <label 
                v-for="task in taskOptions" 
                :key="task.id"
                class="task-option"
              >
                <input
                  type="checkbox"
                  :checked="restTimeSettings.selectedTasks.includes(task.name)"
                  @change="handleTaskToggle(task.name)"
                  class="task-checkbox"
                />
                <span class="task-icon">{{ task.icon }}</span>
                <span class="task-name">{{ task.name }}</span>
                <span 
                  v-if="restTimeSettings.selectedTasks.includes(task.name)" 
                  class="applied-badge"
                >
                  已应用
                </span>
              </label>
            </div>
            <p class="task-description">
              未勾选的任务不会受休息时间限制
            </p>
          </div>
          <!-- 快捷设置按钮 -->
          <!-- <div class="quick-settings">
            <span class="quick-label">快捷设置：</span>
            <el-button 
              size="small" 
              @click="setQuickTime(0, 32)"
              class="quick-btn"
            >
              深夜休息 (00:00-08:00)
            </el-button>
            <el-button 
              size="small" 
              @click="setQuickTime(48, 80)"
              class="quick-btn"
            >
              午间休息 (12:00-20:00)
            </el-button>
            <el-button 
              size="small" 
              @click="setQuickTime(84, 28)"
              class="quick-btn"
            >
              夜间休息 (21:00-07:00)
            </el-button>
          </div> -->
        </div>
      </el-card>
    </div>
    </div>
      <!-- 添加智能体测试弹窗 -->
      <el-dialog
        v-model="testAgentDialogVisible"
        title="测试智能体"
        width="60%"
        :close-on-click-modal="false"
      >
        <el-form :model="testAgentForm" label-width="100px">
          <el-form-item label="选择智能体">
            <el-select v-model="testAgentForm.agentId" placeholder="请选择智能体">
              <el-option
                v-for="agent in cozeAgents"
                :key="agent.botId"
                :label="agent.name"
                :value="agent.botId"
              >
                <div style="display: flex; align-items: center;">
                  <img 
                    :src="getPlatformIconPath(agent.platform)" 
                    :alt="agent.platform || 'coze'" 
                    style="width: 20px; margin-right: 8px;"
                  />
                  {{ agent.name }}
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="testAgentDialogVisible = false">取消</el-button>
            <el-button type="primary" :icon="Connection" :loading="testing" @click="testCozeAgent">测试</el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 清除会话缓存弹窗 -->
      <el-dialog
        v-model="clearCacheDialogVisible"
        title="清除Coze会话缓存"
        width="500px"
        :before-close="handleClearCacheDialogClose"
      >
        <div class="clear-cache-content">
           <el-alert
             type="warning"
             show-icon
             :closable="false"
             class="cache-warning-banner"
           >
             <span class="cache-warning-text">
               为了提高Coze回复的上下文连贯性，机器人会缓存Coze的会话记录。如果你切换了不同的Coze账号，则一定要清除下本地会话缓存，不同Coze账号之间的会话是隔离的。
             </span>
           </el-alert>
         </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="clearCacheDialogVisible = false">取消</el-button>
            <el-button type="primary" :icon="Delete" :loading="clearingCache" @click="clearCozeCache">清除会话</el-button>
          </span>
        </template>
      </el-dialog>
      <el-dialog
        v-model="benefitDialogVisible"
        title="Coze积分权益"
        width="520px"
        :close-on-click-modal="false"
      >
        <div class="benefit-content" v-loading="benefitLoading">
          <div class="benefit-header">
            <div class="benefit-level">
              <span class="label">权益等级</span>
              <el-tag :type="levelTagType">{{ levelLabel }}</el-tag>
            </div>
          </div>
          <div class="benefit-stats">
            <div class="stat-card">
              <div class="stat-title">已使用</div>
              <div class="stat-value">{{ benefitInfo.effective?.used ?? 0 }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">总积分</div>
              <div class="stat-value">{{ benefitInfo.effective?.total ?? 0 }}</div>
            </div>
          </div>
          <el-progress 
            :percentage="progressPercent" 
            :stroke-width="12" 
            status="success"
          />
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="benefitDialogVisible = false">关闭</el-button>
          </span>
        </template>
      </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, watch, onMounted,onUnmounted,onBeforeMount,nextTick,computed, provide, inject, type Ref } from 'vue'
  import type { BrandConfig } from '@/config/brand'
  import { QuestionFilled,Connection, SuccessFilled, CircleCloseFilled, ArrowUp, ArrowDown, Plus, Select, Delete, Edit, InfoFilled, Setting, Loading, CopyDocument, Document } from '@element-plus/icons-vue'
  import { ElMessage,ElMessageBox } from 'element-plus'
  import type { CheckboxValueType } from 'element-plus'
  import CozeAgentConfig from '@/components/settings/CozeAgentConfig.vue'
  import { testExternalApiConnection } from '@/api/external-api'
  import type { CozeAgent } from '@/types/coze'
  import { useRouter } from 'vue-router'
  import { saveConfig, getConfig, headers as apiHeaders, API_BASE_URL } from '@/api/config'
  import { testAgent } from '@/api/coze'
  import GreetingConfig from '@/components/settings/GreetingConfig.vue'
  import VoiceConfig from '@/components/settings/VoiceConfig.vue'
  import VoiceLibrary from '@/components/settings/VoiceLibrary.vue'
  import SettingsBackup from '@/components/settings/SettingsBackup.vue'
  import { getPlatformIconPath } from '@/utils/iconImages'
  import { useRuntimeCapabilityStore } from '@/store/runtimeCapabilities'
  import {
    isMacStrictRuntime as resolveMacStrictRuntime,
    isSettingsConfigAvailable as resolveSettingsConfigAvailable,
    isSettingsSectionAvailable as resolveSettingsSectionAvailable
  } from '@/runtime/capabilities'
  import { debounce } from 'lodash'
  // 添加组件名称定义
  defineOptions({
    name: 'SettingsPage'
  })
  
  const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({} as BrandConfig))
  const runtimeCapabilityStore = useRuntimeCapabilityStore()
  const isMacStrictRuntime = computed(() => (
    resolveMacStrictRuntime(
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.snapshot?.platform
    )
  ))
  const allowedGreetingTypes = computed(() => {
    if (!isMacStrictRuntime.value) return undefined
    const favorite = runtimeCapabilityStore.snapshot
      ?.capabilities['message.send_favorite']
    const favoriteAvailable = favorite?.status === 'supported'
      || favorite?.status === 'experimental'
    return favoriteAvailable
      ? ['text', 'file', 'agent', 'favorite'] as const
      : ['text', 'file', 'agent'] as const
  })
  const isSettingsSectionAvailable = (sectionId: string) => (
    resolveSettingsSectionAvailable(
      sectionId,
      runtimeCapabilityStore.mode,
      runtimeCapabilityStore.snapshot?.platform
    )
  )
  
  const difySettings = ref({
    baseUrl: ''
  })
  
  const aiSettingsExpanded = ref(false)
  const showMorePlatforms = ref(false)
  const testAgentDialogVisible = ref(false)
    const testAgentForm = ref({
      agentId: ''
  })
  // 清除会话缓存相关变量
  const clearCacheDialogVisible = ref(false)
  const clearingCache = ref(false)
  // 添加话术输入相关变量
  const phraseInputVisible = ref(false)
  const phraseInputValue = ref('')
  const phraseInputRef = ref<HTMLInputElement | null>(null)
  const showTestAgentDialog = () => {
  if (!cozeAgents.value?.length) {
    ElMessage.warning('请先添加一个智能体')
    return
  }
  
    testAgentForm.value.agentId = cozeAgents.value[0].botId
    
    testAgentDialogVisible.value = true
  }
  // 外部API配置
  const externalApiSettings = ref({
    identifier: ''
  })
  const testingConnection = ref(false)
  const connectionStatus = ref<{success: boolean, message: string} | null>(null)
  // 添加自动保存 Dify 配置的方法
  const autoSaveDifySettings = debounce(async () => {
    try {
      await saveConfig('dify_settings', difySettings.value)
      ElMessage.success('Dify配置已保存')
    } catch (error) {
      console.error('保存Dify配置失败:', error)
      ElMessage.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, 500)
  // 添加自动保存 Coze 配置的方法
  const autoSaveCozeSettings = debounce(async () => {
    try {
      const submittedToken = cozeSettings.value.token.trim()
      // 更新最后更新时间
      cozeSettings.value.tokenLastUpdated = new Date().toISOString()
      const result = await saveConfig('coze_settings',
      {
        "coze_settings": {
          "token": submittedToken,
          "tokenLastUpdated": cozeSettings.value.tokenLastUpdated,
      }})
      cozeSettings.value.hasToken = Boolean(
        cozeSettings.value.hasToken || submittedToken
      )
      if (isMacStrictRuntime.value && submittedToken) {
        cozeSettings.value.token = ''
      }
      ElMessage.success(
        result.restartRequired
          ? 'Coze配置已保存，重启客户端后生效'
          : 'Coze配置已保存'
      )
    } catch (error) {
      console.error('保存Coze配置失败:', error)
      ElMessage.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, 500)
  // 导航项配置
  const allNavItems = [
  { id: 'agent-settings', name: '智能体管理' },
  { id: 'greeting-settings', name: '话术组配置' },
  { id: 'chat-history-settings', name: 'AI回复配置' },
  { id: 'ai-settings', name: 'AI接入设置' },
  { id: 'voice-settings', name: 'AI语音配置' },
  { id: 'voice-library', name: '我的音色' },
  { id: 'moment-settings', name: '朋友圈评论' },
  // { id: 'external-api-settings', name: '外部API配置' },
  { id: 'feishu-settings', name: '飞书通知' },
  { id: 'file-library-settings', name: '文件库' },
  { id: 'rest-time-settings', name: '休息时间' }
]
const navItems = computed(() => (
  allNavItems.filter(item => isSettingsSectionAvailable(item.id))
))

// 添加格式化 ID 的方法
const formatId = (id: string) => {
  if (!id || id.length <= 10) return id;
  return `${id.substring(0, 5)}******${id.substring(id.length - 5)}`;
}
const isNarrowScreen = ref(window.innerWidth <= 650)
const activeSection = ref('agent-settings')
const contentRef = ref<HTMLElement | null>(null)
const isScrollingProgrammatically = ref(false) // 添加标志
// 滚动到指定区域
const scrollToSection = (sectionId: string) => {
  isScrollingProgrammatically.value = true // 设置标志
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    const offset = 20 // 设置一个偏移量，避免完全贴顶
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset
    
    contentRef.value?.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
    
    // 滚动完成后重置标志
    setTimeout(() => {
      isScrollingProgrammatically.value = false
    }, 800) // 给足够的时间完成平滑滚动
  } else {
    isScrollingProgrammatically.value = false
  }
}
// 添加窗口大小变化处理函数
const handleResize = () => {
  isNarrowScreen.value = window.innerWidth <= 650
}

// ==================== 文件库 ====================
const fileLibraryList = ref<any[]>([])
const fileLibraryLoading = ref(false)
const fileLibraryDialogVisible = ref(false)
const fileLibraryUploading = ref(false)
const fileLibraryUploadRef = ref<any>(null)
const fileLibraryKeyError = ref('')
const fileLibraryForm = ref({ key: '', description: '', file: null as File | null })
const fileDetailDialogVisible = ref(false)
const fileDetailItem = ref<any>(null)

const showFileDetail = (row: any) => {
  fileDetailItem.value = row
  fileDetailDialogVisible.value = true
}

const loadFileLibrary = async () => {
  fileLibraryLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/api/file_library/list`, { headers: apiHeaders })
    const data = await res.json()
    if (data.success) fileLibraryList.value = data.data
  } catch (e) {
    console.error('加载文件库失败', e)
  } finally {
    fileLibraryLoading.value = false
  }
}

const checkFileLibraryKey = async () => {
  const key = fileLibraryForm.value.key.trim()
  fileLibraryKeyError.value = ''
  if (!key) return
  try {
    const res = await fetch(`${API_BASE_URL}/api/file_library/check?key=${encodeURIComponent(key)}`, { headers: apiHeaders })
    const data = await res.json()
    if (data.exists) fileLibraryKeyError.value = `标识「${key}」已存在，请换一个`
  } catch (e) {
    console.error('检查key失败', e)
  }
}

const onFileLibraryFileChange = (uploadFile: any) => {
  fileLibraryForm.value.file = uploadFile.raw as File
}

const submitFileLibraryUpload = async () => {
  const key = fileLibraryForm.value.key.trim()
  if (!key) { ElMessage.warning('请填写文件标识'); return }
  if (fileLibraryKeyError.value) { ElMessage.warning(fileLibraryKeyError.value); return }
  if (!fileLibraryForm.value.file) { ElMessage.warning('请选择要上传的文件'); return }

  fileLibraryUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', fileLibraryForm.value.file)
    fd.append('key', key)
    fd.append('description', fileLibraryForm.value.description)

    // FormData 上传不能带 Content-Type，只传 X-API-Key
    const res = await fetch(`${API_BASE_URL}/api/file_library/upload`, {
      method: 'POST',
      headers: { 'X-API-Key': apiHeaders['X-API-Key'] },
      body: fd,
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('文件已添加到文件库')
      fileLibraryDialogVisible.value = false
      fileLibraryForm.value = { key: '', description: '', file: null }
      fileLibraryKeyError.value = ''
      fileLibraryUploadRef.value?.clearFiles()
      await loadFileLibrary()
    } else {
      ElMessage.error(data.error || '上传失败')
    }
  } catch (e) {
    ElMessage.error('上传失败，请重试')
  } finally {
    fileLibraryUploading.value = false
  }
}

const deleteFileLibraryItem = async (key: string) => {
  try {
    await ElMessageBox.confirm(`确认删除文件库中的「${key}」？删除后工作流将无法发送该文件。`, '删除确认', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
  } catch { return }

  try {
    const res = await fetch(`${API_BASE_URL}/api/file_library/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: apiHeaders,
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('已删除')
      await loadFileLibrary()
    } else {
      ElMessage.error(data.error || '删除失败')
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const copyFileKey = (key: string) => {
  const refStr = `[send_file:${key}]`
  navigator.clipboard.writeText(refStr).then(() => {
    ElMessage.success(`已复制：${refStr}`)
  }).catch(() => {
    ElMessage.info(`请手动复制：${refStr}`)
  })
}

const formatUploadTime = (iso: string) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}
// ===================================================

// 优化滚动监听逻辑
const handleScroll = () => {
  if (!contentRef.value || isScrollingProgrammatically.value) return // 添加检查
  
  const sections = navItems.value.map(item => ({
    id: item.id,
    element: document.getElementById(item.id)
  }))
  // 获取可视区域高度
  const viewportHeight = window.innerHeight
  
  // 找到当前在视口中最靠上的部分
  let currentSection = sections[0]
  let minDistance = Infinity
  
  sections.forEach(section => {
    if (!section.element) return
    const rect = section.element.getBoundingClientRect()
    // 计算元素顶部到视口顶部的距离
    const distance = Math.abs(rect.top)
    
    // 如果元素在视口内且距离顶部最近
    if (rect.top <= viewportHeight / 3 && distance < minDistance) {
      minDistance = distance
      currentSection = section
    }
  })
  
  if (currentSection) {
    activeSection.value = currentSection.id
  }
}
  // 定义设置类型
  interface CozeSettings {
    token: string
    hasToken?: boolean
    tokenLastUpdated?: string
  }
  interface RestTimeSettings {
    startTime: number
    endTime: number
    selectedTasks: string[]
  }
  // 定义平台类型
  type PlatformType = 'DeepSeek' | '通义千问' | '硅基流动';

  interface ModelSettings {
    platform: PlatformType;
    platformConfigs: {
      [key in PlatformType]: PlatformConfig;
    };
  }
  interface ChatHistorySettings {
    autoSave: boolean
    includeContext: boolean
    contextCount : number
    includeUserInfo: boolean
    autoSplitMode: 'none' | 'double_newline' | 'triple_newline'
    // 消息合并回复配置
    messageMerge: {
      mode: 'none' | 'context' | 'concat'  // 不合并、上下文方式、字符拼接方式
      interval: number  // 消息监听间隔(秒)
    }
    // 添加转人工配置
    transferConfig: {
      phrases: string[]
      notifyWechat: string
      notSendToCustomer?: boolean
    }
  }

  // 定义朋友圈设置类型
  interface MomentSettings {
    agentId: string
    commentLimit: number
    perFriendLimit: number
    autoLike: boolean
    interactionMode: string
    prompt: string
    blacklist: string
  }
  interface PlatformConfig {
    baseUrl: string;
    apiKey: string;
    modelName: string;
  }
  const feishuSettings = ref({
    appId: '',
    appSecret: '',
    phone: ''
  })
  // 用于比较Token是否发生变化
  const initialCozeToken = ref<string>('');
  const initialCozeTokenLastUpdated = ref<string | undefined>(undefined);
  // 初始化朋友圈设置状态
  const momentSettings = ref<MomentSettings>({
    agentId: '',
    commentLimit: 100,
    perFriendLimit: 2,
    autoLike: false,
    interactionMode: 'like_and_comment',
    blacklist: '', 
    prompt: ``
  })
  // 初始化聊天记录配置状态
  const chatHistorySettings = ref<ChatHistorySettings>({
    autoSave: false,
    includeContext: true,
    contextCount:5,
    includeUserInfo: false,
    autoSplitMode: 'double_newline',
    // 消息合并回复配置默认值
    messageMerge: {
      mode: 'none',
      interval: 5
    },
    // 添加转人工配置默认值
    transferConfig: {
      phrases: [],
      notifyWechat: "",
      notSendToCustomer: false
    }
  })
  // 添加路由实例
  const router = useRouter()
  const testing = ref(false)
  // 添加路由守卫
  router.beforeEach(async (to, from, next) => {
    if (to.name === 'settings') {
      await loadSettings()
    }
    next()
  })
  const saveFeishuSettings = async () => {
    try {
      const result = await saveConfig('feishu_settings', { feishu_settings: feishuSettings.value })
      if (result.success) {
        ElMessage.success('飞书设置已保存')
      } else {
        throw new Error('飞书设置保存失败')
      }
    } catch (error) {
      console.error('飞书设置保存失败:', error)
      ElMessage.error('飞书设置保存失败')
    }
  }
  const handleFeishuAppIdBlur = async () => {
    const val = (feishuSettings.value.appId || '').trim()
    if (!val.startsWith('cli_')) {
      ElMessage.warning('APP ID 必须以 cli_ 开头')
      return
    }
    await saveFeishuSettings()
  }
  const handleFeishuSecretBlur = async () => {
    const val = (feishuSettings.value.appSecret || '').trim()
    if (val.length <= 10) {
      ElMessage.warning('App Secret 长度必须大于 10')
      return
    }
    await saveFeishuSettings()
  }
  const handleFeishuPhoneInput = () => {
    feishuSettings.value.phone = (feishuSettings.value.phone || '').replace(/\D/g, '').slice(0, 11)
  }
  const handleFeishuPhoneBlur = async () => {
    const val = (feishuSettings.value.phone || '').trim()
    if (!/^\d{11}$/.test(val)) {
      ElMessage.warning('手机号必须为 11 位大陆手机号')
      return
    }
    await saveFeishuSettings()
  }
  // 同步转人工话术到回复过滤词
  const syncTransferPhrasesToFilterWords = async () => {
    try {
      const result = await getConfig('reply_strategy_v2')
      let strategyConfig = result?.success && result?.data ? result.data : { staffList: [], commonConfig: { filterWords: [] } }
      
      if (!strategyConfig.commonConfig) {
        strategyConfig.commonConfig = { filterWords: [] }
      }
      if (!strategyConfig.commonConfig.filterWords) {
        strategyConfig.commonConfig.filterWords = []
      }
      
      const filterWords = strategyConfig.commonConfig.filterWords
      const phrases = chatHistorySettings.value.transferConfig.phrases
      
      let isChanged = false
      
      if (chatHistorySettings.value.transferConfig.notSendToCustomer) {
        // 勾选状态下：把所有 phrases 加进去
        phrases.forEach(phrase => {
          if (!filterWords.includes(phrase)) {
            filterWords.push(phrase)
            isChanged = true
          }
        })
      } else {
        // 取消勾选时：把 phrases 从 filterWords 中移除
        phrases.forEach(phrase => {
          const index = filterWords.indexOf(phrase)
          if (index > -1) {
            filterWords.splice(index, 1)
            isChanged = true
          }
        })
      }
      
      if (isChanged) {
        await saveConfig('reply_strategy_v2', strategyConfig)
      }
    } catch (error) {
      console.error('同步回复过滤词失败:', error)
    }
  }

  const handleNotSendToCustomerChange = async (val: CheckboxValueType) => {
    await saveChatHistorySettings()
    await syncTransferPhrasesToFilterWords()
  }

  // 显示话术输入框
  const addPhraseItem = () => {
    if (chatHistorySettings.value.transferConfig.phrases.length < 3) {
      phraseInputVisible.value = true
      nextTick(() => {
        phraseInputRef.value?.focus()
      })
    }
  }
  // 确认添加话术
  const confirmPhrase = async () => {
    if (phraseInputValue.value.trim()) {
      if (!chatHistorySettings.value.transferConfig.phrases.includes(phraseInputValue.value.trim())) {
        chatHistorySettings.value.transferConfig.phrases.push(phraseInputValue.value.trim())
        await saveChatHistorySettings()
        if (chatHistorySettings.value.transferConfig.notSendToCustomer) {
          await syncTransferPhrasesToFilterWords()
        }
      }
    }
    phraseInputVisible.value = false
    phraseInputValue.value = ''
  }
  // 删除识别话术
  const removePhraseItem = async (index: number) => {
    const removedPhrase = chatHistorySettings.value.transferConfig.phrases[index]
    chatHistorySettings.value.transferConfig.phrases.splice(index, 1)
    await saveChatHistorySettings()
    
    if (chatHistorySettings.value.transferConfig.notSendToCustomer) {
      try {
        const result = await getConfig('reply_strategy_v2')
        if (result?.success && result?.data?.commonConfig?.filterWords) {
          const filterWords = result.data.commonConfig.filterWords
          const wordIndex = filterWords.indexOf(removedPhrase)
          if (wordIndex > -1) {
            filterWords.splice(wordIndex, 1)
            await saveConfig('reply_strategy_v2', result.data)
          }
        }
      } catch (error) {
        console.error('删除同步回复过滤词失败:', error)
      }
    }
  }
  // 修改测试方法
  const testCozeAgent = async () => {
    if (!testAgentForm.value.agentId) {
      ElMessage.warning('请选择要测试的智能体')
      return
    }
    
    // 获取选中的智能体信息
    const selectedAgent = cozeAgents.value.find(agent => agent.botId === testAgentForm.value.agentId)
    if (!selectedAgent) {
      ElMessage.warning('未找到选中的智能体')
      return
    }
    
    // 检查平台配置
    if ((selectedAgent.platform || 'coze') === 'coze' && !cozeSettings.value.token) {
      ElMessage.warning('请先配置 Coze Token')
      return
    }
    if (selectedAgent.platform === 'coze3' && !selectedAgent.apiToken) {
      ElMessage.warning('请先配置该 Coze 3.0 Project 的 API Token')
      return
    }
    
    testing.value = true
    try {
      // 调用后端测试接口
      const result = await testAgent(selectedAgent.botId, selectedAgent.platform || 'coze')
      
      if (result.success) {
        ElMessage.success('测试通过！')
        testAgentDialogVisible.value = false
      } else {
        ElMessage.error(result.error || '测试失败')
      }
    } catch (error) {
      console.error('测试失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '测试失败')
    } finally {
      testing.value = false
    }
  }
const saveMomentSettings = async () => {
  try {
    const result = await saveConfig('moment_settings', { moment_settings: momentSettings.value })
    if (result.success) {
      ElMessage.success('朋友圈设置保存成功')
    } else {
      throw new Error('保存失败')
    }
  } catch (error) {
    console.error('保存朋友圈设置失败:', error)
    ElMessage.error('保存朋友圈设置失败')
  }
}
const restTimeSettings = ref<RestTimeSettings>({
  startTime: 0, // 0:00 (in 15-min intervals from 0:00)
  endTime: 28, // 7:00
  selectedTasks: ['自动加好友', '自动通过好友'] // 默认选中的任务
})

const isDragging = ref<string | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const startTimeDisplay = ref('')
const endTimeDisplay = ref('')

// 任务选项
const allTaskOptions = [
  { id: 'moment_comment', name: '朋友圈评论', icon: '💬' },
  { id: 'add_friend', name: '自动加好友', icon: '👥' },
  { id: 'accept_friend', name: '自动通过好友', icon: '✅' }
]
const taskOptions = computed(() => (
  isMacStrictRuntime.value
    ? allTaskOptions.filter(task => task.id !== 'accept_friend')
    : allTaskOptions
))

// 总共96个15分钟间隔 (24小时 * 4)
const totalIntervals = 96

// 将间隔数转换为时间字符串
const intervalToTime = (interval: number): string => {
  const hours = Math.floor(interval / 4)
  const minutes = (interval % 4) * 15
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// 将时间字符串转换为间隔数
const timeToInterval = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 4 + minutes / 15
}

// 计算位置百分比
const getPosition = (interval: number): number => {
  return (interval / (totalIntervals - 1)) * 100
}

// 计算禁用时间范围
const disabledRange = computed(() => {
  const start = restTimeSettings.value.startTime
  const end = restTimeSettings.value.endTime
  
  if (start <= end) {
    return {
      start: getPosition(start),
      width: getPosition(end) - getPosition(start)
    }
  } else {
    // 跨越午夜的情况
    return [
      { start: 0, width: getPosition(end) },
      { start: getPosition(start), width: 100 - getPosition(start) }
    ]
  }
})

// 处理任务选择
const handleTaskToggle = (taskName: string) => {
  const tasks = restTimeSettings.value.selectedTasks
  if (tasks.includes(taskName)) {
    restTimeSettings.value.selectedTasks = tasks.filter(t => t !== taskName)
  } else {
    restTimeSettings.value.selectedTasks = [...tasks, taskName]
  }
  saveRestTimeSettings()
}

// 处理鼠标拖拽
const handleMouseDown = (type: string, e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = type
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !timelineRef.value) return

  const rect = timelineRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const interval = Math.round((x / rect.width) * (totalIntervals - 1))

  if (isDragging.value === 'start') {
    restTimeSettings.value.startTime = interval
    startTimeDisplay.value = intervalToTime(interval)
  } else if (isDragging.value === 'end') {
    restTimeSettings.value.endTime = interval
    endTimeDisplay.value = intervalToTime(interval)
  }
  saveRestTimeSettings()
}

const handleMouseUp = () => {
  isDragging.value = null
}

// 处理时间选择器变化
const handleStartTimeChange = (timeStr: string) => {
  restTimeSettings.value.startTime = timeToInterval(timeStr)
  saveRestTimeSettings()
}

const handleEndTimeChange = (timeStr: string) => {
  restTimeSettings.value.endTime = timeToInterval(timeStr)
  saveRestTimeSettings()
}

// 快捷设置
const setQuickTime = (start: number, end: number) => {
  restTimeSettings.value.startTime = start
  restTimeSettings.value.endTime = end
  startTimeDisplay.value = intervalToTime(start)
  endTimeDisplay.value = intervalToTime(end)
  saveRestTimeSettings()
}

// 保存休息时间设置
const saveRestTimeSettings = async () => {
  try {
    const result = await saveConfig('rest_time_settings', {
      rest_time_settings: restTimeSettings.value
    })
    if (result.success) {
      console.log('休息时间设置保存成功')
    }
  } catch (error) {
    console.error('保存休息时间设置失败:', error)
    ElMessage.error('保存失败')
  }
}
// 格式化显示（隐藏中间部分）
const formatIdentifierDisplay = (value: string) => {
  if (!value || value.length <= 8) return value
  return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
}

// 解析输入（保持原始值）
const parseIdentifierInput = (value: string) => {
  return value
}

// 处理标识符变更 - 优化交互体验
const handleIdentifierChange = debounce(async (value: string) => {
  // 确保保存的是原始输入值
  const trimmedValue = value.trim()
  externalApiSettings.value.identifier = trimmedValue
  
  // 修改条件：无论是否为空都要保存，但空值时清除连接状态
  try {
    await saveConfig('external_api_settings', {
      identifier: trimmedValue
    })
    connectionStatus.value = null // 清除之前的连接状态
    
    // 如果清空了输入框，显示提示
    if (!trimmedValue) {
      ElMessage.info('API标识符已清空')
    }
  } catch (error) {
    console.error('保存API配置失败:', error)
    ElMessage.error('保存失败')
  }
}, 1000)
// 测试API连接
const testApiConnection = async () => {
  if (!externalApiSettings.value.identifier) return
  
  testingConnection.value = true
  connectionStatus.value = null
  
  try {
    const result = await testExternalApiConnection(externalApiSettings.value.identifier)
    
    connectionStatus.value = {
      success: result.success,
      message: result.message
    }
    
    if (result.success) {
      ElMessage.success('API连接测试成功')
    } else {
      ElMessage.error(`连接测试失败: ${result.message}`)
    }
  } catch (error) {
    console.error('测试连接失败:', error)
    connectionStatus.value = {
      success: false,
      message: '网络错误或服务不可用'
    }
    ElMessage.error('测试连接失败')
  } finally {
    testingConnection.value = false
  }
}
// 添加保存聊天记录配置的方法
const saveChatHistorySettings = async () => {
  try {
    const result = await saveConfig('chat_history_settings', { 
      chat_history_settings: chatHistorySettings.value 
    })
    if (result.success) {
      ElMessage.success('聊天配置保存成功')
    } else {
      throw new Error('保存失败')
    }
  } catch (error) {
    console.error('保存聊天配置失败:', error)
    ElMessage.error('保存聊天配置失败')
  }
}


const deleteAgent = async (agent: CozeAgent) => {
  try {
    await ElMessageBox.confirm('确定要删除该智能体吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const updatedAgents = cozeAgents.value.filter(a => a.botId !== agent.botId)
    const result = await saveConfig('agents', { agents: updatedAgents })
    
    if (result.success) {
      cozeAgents.value = Array.isArray(result.data) ? result.data : updatedAgents
      ElMessage.success('删除成功')
    } else {
      throw new Error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除智能体失败:', error)
      ElMessage.error('删除智能体失败')
    }
  }
}
  
  // 初始化设置状态
  const cozeSettings = ref<CozeSettings>({
    token: '',
    hasToken: false,
    tokenLastUpdated: undefined
  })
  
  const modelSettings = ref<ModelSettings>({
  platform: 'DeepSeek',
  platformConfigs: {
    'DeepSeek': { baseUrl: '', apiKey: '', modelName: '' },
    '通义千问': { baseUrl: '', apiKey: '', modelName: '' },
    '硅基流动': { baseUrl: '', apiKey: '', modelName: '' }
  }
})

  const agentConfigVisible = ref(false)
  const cozeAgents = ref<CozeAgent[]>([])
  const editingAgent = ref<CozeAgent | null>(null)

  // 显示智能体配置
  const showAgentConfig = () => {
    editingAgent.value = null
    agentConfigVisible.value = true
  }

  const editAgent = (agent: CozeAgent) => {
    editingAgent.value = agent
    agentConfigVisible.value = true
  }

  watch(agentConfigVisible, (visible) => {
    if (!visible) editingAgent.value = null
  })
  
// 修改加载配置方法
const loadSettings = async () => {
  try {
    console.debug('开始加载配置...')
    const unavailableResult = { success: false, data: {} }
    const getPageConfig = (configType: string) => (
      !resolveSettingsConfigAvailable(
        configType,
        runtimeCapabilityStore.mode,
        runtimeCapabilityStore.snapshot?.platform
      )
        ? Promise.resolve(unavailableResult)
        : getConfig(configType)
    )
    const [agentsResult, cozeResult, modelResult,momentResult, greetingResult,chatHistoryResult,feishuConfig,difyResult,apiResult,restTimeResult] = await Promise.all([
      getPageConfig('agents'),
      getPageConfig('coze_settings'),
      getPageConfig('model_settings'),
      getPageConfig('moment_settings'),
      getPageConfig('greeting_config'),
      getPageConfig('chat_history_settings'),
      getPageConfig('feishu_settings'),
      getPageConfig('dify_settings'),
      getPageConfig('external_api_settings'),
      getPageConfig('rest_time_settings')
    ])
    // 处理 Dify 设置
    if (difyResult?.success && difyResult?.data) {
          difySettings.value = {
            baseUrl: difyResult.data.baseUrl
          }
        }
    /// 处理智能体配置
    if (agentsResult.success && agentsResult.data) {
      const agents = Array.isArray(agentsResult.data) ? agentsResult.data : 
                    Array.isArray(agentsResult.data.agents) ? agentsResult.data.agents : []
      
      // 添加类型注解并去重
      const uniqueAgents = new Map()
      agents.forEach((agent: { 
        name?: string, 
        botId?: string, 
        id?: string ,
        platform?: string,
        apiUrl?: string,
        apiToken?: string,
        hasApiToken?: boolean,
        deliveryMode?: 'sync_reply' | 'async_reply' | 'consume_only',
        responseFormat?: 'auto' | 'json' | 'sse',
        timeoutSeconds?: number,
        retryCount?: number
      }) => {
        if (agent.botId && !uniqueAgents.has(agent.botId)) {
          uniqueAgents.set(agent.botId, {
            name: agent.name || '',
            botId: agent.botId,
            id: agent.id,
            platform: agent.platform || 'coze',
            apiUrl: agent.apiUrl,
            apiToken: agent.apiToken,
            hasApiToken: agent.hasApiToken,
            deliveryMode: agent.deliveryMode,
            responseFormat: agent.responseFormat,
            timeoutSeconds: agent.timeoutSeconds,
            retryCount: agent.retryCount
          })
        }
      })
      
      cozeAgents.value = Array.from(uniqueAgents.values())
        .filter((agent: CozeAgent) => agent.name && agent.botId)
    }

    // 处理 Coze 设置
    if (cozeResult?.success && cozeResult?.data?.coze_settings) {
      cozeSettings.value = {
        token: cozeResult.data.coze_settings.token || '',
        hasToken: Boolean(
          cozeResult.data.coze_settings.hasToken ||
          cozeResult.data.coze_settings.token
        ),
        tokenLastUpdated: cozeResult.data.coze_settings.tokenLastUpdated // 加载最后更新日期
      };
      initialCozeToken.value = cozeSettings.value.token;
      initialCozeTokenLastUpdated.value = cozeSettings.value.tokenLastUpdated;
    }

    if (apiResult?.success && apiResult?.data?.identifier) {
      externalApiSettings.value.identifier = apiResult.data.identifier
    }
    // 处理模型设置
    if (modelResult.success && modelResult.data) {
      const savedSettings = modelResult.data.model_settings || {}
      
      // 合并保存的设置
      if (savedSettings.platformConfigs) {
        modelSettings.value = {
          platform: savedSettings.platform || 'DeepSeek',
          platformConfigs: {
            'DeepSeek': { baseUrl: '', apiKey: '', modelName: '' },
            '通义千问': { baseUrl: '', apiKey: '', modelName: '' },
            '硅基流动': { baseUrl: '', apiKey: '', modelName: '' },
            ...savedSettings.platformConfigs
          }
        }
      }
    }

     // 处理朋友圈设置
     if (momentResult.success && momentResult.data) {
      momentSettings.value = {
        ...momentSettings.value,
        ...momentResult.data.moment_settings
      }
    }
    // 处理打招呼话术配置
    if (greetingResult.success && greetingResult.data) {
      // console.debug("打招呼配置记录：",greetingResult)
      // 通过 provide/inject 或事件总线更新 GreetingConfig 组件的数据
      // 这里需要配合 GreetingConfig 组件的实现方式来修改
      emitter.emit('updateGreetingConfig', greetingResult.data)
    }
     // 处理聊天记录配置
     if (chatHistoryResult.success && chatHistoryResult.data) {
      const savedSettings = chatHistoryResult.data.chat_history_settings
      chatHistorySettings.value = {
        ...chatHistorySettings.value,
        ...savedSettings,
        autoSplitMode: ['none', 'double_newline', 'triple_newline'].includes(savedSettings?.autoSplitMode)
          ? savedSettings.autoSplitMode
          : 'double_newline',
        transferConfig: {
          ...chatHistorySettings.value.transferConfig,
          ...(savedSettings?.transferConfig || {})
        }
      }
    }

    // 加载飞书设置
    if (feishuConfig?.success && feishuConfig?.data?.feishu_settings) {
      feishuSettings.value = {
        appId: feishuConfig.data.feishu_settings.appId || '',
        appSecret: feishuConfig.data.feishu_settings.appSecret || '',
        phone: feishuConfig.data.feishu_settings.phone || ''
      }
    }
    if (restTimeResult?.success && restTimeResult?.data?.rest_time_settings) {
      restTimeSettings.value = {
        ...restTimeSettings.value,
        ...restTimeResult.data.rest_time_settings
      }
      startTimeDisplay.value = intervalToTime(restTimeSettings.value.startTime)
      endTimeDisplay.value = intervalToTime(restTimeSettings.value.endTime)
    }
    return true
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
    return false
  }
}

const handleSettingsImported = async () => {
  const refreshed = await loadSettings()
  if (!refreshed) throw new Error('配置页刷新失败')
  await nextTick()
}

  onBeforeMount(() => {
  loadSettings()
})
import mitt from 'mitt'
const emitter = mitt()
// 将 emitter 提供给子组件
provide('emitter', emitter)
// 打开外部链接
const openExternalLink = (url: string) => {
  window.open(url, '_blank')
}

// 获取平台图标扩展名
// 获取平台ID标签
const getPlatformIdLabel = (platform?: string) => {
  if (platform === 'coze3') return 'Project ID'
  if (platform === 'dify') return 'API 秘钥'
  if (platform === 'fireflow') return 'API Token'
  if (platform === 'agentic') return '智能体 ID'
  return 'Bot ID'
}
// 计算Token已绑定的天数
const daysTokenBound = computed(() => {
  if (cozeSettings.value.token && cozeSettings.value.tokenLastUpdated) {
    const lastUpdated = new Date(cozeSettings.value.tokenLastUpdated);
    const current = new Date();

    // 标准化到当天的开始时间进行比较
    const lastUpdatedStartOfDay = new Date(lastUpdated.getFullYear(), lastUpdated.getMonth(), lastUpdated.getDate());
    const currentStartOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());

    const diffTime = currentStartOfDay.getTime() - lastUpdatedStartOfDay.getTime();
    // 计算两个日期开始时间之间的完整天数差
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

    return diffDays + 1; // 返回 "第x天"
  }
  return 0; // 如果没有token或更新日期，则返回0
});

// 清除会话缓存相关方法
const showClearCacheDialog = () => {
  clearCacheDialogVisible.value = true
}

const handleClearCacheDialogClose = () => {
  clearCacheDialogVisible.value = false
}

const clearCozeCache = async () => {
  try {
    clearingCache.value = true
    
    // 调用后端API清除缓存文件
    const response = await fetch('/api/coze/clear-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'yoko_test'
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success('Coze会话缓存已清除')
      clearCacheDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '清除缓存失败')
    }
  } catch (error) {
    console.error('清除缓存失败:', error)
    ElMessage.error('清除缓存失败')
  } finally {
    clearingCache.value = false
  }
}
const benefitDialogVisible = ref(false)
const benefitLoading = ref(false)
const benefitInfo = ref<{ user_level?: string; effective?: { used?: number; total?: number } }>({})
const showBenefitDialog = async () => {
  if (!cozeSettings.value.token) return
  benefitDialogVisible.value = true
  benefitLoading.value = true
  try {
    const res = await fetch('/api/coze/benefits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'yoko_test'
      },
      body: JSON.stringify({ token: cozeSettings.value.token })
    })
    const data = await res.json()
    if (data.success) {
      benefitInfo.value = data
    } else {
      ElMessage.error(data.error || '查询失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    benefitLoading.value = false
  }
}
const levelLabel = computed(() => {
  const lv = benefitInfo.value.user_level || ''
  if (lv === 'free') return '个人免费版'
  if (lv === 'pro_personal') return '个人付费版'
  if (lv === 'team') return '企业标准版'
  if (lv === 'enterprise') return '企业旗舰版'
  return lv || '未知'
})
const levelTagType = computed(() => {
  const lv = benefitInfo.value.user_level || ''
  if (lv === 'free') return 'info'
  if (lv === 'pro_personal') return 'success'
  if (lv === 'team') return 'warning'
  if (lv === 'enterprise') return 'danger'
  return 'info'
})
const progressPercent = computed(() => {
  const used = benefitInfo.value.effective?.used || 0
  const total = benefitInfo.value.effective?.total || 0
  if (!total) return 0
  const p = Math.min(100, Math.max(0, Math.round((used / total) * 100)))
  return p
})
  // 组件挂载时加载设置
  onMounted(async () => {
    try {
      contentRef.value?.addEventListener('scroll', handleScroll)
      await loadSettings()
      await nextTick()
    } catch (error) {
      console.error('组件挂载时加载配置失败:', error)
    }
    if (isSettingsSectionAvailable('file-library-settings')) {
      loadFileLibrary()
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    // 添加鼠标事件监听
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    // 初始化显示值
    startTimeDisplay.value = intervalToTime(restTimeSettings.value.startTime)
    endTimeDisplay.value = intervalToTime(restTimeSettings.value.endTime)
    
  })
    // 组件卸载时移除事件监听
  onUnmounted(() => {
    contentRef.value?.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })
  
  </script>
  
  <style scoped>
  
  .setting-card {
  margin-bottom: 24px;
  flex-shrink: 0;
}
.setting-card :deep(.el-card__header) {
  padding: 0;
  border-bottom: 1px solid #ebeef5;
}
.collapsible-setting-card.is-collapsed :deep(.el-card__body) {
  display: none;
}
.collapsible-card-header {
  width: 100%;
  border: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
  appearance: none;
}
.collapsible-card-header:hover {
  background-color: #eef4fb;
}
.collapsible-card-header:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
.collapse-icon {
  color: #909399;
  transition: transform 0.2s ease;
}
.collapse-icon.expanded {
  transform: rotate(180deg);
}
.setting-card:last-child {
  margin-bottom: 0;
}
  /* 新增样式 */
.agents-list {
  margin-bottom: 20px;
}
.agent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #EBEEF5;
}
.agent-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.prompt-textarea :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
  padding: 12px;
}
.el-select {
  width: 100%;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f5f7fa;
  padding: 15px 20px;
}

.card-header span {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}
.el-tabs {
  margin-bottom: 20px;
}

.el-tab-pane {
  padding: 20px 0;
}
.agent-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.agent-item:last-child {
  border-bottom: none;
}
.settings-page-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.settings-nav {
  width: 160px;
  min-width: 160px;
  padding: 12px;
  border-right: 1px solid #eee;
  background: #fff;
  height: 100%;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
}

.settings-nav::-webkit-scrollbar {
  width: 0;
  height: 0;
}


.nav-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-backup-nav-entry {
  margin-top: auto;
  padding-top: 16px;
}

.settings-backup-mobile-entry {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
  order: -1;
}

.nav-item {
  padding: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.nav-item:hover {
  background: #f5f7fa;
}

.nav-item.active {
  background: #ecf5ff;
  color: #409eff;
}
.settings-page-container::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.settings-title {
  margin-bottom: 40px;
}
.settings-page-container::-webkit-scrollbar-thumb {
  background-color: transparent;
}
.nav-hidden {
  transform: translateX(-100%);
}
.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow-y: auto;
  height: 100%;
  transition: all 0.3s ease;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
#agent-settings {
  order: 10;
}
#greeting-settings {
  order: 20;
}
#chat-history-settings {
  order: 30;
}
#ai-settings {
  order: 40;
}
#voice-settings {
  order: 50;
}
#voice-library {
  order: 60;
}
#moment-settings {
  order: 70;
}
#feishu-settings {
  order: 80;
}
#file-library-settings {
  order: 90;
}
#rest-time-settings {
  order: 100;
}
.settings-content::-webkit-scrollbar {
  width: 0;
  height: 0;
}
/* 窄屏样式 */
.narrow-screen .settings-content {
  padding: 10px;
  width: 100%;
}
.narrow-screen .settings-nav {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}
.agent-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-botid {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}
.agent-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .setting-section {
    padding: 5px;
  }
  
  .setting-section h3 {
    margin-bottom: 20px;
    color: #606266;
  }

  .setting-section h4 {
    font-weight: 600;
    font-size: 15px;
    color: #303133;
    margin-bottom: 16px;
    background-color: #f5f7fa;
    padding: 12px 16px;
    margin: -5px -5px 5px -5px;
    border-bottom: 1px solid #ebeef5;
  }
  
  .actions {
    text-align: right;
    margin-top: 20px;
  }
  .tip-text {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
  margin-bottom: 4px;
  margin-left: 15px;
}
.chat-history-form-item {
  display: flex;
  align-items: center; /* 垂直居中 */
  width: 100%; /* 确保表单项占满整行 */
}
.setting-card .el-form-item {
  margin-bottom: 18px; /* 保持原有的下边距 */
}
.chat-history-form-item .el-switch {
  margin-left: auto; /* 关键：这会将开关组件推到 flex 容器的最右边 */
}
.token-reminder {
  color: red;
  font-size: 12px;
  margin-top: 5px;
  line-height: 1.2; /* 可选：调整行高使文字更清晰 */
}
.alert-form-item {
  width: 100%;
}

.alert-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.alert-container .form-item-label {
  flex-shrink: 0;
  min-width: 80px;
  font-size: 14px;
  color: #606266;
}

.alert-container .alert-input {
  flex: 1;
}
.transfer-form-item {
  display: flex;
  flex-direction: column;
  align-items: stretch; /* 改为 stretch 让子元素也填充宽度 */
  margin-bottom: 20px;
  width: 100%;
}
.transfer-title {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.transfer-title .form-item-label{
  margin-bottom: 0;
}

.transfer-description {
  margin: 8px 0 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.transfer-content {
  width: 100%;
}
.config-section {
  margin-bottom: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}
.config-section:last-child {
  margin-bottom: 0;
}
.phrases-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center; /* 改为垂直居中 */
  margin-bottom: 8px; /* 减小底部间距 */
}
.section-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.2;
}
.title-group {
  flex: 1;
}
.title-group h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.2;
}
.description {
  margin: 0 0 16px; /* 调整上下间距 */
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
  width: 100%; /* 确保描述文字占满整行 */
}
.form-item {
  margin-top: 16px;
}

.phrases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.phrase-input {
  width: 200px;
  margin-right: 8px;
  vertical-align: bottom;
}

.alert-form-item .form-item-label {
  font-size: 14px;
  color: #606266;
}

.alert-form-item .alert-input {
  width: 70%;
}
.form-item-content {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  margin-left: 8px;
}

.context-count-input {
  width: 120px;
  margin-right: 8px;
}
.platform-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: flex-start;
}

.platform-title-content {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  margin-left: -12px;
  transition: all 0.3s ease;
}

.platform-title-content:hover {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.platform-title-content:active {
  transform: scale(0.98);
}

.platform-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.clear-cache-btn {
  font-size: 12px;
  color: #909399;
  border-color: #d3d4d6;
  margin-left: auto;
}

.clear-cache-btn:hover {
  color: #606266;
  border-color: #c0c4cc;
}
  .benefit-btn {
    font-size: 12px;
    margin-left: auto;
  }
  .benefit-content {
    padding: 8px 0;
  }
  .benefit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .benefit-level .label {
    margin-right: 8px;
    color: #606266;
    font-size: 14px;
  }
  .benefit-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .stat-card {
    background: #f8f9fa;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  }
  .stat-title {
    font-size: 13px;
    color: #606266;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }

.clear-cache-content {
   padding: 16px 0;
 }
 
 .cache-warning-banner {
   margin-bottom: 0;
 }
 
 .cache-warning-text {
   line-height: 1.6;
   font-size: 14px;
   color: #E6A23C;
 }
.help-icon {
  color: #909399;
  cursor: pointer;
  font-size: 16px;
  &:hover {
    color: #409EFF;
  }
}
.default-tag {
  margin-right: 8px;
  height: 22px;
  line-height: 20px;
  display: flex;
  align-items: center;
}
.full-width {
  padding: 10px;
  width: 100%;
}
/* 外部api配置模块样式*/
.external-api-form {
  width: 100%;
}

.api-identifier-form-item {
  width: 100%;
}
.api-identifier-form-item .el-form-item__content {
  margin-left: 0 !important;
}
.api-identifier-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.api-identifier-container .form-item-label {
  flex-shrink: 0;
  min-width: 70px;
  font-size: 14px;
  color: #606266;
}
.api-identifier-input {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.api-identifier-input .el-input {
  flex: 1;
}

.test-connection-btn {
  min-width: 40px;
  padding: 8px;
  flex-shrink: 0;
}

.api-description {
  margin-bottom: 16px;
}
.connection-status-form-item {
  width: 100%;
}

.connection-status-form-item .el-form-item__content {
  margin-left: 0 !important;
}

.connection-status-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.connection-status-container .form-item-label {
  flex-shrink: 0;
  min-width: 80px;
  font-size: 14px;
  color: #606266;
}
/* 自定义信息提示框样式 */
.custom-info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  color: #606266;
}
.merge-mode-select {
  width: 150px;
  margin-right: 8px;
}

.interval-input {
  width: 120px;
  margin-right: 8px;
}
.info-icon {
  color: #409eff;
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
  text-align: left;
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
}

.info-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.info-text {
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
}
.rest-time-display {
  margin: 16px 0;
}

.current-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(to right, #e3f2fd, #f3e5f5);
  border-radius: 8px;
}

.setting-indicator {
  width: 12px;
  height: 12px;
  background-color: #f44336;
  border-radius: 50%;
}

.setting-label {
  font-size: 14px;
  color: #666;
}

.setting-value {
  font-weight: 600;
  color: #333;
}

.timeline-container {
  margin: 8px 0;
}

.timeline-wrapper {
  position: relative;
  margin: 12px 0;
}

.timeline-track {
  position: relative;
  height: 20px; /* 从 64px 减少到 20px */
  background-color: #f5f5f5;
  border-radius: 10px; /* 从 32px 减少到 10px，保持圆角比例 */
  cursor: pointer;
}

.enabled-range {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #4caf50, #66bb6a);
  border-radius: 10px; /* 从 32px 减少到 10px */
  opacity: 0.8;
}

.disabled-range {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(to right, #f44336, #ef5350);
  border-radius: 10px; /* 从 32px 减少到 10px */
}



.time-control {
  position: absolute;
  top: 50%;
  width: 16px; /* 从 24px 减少到 16px */
  height: 16px; /* 从 24px 减少到 16px */
  background-color: white;
  border: 2px solid #f44336; /* 从 3px 减少到 2px */
  border-radius: 50%;
  cursor: grab;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15); /* 减小阴影 */
  transition: transform 0.2s;
  z-index: 10;
}

.time-control:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.time-control:active {
  cursor: grabbing;
}

/* .time-tooltip {
  position: absolute;
  top: -28px; 
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  font-size: 11px; 
  padding: 3px 6px; 
  border-radius: 3px; 
  white-space: nowrap;
} */


.task-selection {
  margin: 16px 0; /* 从 24px 减少到 16px */
}

.selection-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.task-options {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.task-option {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.task-option:hover {
  background-color: #f9f9f9;
}

.task-checkbox {
  width: 20px;
  height: 20px;
  margin-right: 12px;
}

.task-icon {
  font-size: 20px;
  margin-right: 12px;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.applied-badge {
  font-size: 12px;
  color: #2196f3;
  background-color: #e3f2fd;
  padding: 2px 8px;
  border-radius: 12px;
}

.task-description {
  font-size: 14px;
  color: #666;
  margin-top: 12px;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 24px 0;
}

.time-input-group {
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
}

.time-select {
  width: 100%;
}

.quick-settings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
}

.quick-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.quick-btn {
  font-size: 14px;
  font-weight: 500;
}
/* 添加媒体查询 */
@media screen and (max-width: 650px) {
  .settings-content {
    padding: 10px;
  }
}
  </style>
