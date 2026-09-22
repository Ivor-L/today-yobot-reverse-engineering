<template>
    <div class="multi-welcome-container">
      <div class="background-animation"></div>
      
      <div class="main-container">
        <!-- 左侧账号切换 & 底部操作按钮 -->
        <div class="sidebar">
          <div class="sidebar-top">
            <div class="sidebar-title">账号</div>
            <div
              v-for="instance in instances"
              :key="instance.instance_id"
              class="account-item"
              :class="{
                'active': instance.instance_id === activeInstanceId,
                'exited': instance.manually_exited
              }"
              @click="handleSwitchInstance(instance)"
              @contextmenu.prevent="handleInstanceContextMenu($event, instance)"
            >
              <span>{{ instance.nickname?.substring(0, 2) || '微信' }}</span>
              <div
                class="status-indicator"
                :class="{ 'offline': !instance.is_connected, 'exited': instance.manually_exited }"
              ></div>
            </div>

            <!-- 右键上下文菜单 -->
            <div
              v-if="contextMenu.visible"
              class="instance-context-menu"
              :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
              @click.stop
            >
              <div
                v-if="contextMenu.instance && !contextMenu.instance.manually_exited && contextMenu.instance.is_connected"
                class="context-menu-item danger"
                @click="handleExitManagement(contextMenu.instance!)"
              >
                退出托管
              </div>
              <div v-else class="context-menu-item disabled">
                {{ contextMenu.instance?.manually_exited ? '已退出托管' : '未初始化' }}
              </div>
            </div>
            <!-- 添加刷新按钮 -->
            <div class="refresh-button" @click="refreshInstances" :class="{'refreshing': isRefreshing}" :title="isRefreshing ? '正在刷新...' : '刷新账号列表'">
              <img 
                :src="getPngIconPath('refresh')" 
                alt="刷新" 
                class="refresh-icon" 
              />
            </div>
          </div>

          <!-- 底部操作按钮区 -->
          <div class="sidebar-actions">
            <div class="sidebar-btn" @click="showCustomerServiceDialog" v-if="!brandConfig.skipStartup" title="专属客服">
              <img :src="getPngIconPath('kefu_mail')" class="sidebar-icon-img" alt="客服" />
            </div>
            <div class="sidebar-btn" @click="showUnbindDialog" title="解绑账号">
              <img :src="getPngIconPath('unlink')" class="sidebar-icon-img" alt="解绑" />
            </div>
            <div class="sidebar-btn" @click="manualCheckUpdate" v-if="!brandConfig.skipStartup" title="版本更新">
              <img :src="getPngIconPath('update')" class="sidebar-icon-img" alt="更新" />
            </div>
            <div
              v-if="brandConfig.showRuntimeLog !== false"
              class="sidebar-btn"
              title="运行日志"
              @click="logDialogRef?.open()"
            >
              <el-icon class="sidebar-log-icon"><Document /></el-icon>
            </div>
            <div
              v-if="showYobotPromotion"
              class="sidebar-btn yobot-sidebar-btn"
              title="下载最新 YoBot 桌面AI助理"
              @click="yobotDialogVisible = true"
            >
              <img :src="yobotLogoUrl" class="yobot-sidebar-icon" alt="YoBot" />
              <span class="yobot-new-dot" aria-hidden="true"></span>
            </div>
          </div>
        </div>

        <!-- 右侧主要内容 -->
        <div class="content">
          <!-- ① TOP HEADER -->
          <div class="top-row">
            <div class="top-brand">
              <div class="brand-name">{{ brandConfig.alias || brandConfig.ename }}</div>
              <div class="brand-ver">v{{ version }}</div>
            </div>
            <div class="top-user">
              <div class="user-name">{{ currentInstance?.nickname || '用户' }}</div>
              <div class="user-status" :class="{ 'offline': !isConnected }">
                <div class="dot"></div>
                {{ isConnected ? '在线' : '离线' }}
                <el-button 
                  v-if="!isConnected"
                  type="info"
                  size="small"
                  link
                  style="margin-left: 8px; color: var(--tx-2);"
                  @click="handleReconnect"
                  :loading="reconnecting"
                >
                  重新连接
                </el-button>
              </div>
            </div>
          </div>

          <el-alert
            v-if="showTimeWarning"
            type="warning"
            show-icon
            class="time-warning-banner"
          >
            <span>检测到异常！电脑时间与实时时间偏差 {{ timeSkewSeconds }} 秒，请尽快联网校准设备时间</span>
          </el-alert>

          <!-- METRICS -->
          <div class="ac-metrics">
            <div
              class="ac-metric clickable-card"
              :class="{ 'capability-disabled': !isFeatureEnabled('customer.directory') }"
              :title="featureReason('customer.directory')"
              @click="goToCustomerManagement('friends')"
            >
              <div class="ac-metric-lbl">
                <svg viewBox="0 0 24 24" fill="var(--cyan)"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                好友数量
              </div>
              <div class="ac-metric-num c">{{ friendCount }}</div>
            </div>
            <div
              class="ac-metric clickable-card"
              :class="{ 'capability-disabled': !isFeatureEnabled('customer.directory') }"
              :title="featureReason('customer.directory')"
              @click="goToCustomerManagement('groups')"
            >
              <div class="ac-metric-lbl">
                <svg viewBox="0 0 24 24" fill="var(--blue)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                群聊数量
              </div>
              <div class="ac-metric-num b">{{ groupCount }}</div>
            </div>
          </div>

          <!-- ② TODAY DATA -->
          <div class="sec-label">今日数据 
            <span class="today-date">{{ todayDateString }}</span>
          </div>
          <div class="today-grid">

            <div class="op-card c1">
              <div class="op-head">
                <div class="op-icon"><svg viewBox="0 0 24 24" fill="var(--cyan)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>
                <div class="op-name">自动回复</div>
              </div>
              <div class="op-val">{{ todayStats.auto_reply }}</div>
            </div>

            <div class="op-card c2">
              <div class="op-head">
                <div class="op-icon"><svg viewBox="0 0 24 24" fill="var(--blue)"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                <div class="op-name">自动加人</div>
              </div>
              <div class="op-val">{{ todayStats.add_friend }}</div>
            </div>

            <div class="op-card c3">
              <div class="op-head">
                <div class="op-icon"><svg viewBox="0 0 24 24" fill="var(--green)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                <div class="op-name">通过好友</div>
              </div>
              <div class="op-val">{{ todayStats.friend_request }}</div>
            </div>

            <div class="op-card c4">
              <div class="op-head">
                <div class="op-icon"><svg viewBox="0 0 24 24" fill="var(--orange)"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></div>
                <div class="op-name">推送消息</div>
              </div>
              <div class="op-val">{{ todayStats.mass_sending }}</div>
            </div>

            <div class="op-card c5">
              <div class="op-head">
                <div class="op-icon"><svg viewBox="0 0 24 24" fill="var(--purple)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                <div class="op-name">朋友圈赞评</div>
              </div>
              <div class="op-val">{{ todayStats.moment_interaction }}</div>
            </div>

            <div class="op-card c6">
              <div class="op-head">
                <div class="op-icon"><svg viewBox="0 0 24 24" fill="var(--pink)"><path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg></div>
                <div class="op-name">自动跟单</div>
              </div>
              <div class="op-val">{{ todayStats.auto_follow }}</div>
            </div>

          </div>

          <!-- 核心指引区域 -->
          <div class="guide-container">
            <!-- 新人模式 -->
            <div v-if="isNewcomer" class="guide-mode newcomer">
              <div class="sec-label">新手启航：配置专属AI员工</div>
              
              <div class="guide-body">
                <!-- 左侧：步骤内容 -->
                <div class="step-content">
                  <div class="step-header-wrapper">
                    <div class="step-badge">{{ currentStepIndex + 1 }}</div>
                    <div class="step-title-large">
                      {{ newcomerSteps[currentStepIndex].title }}
                      <span v-if="!newcomerSteps[currentStepIndex].completed" class="warning-badge" title="未完成">⚠️</span>
                    </div>
                  </div>
                  
                  <div class="step-description" v-html="newcomerSteps[currentStepIndex].description"></div>
                  
                  <button
                    class="step-action-btn"
                    @click="handleStepAction(newcomerSteps[currentStepIndex])"
                    v-if="newcomerSteps[currentStepIndex].actionText"
                    :disabled="!isFeatureEnabled(newcomerSteps[currentStepIndex].featureId)"
                    :title="featureReason(newcomerSteps[currentStepIndex].featureId)"
                  >
                    {{ newcomerSteps[currentStepIndex].actionText }} ->
                  </button>
                </div>
                
                <!-- 右侧：步骤导航 -->
                <div class="step-nav">
                  <div 
                    v-for="(step, index) in newcomerSteps" 
                    :key="index"
                    class="step-nav-item"
                    :class="{ 'active': currentStepIndex === index, 'completed': step.completed }"
                    @click="currentStepIndex = index"
                  >
                    <div class="nav-radio">
                        <div class="nav-radio-inner" v-if="currentStepIndex === index || step.completed"></div>
                    </div>
                    <span class="nav-text">{{ index + 1 }}.{{ step.navTitle }}</span>
                    <span v-if="!step.completed" class="warning-icon" title="未完成">⚠️</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 更多玩法模式 -->
            <div v-else class="guide-mode advanced">
              <div class="sec-label">更多AI自动化玩法</div>
              
              <div class="guide-body">
                <!-- 左侧：玩法内容 -->
                <div class="step-content">
                  <div class="step-header-wrapper">
                    <div class="step-badge">{{ currentFeatureIndex + 1 }}</div>
                    <div class="step-title-large">{{ advancedFeatures[currentFeatureIndex].title }}</div>
                  </div>
                  
                  <div class="step-description" v-html="advancedFeatures[currentFeatureIndex].description"></div>
                  
                  <button
                    class="step-action-btn"
                    @click="handleFeatureAction(advancedFeatures[currentFeatureIndex])"
                    v-if="advancedFeatures[currentFeatureIndex].actionText"
                    :disabled="!isFeatureEnabled(advancedFeatures[currentFeatureIndex].featureId)"
                    :title="featureReason(advancedFeatures[currentFeatureIndex].featureId)"
                  >
                    {{ advancedFeatures[currentFeatureIndex].actionText }} ->
                  </button>
                </div>
                
                <!-- 右侧：玩法列表 -->
                <div class="step-nav">
                  <div 
                    v-for="(feature, index) in advancedFeatures" 
                    :key="index"
                    class="step-nav-item"
                    :class="{ 'active': currentFeatureIndex === index }"
                    @click="currentFeatureIndex = index"
                  >
                    <div class="nav-radio">
                        <div class="nav-radio-inner" v-if="currentFeatureIndex === index"></div>
                    </div>
                    <span class="nav-text">{{ feature.navTitle }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Yoko助理跳转入口 (仅default渠道) -->
          <div class="assistant-entry" v-if=showYobotPromotion @click="openAiAssistant">
            <div class="assistant-content">
              <div class="assistant-info">
                <img :src="getPngIconPath('offial_kefu')" class="assistant-icon" alt="AI助理" />
                <span class="assistant-title">遇到问题？问在线AI助理</span>
              </div>
              <span class="assistant-link">助理Yoko ></span>
            </div>
          </div>

          <!-- 版权信息 - 仅在配置了copyright字段时显示 -->
          <div v-if="brandConfig.copyright" class="copyright-info">
            <span class="copyright-text">{{ brandConfig.copyright }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- YoBot 产品迁移入口（仅 default 渠道） -->
    <el-dialog
      v-model="yobotDialogVisible"
      width="600px"
      align-center
      :show-close="false"
      class="yobot-dialog"
    >
      <div class="yobot-dialog-shell">
        <button
          type="button"
          class="yobot-dialog-close"
          aria-label="关闭"
          @click="yobotDialogVisible = false"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div class="yobot-dialog-hero">
          <div class="yobot-dialog-logo"><img :src="yobotLogoUrl" alt="YoBot" /></div>
          <div class="yobot-dialog-heading">
            <div class="yobot-eyebrow">YOKOAGI</div>
            <h2>YoBot 桌面 AI 助理</h2>
            <p>从逐项操作功能，到直接告诉 Agent 你想完成什么。</p>
          </div>
          <div class="yobot-dialog-tags">
            <span>更易用</span><span>更智能</span><span>更开放</span>
          </div>
        </div>

        <div class="yobot-dialog-body">
          <div class="yobot-feature-list">
            <div class="yobot-feature-item">
              <div class="yobot-feature-icon feature-chat">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.8A2.8 2.8 0 016.8 3h10.4A2.8 2.8 0 0120 5.8v6.4a2.8 2.8 0 01-2.8 2.8H11l-4.8 4v-4A2.8 2.8 0 014 12.2V5.8z" /><path d="M8 8h8M8 11h5" /></svg>
              </div>
              <div>
                <h3>和 Agent 对话，机器人就能执行</h3>
                <p>不用逐页寻找功能，说出目标即可开始操作，新手几分钟就能上手。</p>
              </div>
            </div>
            <div class="yobot-feature-item">
              <div class="yobot-feature-icon feature-skill">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 4.5A3.5 3.5 0 1112 8V4.5a3.5 3.5 0 117 0V8h.5a3.5 3.5 0 110 7H19v4.5h-4.5V19a3.5 3.5 0 10-7 0v.5H3V15h.5a3.5 3.5 0 100-7H3V4.5h5.5z" /></svg>
              </div>
              <div>
                <h3>组合 Skills，承载更多场景化 SOP</h3>
                <p>把运营经验沉淀为可复用流程，让复杂业务按标准步骤稳定执行。</p>
              </div>
            </div>
            <div class="yobot-feature-item">
              <div class="yobot-feature-icon feature-mcp">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M7.5 11l9-4M7.5 13l9 4" /></svg>
              </div>
              <div>
                <h3>RPA 能力作为 MCP，对外开放</h3>
                <p>你的龙虾、WorkBuddy、Codex 等 Agent，也能直接调用机器人自动化能力。</p>
              </div>
            </div>
          </div>

          <div class="yobot-migration-note">
            <span class="yobot-note-check">✓</span>
            <span><strong>完整融合现有 YokoAI 机器人能力</strong>，升级使用方式，不改变你的业务目标。</span>
          </div>

          <button type="button" class="yobot-download-btn" @click="openYobotWebsite">
            前往 YoBot 官网下载
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
          </button>
          <div class="yobot-site-text">yobot.yokoagi.com</div>
        </div>
      </div>
    </el-dialog>

    <!-- 添加解绑对话框 -->
    <el-dialog
      v-model="unbindDialogVisible"
      title="提示：请谨慎解绑，一旦解绑不可恢复"
      width="400px"
      class="unbind-dialog"
    >
      <div class="unbind-content">
        <p class="machine-code-info">本机机器码：  {{ machineCode }}</p>
        <el-form>
          <el-form-item label="您的激活码：">
            <el-input 
              v-model="activationCode" 
              placeholder="请输入激活码"
              :maxlength="54"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="unbindDialogVisible = false">取消</el-button>
          <el-button 
            type="danger" 
            @click="executeUnbind"
          >
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 二次确认对话框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认解绑"
      width="300px"
    >
      <p>确定要解绑当前设备吗？此操作不可恢复！</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="executeUnbind">确认解绑</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 更新对话框 -->
    <el-dialog
      v-model="updateDialogVisible"
      :title="updateInfo.is_mandatory ? '强制更新' : '发现新版本'"
      width="450px"
      :close-on-click-modal="!updateInfo.is_mandatory"
      :close-on-press-escape="!updateInfo.is_mandatory"
      :show-close="!updateInfo.is_mandatory"
      class="update-dialog"
    >
      <div class="update-content">
        <div class="update-header">
          <img :src="getPngIconPath('update')" alt="更新" class="update-icon" />
          <div class="update-title">
            <h3>软件更新</h3>
            <p class="update-subtitle">发现新版本可用</p>
          </div>
        </div>
        
        <div class="version-info">
          <div class="version-item">
            <span class="version-label">最新版本:</span>
            <span class="version-value latest">v{{ updateInfo.latest_version }}</span>
          </div>
          <div class="version-item">
            <span class="version-label">发布日期:</span>
            <span class="version-value">{{ formatDate(updateInfo.release_date) }}</span>
          </div>
        </div>
        
        <div class="changelog">
          <h4>更新内容:</h4>
          <div class="changelog-content" v-html="formatChangelog(updateInfo.changelog)"></div>
        </div>
        
        <!-- 有 installer_url 时的下载引导（zip 用户=迁移，installer 用户=升级；都不走 zip 就地更新） -->
        <el-alert
          v-if="migrateToInstaller"
          type="info"
          :closable="false"
          show-icon
          :title="installChannel === 'zip' ? '升级为更稳定的安装器版本' : '有新版本可用'"
          description="点击下方「下载安装器」下载并运行安装即可完成升级；登录状态、激活与数据都会自动保留。"
          style="margin-top: 8px"
        />

        <el-progress
          v-if="updating && !migrateToInstaller"
          :percentage="updateProgress"
          :format="progressFormat"
          :stroke-width="10"
          class="update-progress"
        ></el-progress>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button
            v-if="!updateInfo.is_mandatory"
            @click="updateDialogVisible = false"
          >稍后更新</el-button>
          <!-- 该版本有安装器：所有用户都引导下载安装器；无安装器时才走原 zip 就地更新 -->
          <el-button
            v-if="migrateToInstaller"
            type="primary"
            @click="openInstaller"
          >下载安装器</el-button>
          <el-button
            v-else
            type="primary"
            @click="startUpdate"
            :loading="updating"
            :disabled="updating"
          >{{ updating ? '更新中' : '立即更新' }}</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 客服对话框 -->
    <el-dialog
      v-model="customerServiceDialogVisible"
      title="专属客服"
      width="400px"
    >
    <div class="customer-service-content">
      <!-- 根据联系方式类型显示不同内容 -->
      <div v-if="brandConfig.contactType === 'qrcode' && brandConfig.qrcodeUrl" 
          class="qrcode-container">
        <img 
          :src="brandConfig.qrcodeUrl" 
          alt="客服二维码"
          class="customer-qrcode"
          @error="handleQrcodeError"
        />
        <p class="customer-service-contact">{{ brandConfig.contact }}</p>
      </div>
      
      <!-- 默认文本联系方式 -->
      <div v-else class="text-contact-container">
        <div class="contact-icon">
          <span style="font-size: 100px;">📞</span>
        </div>
        <p class="customer-service-contact">客服联系方式：{{ brandConfig.contact }}</p>
      </div>
    </div>
    <template #footer>
        <span class="dialog-footer">
          <!-- 根据联系方式类型显示不同按钮 -->
          <el-button v-if="brandConfig.contactType !== 'qrcode'" 
                    type="primary" 
                    @click="copyContactInfo">复制联系方式</el-button>
          <el-button v-else 
                    type="primary" 
                    @click="saveQrcode">保存二维码</el-button>
          <el-button @click="customerServiceDialogVisible = false">关闭</el-button>
        </span>
    </template>
    </el-dialog>

    <!-- 运行日志弹窗（入口在左侧栏「运行日志」按钮，通过 ref 打开） -->
    <LogViewerDialog v-if="brandConfig.showRuntimeLog !== false" ref="logDialogRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, inject, computed, Ref, onUnmounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogViewerDialog from '../components/LogViewerDialog.vue'
import { API_BASE_URL, headers } from '../api/config'
import { ElMessage } from 'element-plus'
import { 
  reconnectWeChat, 
  checkConnectionStatus, 
  getLicenseInfo, 
  unbindLicense, 
  checkVersion, 
  downloadUpdate, 
  getVersionNotify, 
  saveVersionNotify,
  getAllInstances,
  switchActiveInstance,
  exitInstanceManagement,
  getServerTime,
  InstanceInfo,
  getGuideStatus // 导入新API
} from '../api/init'
import { useUserStore, UserInfo } from '../store/user'
import { version } from '../../package.json'
import type { BrandConfig } from '@/config/brand'
import { shouldShowYobotPromotion, YOBOT_WEBSITE_URL } from '@/config/brand'
import { getPngIconPath } from '@/utils/iconImages'
import { runtimeCapabilityReasonCodeText } from '@/runtime/capabilities'
import { useRuntimeCapabilityPresentation } from '@/composables/useRuntimeCapabilityPresentation'

const router = useRouter()
const route = useRoute()
const {
  isFeatureEnabled,
  featureReason,
  requireFeature,
  isMacStrictRuntime
} = useRuntimeCapabilityPresentation()

interface WelcomeGuideEntry {
  navTitle: string
  title: string
  description: string
  actionText: string
  featureId: string
  route: string
  completed?: boolean
  url?: string
}

watch(
  () => [route.query.capabilityBlocked, route.query.reasonCode],
  ([blocked, reasonCode]) => {
    if (typeof blocked !== 'string') return
    ElMessage.warning(runtimeCapabilityReasonCodeText(
      typeof reasonCode === 'string' ? reasonCode : null
    ))
  },
  { immediate: true }
)

const brandConfig = inject<Ref<BrandConfig>>('brandConfig', ref({
  channel_id:'channel_000001',
  name: 'Yoko微信机器人',
  ename: 'YokoAIBot',
  logo: '/assets/logo.png',
  contact: '473726474@qq.com',
  version: '1.0.9'
}))

const showYobotPromotion = shouldShowYobotPromotion()
const yobotDialogVisible = ref(false)
const yobotLogoUrl = './icon-png/yobot_logo.png'  

const openYobotWebsite = () => {
  window.open(YOBOT_WEBSITE_URL, '_blank', 'noopener')
}

// 实例相关状态
const instances = ref<InstanceInfo[]>([])
const activeInstanceId = ref('')

// 右键上下文菜单状态
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  instance: null as InstanceInfo | null
})
const currentInstance = computed(() => {
  return instances.value.find(inst => inst.instance_id === activeInstanceId.value)
})

// 用户信息相关状态
// const nickname = computed(() => currentInstance.value?.nickname || '用户')
const friendCount = ref(0)
const groupCount = ref(0)
const isConnected = ref(true)
const reconnecting = ref(false)

const goToCustomerManagement = (tab: string) => {
  if (!requireFeature('customer.directory')) return
  router.push({
    name: 'CustomerManagement',
    query: { tab }
  })
}

const userStore = useUserStore()

// 今日数据统计
const todayDateString = computed(() => {
  const d = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  const day = days[d.getDay()]
  return `${year}-${month}-${date} · ${day}`
})

const todayStats = reactive({
  auto_reply: 0,
  add_friend: 0,
  friend_request: 0,
  mass_sending: 0,
  moment_interaction: 0,
  auto_follow: 0
})

const fetchTodayStats = async () => {
  try {
    const activeInstance = instances.value.find(inst => inst.is_active)
    const accountId = activeInstance?.account_id || ''
    
    let url = '/api/tasks/stats/today'
    if (accountId) {
      url += `?account_id=${encodeURIComponent(accountId)}`
    }
    
    const res = await fetch(url, {
      headers: {
        ...headers,
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    })
    const data = await res.json()
    if (data.success && data.data) {
      Object.assign(todayStats, data.data)
    }
  } catch (error) {
    console.error('获取今日统计数据失败:', error)
  }
}

// 解绑相关状态
const unbindDialogVisible = ref(false)
const confirmDialogVisible = ref(false)
const machineCode = ref('')
const activationCode = ref('')

// 更新相关状态
const updateDialogVisible = ref(false)
const updateInfo = ref({
  needs_update: false,
  latest_version: '',
  download_url: '',
  installer_url: '' as string | null,
  changelog: '',
  is_mandatory: false,
  release_date: ''
})
const updating = ref(false)
const updateProgress = ref(0)
const updateChecked = ref(false)

// 运行日志弹窗组件 ref（侧栏「运行日志」按钮点击时调用其 open()）
const logDialogRef = ref()

// 安装渠道（zip / installer）：用于决定是否引导迁移到安装器
const installChannel = ref<string>('zip')
const fetchInstallChannel = async (): Promise<string> => {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/system/install-channel`, { headers })
    const data = await resp.json()
    return data.channel || 'zip'
  } catch {
    return 'zip'
  }
}
// 该版本提供了安装器地址 且 本机是 zip 装 → 引导迁移到安装器（不再走 zip 就地更新）
// 只要该版本提供了 installer_url，就引导下载安装器完成升级：
//   · zip 装的用户 = 迁移到安装器；· installer 装的用户 = 正常升级（下载新安装器覆盖安装）。
// 关键：installer 用户【绝不能】走 zip 就地更新，否则会被 zip 包覆盖、掉回 zip 模式。
const migrateToInstaller = computed(() => !!updateInfo.value.installer_url)
// 打开系统浏览器下载安装器（webview 内 window.open 不可靠，走后端）
const openInstaller = async () => {
  const url = updateInfo.value.installer_url
  if (!url) return
  try {
    await fetch(`${API_BASE_URL}/api/system/open-browser`, {
      method: 'POST', headers, body: JSON.stringify({ url })
    })
    ElMessage.success('已在浏览器打开安装器下载，下载后运行安装即可完成升级')
  } catch {
    ElMessage.error('打开下载失败，请手动复制链接下载：' + url)
  }
}

// 客服对话框状态
const customerServiceDialogVisible = ref(false)
// 处理二维码加载错误
const handleQrcodeError = () => {
  ElMessage.error('二维码加载失败，请联系客服')
}

// ===================== 新人指引 & 更多玩法逻辑 =====================

const isNewcomer = ref(true)
const currentStepIndex = ref(0)
const hasInitializedStep = ref(false) // 新增：标记是否已初始化步骤
const currentFeatureIndex = ref(0)
let guidePollTimer: any = null
let statsPollTimer: any = null

const newcomerSteps = reactive<WelcomeGuideEntry[]>([
  {
    navTitle: '同步通讯录',
    title: '同步通讯录',
    description: '1.打开客户管理 -> 配置 -> 点击[同步]按钮。<br>2.同步好友耗时较长，建议先只同步一次群聊。<br><br>欢迎页每5分钟会自动刷新数据',
    actionText: '立即同步',
    completed: false,
    featureId: 'customer.sync',
    route: '/customer-management'
  },
  {
    navTitle: '配置Token',
    title: '配置Token',
    description: '1.打开<a href="https://www.coze.cn" target="_blank">coze.cn</a>，左侧点击扣子编程-> API & SDK<br>2.点击页面顶部“授权” ，在第二行切换“服务身份及凭证”<br>3.点击右侧“添加”即可，添加后记得复制token',
    actionText: '去配置',
    completed: false,
    featureId: 'settings.common',
    route: '/settings'
  },
  {
    navTitle: '绑定智能体',
    title: '绑定智能体',
    description: '1.打开<a href="https://www.coze.cn" target="_blank">coze.cn</a>，左侧点击扣子编程->页面最右边点击“回到旧版”<br>2.创建完智能体后，发布（记得发布渠道勾选“API”）<br>3.复制智能体的ID，在机器人配置页中绑定',
    actionText: '去绑定',
    completed: false,
    featureId: 'settings.common',
    route: '/settings'
  },
  {
    navTitle: '创建AI员工',
    title: '创建AI员工',
    description: '1.打开AI销冠，点击右上角“AI助理配置”<br>2.添加助理，选择完配置后保存即可',
    actionText: '去创建',
    completed: false,
    featureId: 'auto_reply.text',
    route: '/ai-chat'
  }
])

const advancedFeatures = reactive<WelcomeGuideEntry[]>([
  {
    navTitle: 'AI朋友圈运营',
    title: 'AI朋友圈运营',
    description: '1.打开SOP自动化 -> 自动点评朋友圈，设置30分钟循环点评朋友圈，激活老客户。<br>2.打开朋友圈 -> 创建自动发圈任务，适合朋友圈心智建立。',
    actionText: '去发圈',
    featureId: 'moments.publish',
    route: '/moments'
  },
  {
    navTitle: '客户自动跟单',
    title: '客户自动跟单',
    description: '跟进新客户，智能体生成动态跟进话术：<br>1.客户管理页，选择需要跟进的好友；<br>2.点击自动跟单，设置跟进频率和智能体；<br>创建跟单任务',
    actionText: '去设置',
    featureId: 'automation.auto_follow',
    route: '/customer-management' // 假设SOP在这个路由
  },
  {
    navTitle: '群发消息',
    title: '群发消息',
    description: '支持按好友标签、群聊进行批量消息发送：<br>方式一：客户管理页，勾选好友和群聊，创建推送任务；<br>方式一：自动化SOP -> 推送，点击顶部创建<br><span style="color: #f56c6c; font-weight: bold;">注意：控制推送的频率</span>',
    actionText: '去群发',
    featureId: 'automation.mass_send',
    route: '/auto-add' // 假设群发也在SOP或独立页面
  },
  // {
  //   navTitle: '自动添加好友',
  //   title: '自动添加好友',
  //   description: '批量导入号码或自动通过好友请求，快速扩充私域流量池。',
  //   actionText: '去添加',
  //   route: '/auto-add'
  // },
  {
    navTitle: '手机远程控制',
    title: '手机远程控制',
    description: '给微信文件传输助手发送指令可远程控制：<br>1.开启/暂停：开启或暂停AI自动回复<br>2.解除挂起：解除客户的挂起状态<br>3.启用 xxx：远程启用某个AI助理',
    actionText: '', // 可能是说明性质，无跳转
    featureId: 'welcome.shell',
    route: ''
  }
])

const fetchGuideStatus = async () => {
  try {
    const res = await getGuideStatus()
    if (res.success) {
      isNewcomer.value = res.is_newcomer
      
      // 更新步骤状态
      if (res.steps) {
        newcomerSteps[0].completed = res.steps.step1
        newcomerSteps[1].completed = res.steps.step2
        newcomerSteps[2].completed = res.steps.step3
        newcomerSteps[3].completed = res.steps.step4
        
        // 动态设置默认步骤：仅在首次加载时执行
        if (!hasInitializedStep.value && isNewcomer.value) {
            const firstIncomplete = newcomerSteps.findIndex(s => !s.completed)
            if (firstIncomplete !== -1) {
                // 有未完成的步骤，跳转到第一个未完成的步骤
                currentStepIndex.value = firstIncomplete
            } else {
                // 所有步骤已完成，展示最后一步
                currentStepIndex.value = newcomerSteps.length - 1
            }
            hasInitializedStep.value = true
        }
      }
    }
  } catch (e) {
    console.error('获取指引状态失败', e)
  }
}

const handleStepAction = (step: WelcomeGuideEntry) => {
  if (!requireFeature(step.featureId)) return
  if (step.route) {
    router.push(step.route)
  } else if (step.url) {
    window.open(step.url, '_blank')
  }
}

const handleFeatureAction = (feature: WelcomeGuideEntry) => {
  if (!requireFeature(feature.featureId)) return
  if (feature.route) {
    router.push(feature.route)
  }
}

// ==============================================================

// 保存二维码到本地
const saveQrcode = async () => {
  if (!brandConfig.value.qrcodeUrl) {
    ElMessage.warning('二维码链接不存在')
    return
  }
  
  try {
    // 创建下载链接
    const link = document.createElement('a')
    link.href = brandConfig.value.qrcodeUrl
    link.download = `${brandConfig.value.name}_客服二维码.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success('二维码已保存到下载文件夹')
  } catch (error) {
    console.error('保存二维码失败:', error)
    ElMessage.error('保存失败，请右键图片另存为')
  }
}
// 显示客服对话框
const showCustomerServiceDialog = () => {
  customerServiceDialogVisible.value = true
}
// 复制联系方式
const copyContactInfo = () => {
  if (brandConfig.value.contact) {
    navigator.clipboard.writeText(brandConfig.value.contact)
      .then(() => {
        ElMessage.success('联系方式已复制到剪贴板')
      })
      .catch(err => {
        console.error('复制失败:', err)
        ElMessage.error('复制失败，请手动复制')
      })
  } else {
    ElMessage.warning('联系方式为空')
  }
}
// 显示解绑对话框
const showUnbindDialog = async () => {
  try {
    const result = await getLicenseInfo()
    if (result.success) {
      machineCode.value = result.data.machine_code
      unbindDialogVisible.value = true
    } else {
      ElMessage.error(result.error || '获取授权信息失败')
    }
  } catch (error) {
    ElMessage.error('获取授权信息失败')
  }
}

// 执行解绑
const executeUnbind = async () => {
  try {
    const result = await unbindLicense(activationCode.value)
    if (result.success) {
      ElMessage.success('解绑成功，应用即将关闭')
      // 应用会自动关闭，不需要额外处理
    } else {
      ElMessage.error(result.message || '解绑失败')
    }
  } catch (error) {
    ElMessage.error('解绑失败')
  } finally {
    confirmDialogVisible.value = false
    unbindDialogVisible.value = false
  }
}

// 检查连接状态
const checkStatus = async () => {
  try {
    const data = await checkConnectionStatus()
    isConnected.value = data.connected
    if (!data.connected) {
      ElMessage.warning(`连接状态: ${data.reason}`)
    }
  } catch (error) {
    console.error('检查连接状态失败:', error)
    isConnected.value = false
  }
}

// 重新连接
const handleReconnect = async () => {
  try {
    reconnecting.value = true
    const result = await reconnectWeChat(activeInstanceId.value)
    if (result.success) {
      ElMessage.success('重新连接成功')
      isConnected.value = true
      // 更新用户信息
      if (result.user_info) {
        userStore.setUserInfo(result.user_info)
      }
      // 刷新实例列表
      await loadInstances()
    } else {
      ElMessage.error(result.error || '重新连接失败')
    }
  } catch (error) {
    ElMessage.error('重新连接失败: ' + error)
  } finally {
    reconnecting.value = false
  }
}

// 切换微信实例
const handleSwitchInstance = async (instance: InstanceInfo) => {
  try {
    if (instance.is_active) {
      return // 已经是活动实例，不需要切换
    }
    const result = await switchActiveInstance(instance.instance_id)
    console.debug('切换结果:', result)
    if (result.success) {
      if (!instance.manually_exited) {
        ElMessage.success('成功切换微信号')
      }
      activeInstanceId.value = instance.instance_id
      
      // 更新实例列表
      await loadInstances()
      
      // 更新用户信息，从instance字段获取数据
      if (result.instance) {
        friendCount.value = result.instance.friend_count || 0
        groupCount.value = result.instance.group_count || 0
        userStore.setUserInfo({
          nickname: result.instance.nickname,
          account_id: result.instance.account_id,
          friendCount: result.instance.friend_count,
          groupCount: result.instance.group_count
        })
        // 更新最后获取时间，避免重复获取
        userStore.$state.lastFetchTime = Date.now()
      }
      
      // 检查连接状态
      await checkStatus()
      
      // 获取今日数据统计
      await fetchTodayStats()
    } else {
      ElMessage.error(result.error || '切换实例失败')
    }
  } catch (error) {
    console.error('切换实例失败:', error)
    ElMessage.error('切换实例失败')
  }
}

// 打开右键菜单
const handleInstanceContextMenu = (event: MouseEvent, instance: InstanceInfo) => {
  contextMenu.visible = true
  contextMenu.instance = instance
  // 防止菜单超出侧边栏右边界，直接显示在鼠标右侧
  contextMenu.x = event.clientX + 4
  contextMenu.y = event.clientY
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenu.visible = false
  contextMenu.instance = null
}

// 退出托管
const handleExitManagement = async (instance: InstanceInfo) => {
  closeContextMenu()
  try {
    await exitInstanceManagement(instance.instance_id)
    ElMessage.success(`已退出托管：${instance.nickname || '该实例'}`)
    await loadInstances()
    // 若退出的是当前活动实例，立即同步右侧连接状态，无需等待 checkStatus API
    if (instance.instance_id === activeInstanceId.value) {
      isConnected.value = false
    }
  } catch (error) {
    ElMessage.error('退出托管失败: ' + error)
  }
}

// 加载微信实例列表
const loadInstances = async () => {
  try {
    const result = await getAllInstances();
    console.debug('加载微信实例列表结果:', result);
    if (result.success) {
      instances.value = result.instances.map((inst: InstanceInfo) => ({
        ...inst,
        // 确保从 account_info 中获取昵称和账号ID（如果存在）
        nickname: inst.nickname || (inst.account_info?.nickname) || '微信',
        account_id: inst.account_id || (inst.account_info?.account_id) || '',
        is_connected: inst.is_connected ?? true,
        manually_exited: inst.manually_exited ?? false
      }));
      
      // 设置当前活动实例
      const activeInstance = instances.value.find(inst => inst.is_active);
      if (activeInstance) {
        activeInstanceId.value = activeInstance.instance_id;
      }
    } else {
      ElMessage.error(result.error || '获取实例列表失败');
    }
  } catch (error) {
    console.error('获取实例列表失败:', error);
    ElMessage.error('获取实例列表失败');
  }
}

// 初始化多微信实例
const initializeMultiInstances = async () => {
  try {
    const result = await getAllInstances();
    console.debug('初始化多微信实例结果:', result);
    if (result.success) {
      instances.value = result.instances.map((inst: InstanceInfo) => ({
        ...inst,
        // 确保从 account_info 中获取昵称和账号ID（如果存在）
        nickname: inst.nickname || (inst.account_info?.nickname) || '微信',
        account_id: inst.account_id || (inst.account_info?.account_id) || '',
        is_connected: inst.is_connected ?? true,
        manually_exited: inst.manually_exited ?? false
      }));
      
      // 设置当前活动实例
      if (result.instances.length > 0) {
        const activeInstance = result.instances.find((inst: InstanceInfo) => inst.is_active) || result.instances[0];
        activeInstanceId.value = activeInstance.instance_id;
      }
      
      return true;
    } else {
      ElMessage.error(result.message || '获取微信实例失败');
      return false;
    }
  } catch (error) {
    console.error('获取微信实例失败:', error);
    ElMessage.error('获取微信实例失败');
    return false;
  }
}

// 手动检查更新
const manualCheckUpdate = async () => {
  try {
    // 获取当前代理商ID
    const agentId = brandConfig.value.channel_id || 'default'
    const result = await checkVersion(version, agentId)
    
    if (result.success) {
      if (result.data.needs_update) {
        updateInfo.value = result.data
        // 该版本提供了安装器地址时，探一次本机安装渠道，决定是否引导迁移到安装器
        if (result.data.installer_url) {
          installChannel.value = await fetchInstallChannel()
        }
        updateDialogVisible.value = true
      } else {
        ElMessage.success('当前已是最新版本')
      }
    } else {
      ElMessage.error(result.error || '检查更新失败')
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    ElMessage.error('检查更新失败')
  }
}

// 格式化更新日志
const formatChangelog = (changelog: string) => {
  if (!changelog) return ''
  return changelog.replace(/\n/g, '<br>')
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 进度条格式化
const progressFormat = (percentage: number) => {
  return percentage === 100 ? '准备重启' : `${percentage}%`
}

// 开始更新
const startUpdate = async () => {
  try {
    updating.value = true
    updateProgress.value = 0
    
    // 模拟下载进度
    const progressInterval = setInterval(() => {
      if (updateProgress.value < 90) {
        updateProgress.value += 10
      }
    }, 500)
    
    // 获取当前代理商ID
    const agentId = brandConfig.value.channel_id || 'default'
    
    // 调用下载更新API
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 60000)
    })
    const result = await Promise.race([downloadUpdate(version, agentId), timeoutPromise])
    
    clearInterval(progressInterval)
    
    if ((result as any).success) {
      updateProgress.value = 100
      const logFile = (result as any).log_file
      ElMessage.success(`更新已下载，应用将在几秒后重启${logFile ? '（日志：'+ logFile +'）' : ''}`)
      setTimeout(() => {
        if (updating.value) {
          ElMessage.warning('自动重启可能失败，请手动关闭并重新打开应用')
          updating.value = false
        }
      }, 20000)
    } else {
      const err = (result as any).error || ''
      const logFile = (result as any).log_file
      if (err === 'invalid_update_package' || /zip/i.test(err)) {
        ElMessage.error(`更新包为空或已损坏，请稍后重试${logFile ? '（日志：'+ logFile +'）' : ''}`)
      } else if (err === 'permission_denied') {
        ElMessage.error(`更新失败：当前目录无写入权限，请使用管理员权限运行或关闭安全软件后重试${logFile ? '（日志：'+ logFile +'）' : ''}`)
      } else {
        ElMessage.error(((result as any).error || '更新失败') + (logFile ? '（日志：'+ logFile +'）' : ''))
      }
      updating.value = false
    }
  } catch (error) {
    if ((error as Error)?.message === 'timeout') {
      ElMessage.error('下载超时，请检查网络后重试')
    } else {
      ElMessage.error('更新失败')
    }
    updating.value = false
  }
}

// 检查版本更新
const checkForUpdates = async () => {
  // Mac 的应用更新由 YokoAgent / Darwin updater 所有，RPA Host 不探测
  // Windows 版本更新接口。
  if (isMacStrictRuntime.value) return
  // 如果配置了跳过启动页（如default_rpa），则不自动检查更新
  if (brandConfig.value.skipStartup) return

  if (updateChecked.value) return
  
  try {
    // 获取当前代理商ID
    const agentId = brandConfig.value.channel_id || 'default'
    const result = await checkVersion(version, agentId)
    
    if (result.success && result.data.needs_update) {
      updateInfo.value = result.data
      
      // 检查是否是强制更新
      if (result.data.is_mandatory) {
        // 强制更新总是显示
        updateDialogVisible.value = true
      } else {
        // 非强制更新，检查是否已经提示过
        const notifyResult = await getVersionNotify()
        if (notifyResult.success) {
          const notifiedVersions = notifyResult.data.notified_versions || []
          if (!notifiedVersions.includes(result.data.latest_version)) {
            // 未提示过的版本，显示更新弹窗
            updateDialogVisible.value = true
            // 记录已提示版本
            notifiedVersions.push(result.data.latest_version)
            await saveVersionNotify({ notified_versions: notifiedVersions })
          }
        } else {
          // 获取配置失败，默认显示更新弹窗
          updateDialogVisible.value = true
        }
      }
    }
    updateChecked.value = true
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}

// 获取当前用户信息
const fetchUserInfo = async () => {
  try {
    // 获取当前活跃实例的账号ID
    const activeInstance = instances.value.find(inst => inst.is_active);
    const currentAccountId = activeInstance?.account_id || '';
    
    // 检查当前活跃实例的账号ID与缓存中的是否一致
    const cachedAccountId = userStore.userInfo?.account_id || '';
    const forceRefresh = currentAccountId !== '' && cachedAccountId !== '' && currentAccountId !== cachedAccountId;
    
    if (forceRefresh) {
      console.debug('检测到账号切换，强制刷新用户信息');
    }
    
    // 使用store中的缓存机制，如果账号ID不一致则强制刷新
    const userInfo = await userStore.fetchUserInfo(forceRefresh);
    console.debug('获取用户信息:', userInfo);
    if (userInfo) {
      friendCount.value = (userInfo as UserInfo).friendCount || 0;
      groupCount.value = (userInfo as UserInfo).groupCount || 0;
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}
const isRefreshing = ref(false)
// 刷新账号列表和状态
const refreshInstances = async () => {
  // 如果正在刷新中，则不执行
  if (isRefreshing.value) {
    return
  }
  
  try {
    isRefreshing.value = true
    ElMessage.info('正在刷新...')
    
    // 执行与 onMounted 相同的初始化动作
    // 初始化多微信实例
    const initSuccess = await initializeMultiInstances()
    
    if (initSuccess) {
      // 获取当前用户信息
      await fetchUserInfo()
      
      // 检查连接状态
      await checkStatus()
    }
    
    ElMessage.success('刷新完成')
  } catch (error) {
    console.error('刷新失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    isRefreshing.value = false
  }
}
onMounted(async () => {
  document.addEventListener('click', closeContextMenu)
  try {
    console.time('多开欢迎页-总加载时间')
    // 初始化多微信实例
    const initSuccess = await initializeMultiInstances()
    // 预加载SVG图片
    if (initSuccess) {
      // 获取当前用户信息
      await fetchUserInfo()
      
      // 检查连接状态
      await checkStatus()
      
      // 获取今日数据统计
      await fetchTodayStats()
      
      // 检查更新
      if (!isMacStrictRuntime.value) await checkForUpdates()
    }
    if (!isMacStrictRuntime.value) {
      try {
        const res = await getServerTime()
        const iso = (res && res.success) ? (res.authority_time || res.server_time) : null
        if (iso) {
          const serverMs = new Date(iso).getTime()
          const localMs = Date.now()
          const diff = Math.abs(localMs - serverMs)
          timeSkewSeconds.value = Math.round(diff / 1000)
          showTimeWarning.value = diff > 60000
        }
      } catch (e) {}
    }
    
    // 获取指引状态
    if (!isMacStrictRuntime.value) {
      await fetchGuideStatus()
      // 每5分钟轮询一次状态
      guidePollTimer = setInterval(fetchGuideStatus, 5 * 60 * 1000)
    }

    // 定时刷新统计数据 (1分钟)
    statsPollTimer = setInterval(fetchTodayStats, 60000)

    console.timeEnd('多开欢迎页-总加载时间')
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('初始化失败')
  }
})

onUnmounted(() => {
  if (guidePollTimer) {
    clearInterval(guidePollTimer)
  }
  if (statsPollTimer) {
    clearInterval(statsPollTimer)
  }
  document.removeEventListener('click', closeContextMenu)
})

defineOptions({
  name: 'MultiWelcomePage'
})

const showTimeWarning = ref(false)
const timeSkewSeconds = ref(0)

// AI助理卡片相关
const isDefaultChannel = computed(() => {
  return brandConfig.value.channel_id === 'default' || brandConfig.value.channel_id === 'channel_000001'
})

const openAiAssistant = () => {
  window.open('https://www.coze.cn/s/kzzkO7cEzq8/', '_blank')
}
</script>

<style scoped>
.multi-welcome-container {
  height: 100%;
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #2c3e50, #4a5568, #2d3748);
}

.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #2c3e50, #4a5568, #2d3748);
  z-index: 0;
}

.main-container {
  display: flex;
  gap: 12px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  z-index: 1;
  height: 100%; /* 修改为 100%，不再使用固定的 calc */
  padding: 10px 10px; /* 如果需要上下边距，可以用 padding 替代高度减法 */
  box-sizing: border-box;
  overflow: hidden; /* 修改：防止整体滚动 */
}
/* 添加Webkit浏览器的滚动条隐藏 */
.main-container::-webkit-scrollbar {
  display: none;
}
/* 左侧账号切换 */
.sidebar {
  width: 80px;
  background: transparent;
  backdrop-filter: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 15px;
}
.sidebar-top {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
}
.sidebar-top::-webkit-scrollbar {
  display: none;
}
.sidebar-title {
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  color: #7f8c8d;
  margin-bottom: 15px;
}
.account-item {
  position: relative;
  width: 50px;
  height: 50px;
  margin: 15px auto;
  border-radius: 50%;
  background: linear-gradient(45deg, #ffa726, #fb8c00);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.account-item:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(255, 167, 38, 0.4);
}

.account-item.active {
  transform: scale(1.15);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.5);
  background: linear-gradient(45deg, #4facfe, #00f2fe);
}

.status-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4caf50;
  border: 2px solid white;
  animation: pulse 2s infinite;
}

.status-indicator.offline {
  background: #f44336;
  animation: none;
}

.status-indicator.exited {
  background: #bdbdbd;
  animation: none;
}

/* 已退出托管的实例：整体灰化 */
.account-item.exited {
  background: #bdbdbd;
  color: #9e9e9e;
  box-shadow: none;
  filter: grayscale(1);
  opacity: 0.65;
  cursor: default;
}

.account-item.exited:hover {
  transform: none;
  box-shadow: none;
}

.account-item.exited.active {
  background: #bdbdbd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 右键上下文菜单 */
.instance-context-menu {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 120px;
  overflow: hidden;
}

.context-menu-item {
  padding: 10px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.context-menu-item:hover {
  background: #f5f7fa;
}

.context-menu-item.danger {
  color: #f56c6c;
}

.context-menu-item.danger:hover {
  background: #fef0f0;
}

.context-menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

.sidebar-actions {
  background: #ffffff;
  border-radius: 20px;
  padding: 15px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.sidebar-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f5f7fa;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid transparent;
}

/* 分割线 - 移除 */
.sidebar-btn:not(:last-child)::after {
  content: none;
}

.sidebar-btn:hover {
  background: #ecf5ff;
  border-color: #d9ecff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.sidebar-icon-img {
  width: 24px;
  height: 24px;
  transition: all 0.3s ease;
}

.sidebar-log-icon {
  font-size: 24px;
  color: #5b6577;
  transition: all 0.3s ease;
}

.sidebar-btn:hover .sidebar-icon-img {
  transform: scale(1.1);
}

.yobot-sidebar-btn {
  background: #f5f7fa;
  border-color: transparent;
  box-shadow: none;
}
.yobot-sidebar-btn:hover {
  background: #ecf5ff;
  border-color: #d9ecff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}
.yobot-sidebar-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 7px;
  transition: transform 0.3s ease;
}
.yobot-sidebar-btn:hover .yobot-sidebar-icon {
  transform: scale(1.08);
}
.yobot-new-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6f8cff;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 3px rgba(111, 140, 255, 0.18);
}

/* YoBot 产品迁移弹窗 */
:deep(.yobot-dialog) {
  width: min(600px, calc(100vw - 32px)) !important;
  padding: 0;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(12, 18, 43, 0.34);
}
:deep(.yobot-dialog .el-dialog__header) {
  display: none;
}
:deep(.yobot-dialog .el-dialog__body) {
  padding: 0;
}
.yobot-dialog-shell {
  position: relative;
  overflow: hidden;
}
.yobot-dialog-close {
  position: absolute;
  z-index: 3;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 50%;
  color: rgba(255,255,255,0.72);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.yobot-dialog-close:hover {
  color: #fff;
  background: rgba(255,255,255,0.16);
}
.yobot-dialog-close svg {
  width: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.yobot-dialog-hero {
  position: relative;
  min-height: 150px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 28px 30px 25px;
  color: #fff;
  background:
    radial-gradient(circle at 86% 15%, rgba(106, 124, 255, 0.45), transparent 34%),
    radial-gradient(circle at 10% 100%, rgba(43, 192, 255, 0.2), transparent 36%),
    linear-gradient(135deg, #0a0d17 0%, #121a31 58%, #17112d 100%);
}
.yobot-dialog-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background-image: linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(to right, transparent, #000);
  pointer-events: none;
}
.yobot-dialog-logo {
  position: relative;
  z-index: 1;
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 22px;
  background: rgba(0,0,0,0.45);
  box-shadow: 0 12px 32px rgba(0,0,0,0.34), 0 0 0 6px rgba(255,255,255,0.04);
}
.yobot-dialog-logo img {
  width: 68px;
  height: 68px;
  object-fit: contain;
}
.yobot-dialog-heading {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}
.yobot-eyebrow {
  margin-bottom: 5px;
  color: #8fa6ff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
}
.yobot-dialog-heading h2 {
  margin: 0 0 7px;
  color: #fff;
  font-size: 25px;
  line-height: 1.2;
}
.yobot-dialog-heading p {
  margin: 0;
  color: rgba(255,255,255,0.66);
  font-size: 13px;
  line-height: 1.6;
}
.yobot-dialog-tags {
  position: absolute;
  z-index: 2;
  right: 28px;
  bottom: 15px;
  display: flex;
  gap: 6px;
}
.yobot-dialog-tags span {
  padding: 3px 8px;
  border: 1px solid rgba(143,166,255,0.24);
  border-radius: 10px;
  color: #b7c5ff;
  background: rgba(87,105,209,0.12);
  font-size: 10px;
}
.yobot-dialog-body {
  padding: 20px 28px 22px;
}
.yobot-feature-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.yobot-feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 13px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.yobot-feature-item:hover {
  border-color: #e8ebf7;
  background: #f8f9fd;
  transform: translateX(3px);
}
.yobot-feature-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.yobot-feature-icon svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.feature-chat { color: #3f73f1; background: #edf3ff; }
.feature-skill { color: #7555dc; background: #f2efff; }
.feature-mcp { color: #078e83; background: #eafaf6; }
.yobot-feature-item h3 {
  margin: 0 0 3px;
  color: #20283a;
  font-size: 14px;
  line-height: 20px;
}
.yobot-feature-item p {
  margin: 0;
  color: #788092;
  font-size: 12px;
  line-height: 18px;
}
.yobot-migration-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 14px 0;
  padding: 10px 13px;
  border: 1px solid #dae5ff;
  border-radius: 11px;
  color: #536078;
  background: linear-gradient(90deg, #f3f7ff, #f8f9ff);
  font-size: 12px;
}
.yobot-migration-note strong { color: #294fba; }
.yobot-note-check {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  background: #4f75e5;
  font-size: 12px;
  font-weight: 800;
}
.yobot-download-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(100deg, #4169e1, #6b58dc);
  box-shadow: 0 8px 20px rgba(72, 86, 201, 0.25);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.yobot-download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 11px 24px rgba(72, 86, 201, 0.34);
}
.yobot-download-btn svg {
  width: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.yobot-site-text {
  margin-top: 8px;
  color: #a2a8b5;
  font-size: 10px;
  text-align: center;
  letter-spacing: 0.4px;
}

@media (max-width: 560px) {
  .yobot-dialog-hero { padding: 24px 22px; }
  .yobot-dialog-logo { width: 64px; height: 64px; flex-basis: 64px; border-radius: 18px; }
  .yobot-dialog-logo img { width: 57px; height: 57px; }
  .yobot-dialog-heading h2 { font-size: 21px; }
  .yobot-dialog-tags { display: none; }
  .yobot-dialog-body { padding: 18px; }
}

.content {
  flex: 1;
  background: #f5f7fa;
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow-y: auto; /* 修改：添加垂直滚动 */
  display: flex;
  flex-direction: column;
}
/* 自定义滚动条样式 */
.content::-webkit-scrollbar {
  width: 6px;
  display: block;
}
.content::-webkit-scrollbar-track {
  background: transparent;
}
.content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
.content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #4facfe, #00f2fe, #4facfe);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

/* 顶部信息区 */
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 10px;
}
.top-brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.brand-name {
  font-weight: bold;
  color: #2c3e50;
  font-size: 20px;
}
.brand-ver {
  font-size: 12px;
  color: #7f8c8d;
}
.top-user {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-name {
  color: #409eff;
  font-size: 16px;
  font-weight: bold;
}
.user-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4caf50;
}
.user-status.offline {
  color: #f44336;
}
.user-status .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

/* 指标卡片 */
.ac-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.ac-metric {
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.ac-metric.clickable-card {
  cursor: pointer;
}
.ac-metric.clickable-card.capability-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.ac-metric.clickable-card.capability-disabled:hover {
  transform: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}
.ac-metric:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
.ac-metric-lbl {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ac-metric-lbl svg { width: 14px; height: 14px; }
.ac-metric-num {
  font-family: 'DM Mono', monospace, sans-serif;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
}
.ac-metric-num.c { color: #4facfe; }
.ac-metric-num.b { color: #00f2fe; }

/* 今日数据 */
.sec-label {
  font-size: 13px;
  font-weight: 600;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.sec-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #ebeef5;
}
.today-date {
  font-size: 11px;
  font-weight: normal;
  color: #c0c4cc;
}

.today-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.op-card {
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
}
.op-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: var(--c, transparent); opacity: 0; transition: opacity .3s;
}
.op-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border-color: var(--c, #ebeef5);
}
.op-card:hover::after { opacity: 1; }

.op-card.c1{--c:#4facfe}   .op-card.c2{--c:#3b82f6}
.op-card.c3{--c:#10b981}  .op-card.c4{--c:#f59e0b}
.op-card.c5{--c:#8b5cf6} .op-card.c6{--c:#ec4899}

.op-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.op-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--ic-bg);
  border: 1px solid var(--ic-bd);
  display: flex;
  align-items: center;
  justify-content: center;
}
.op-icon svg { width: 14px; height: 14px; }

.op-card.c1 .op-icon{--ic-bg:rgba(79,172,254,.1);--ic-bd:rgba(79,172,254,.2)}
.op-card.c2 .op-icon{--ic-bg:rgba(59,130,246,.1);--ic-bd:rgba(59,130,246,.2)}
.op-card.c3 .op-icon{--ic-bg:rgba(16,185,129,.1);--ic-bd:rgba(16,185,129,.2)}
.op-card.c4 .op-icon{--ic-bg:rgba(245,158,11,.1);--ic-bd:rgba(245,158,11,.2)}
.op-card.c5 .op-icon{--ic-bg:rgba(139,92,246,.1);--ic-bd:rgba(139,92,246,.2)}
.op-card.c6 .op-icon{--ic-bg:rgba(236,72,153,.1);--ic-bd:rgba(236,72,153,.2)}

.op-val {
  font-family: 'DM Mono', monospace, sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}
.op-name {
  font-size: 13px;
  color: #606266;
}

/* 指引区域样式 */
.guide-container {
  flex: 1;
  background: transparent; /* 去掉整个区域的白色背景和阴影，因为我们用了 sec-label */
  margin-bottom: 10px;
  overflow: hidden;
  display: flex;
  min-height: 0; /* 防止flex子项溢出 */
}

.guide-mode {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.guide-body {
  display: flex;
  flex: 1;
  gap: 15px;
  min-height: 0; /* 关键：允许flex容器内滚动/收缩 */
}

.step-content {
  flex: 1;
  background: #ffffff; /* 给内容区添加白底 */
  border-radius: 12px;
  padding: 15px;
  border: 1px solid #ebeef5; /* 增加边框，统一风格 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  min-height: 160px; /* 减小最小高度 */
}

.step-header-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.step-badge {
  width: 24px;
  height: 24px;
  background: #4facfe;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(79, 172, 254, 0.3);
  margin-right: 10px;
  flex-shrink: 0;
}

.step-title-large {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  line-height: 24px;
  margin: 0;
}

.step-description {
  margin-left: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.9;
  margin-bottom: 15px;
}

.step-description :deep(a) {
  color: #4facfe;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.step-description :deep(a):hover {
  text-decoration: underline;
  color: #00f2fe;
}

.step-action-btn {
  align-self: flex-end;
  width: fit-content;
  padding: 8px 20px;
  font-size: 13px;
  border-radius: 6px;
  background: #2c3e50;
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.step-action-btn:hover {
  background: #34495e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.3);
}

.step-action-btn:disabled,
.step-action-btn:disabled:hover {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  box-shadow: none;
}

.step-nav {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: #ffffff;
  border-radius: 12px;
  padding: 10px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}

.step-nav-item {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #909399;
}

.step-nav-item:hover {
  background: #f5f7fa;
}

.step-nav-item.active {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  color: #4facfe;
  font-weight: bold;
}

.nav-radio {
  width: 16px;
  height: 16px;
  border: 2px solid #dcdfe6;
  border-radius: 50%;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-nav-item.active .nav-radio {
  border-color: #4facfe;
}

.nav-radio-inner {
  width: 8px;
  height: 8px;
  background: #4facfe;
  border-radius: 50%;
}

.step-nav-item.completed .nav-radio {
  border-color: #67c23a;
  background: #67c23a;
}

.step-nav-item.completed .nav-radio-inner {
  background: transparent;
  width: 5px;
  height: 9px;
  border-bottom: 2px solid white;
  border-right: 2px solid white;
  border-radius: 0;
  transform: rotate(45deg);
  margin-top: -2px;
}

.nav-text {
  font-size: 14px;
}

/* Yoko助理入口 */
.assistant-entry {
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 6px;
}

.assistant-entry:hover {
  border-color: #4facfe;
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.1);
}

.assistant-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assistant-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.assistant-icon {
  width: 28px;
  height: 28px;
  animation: icon-shake 3s infinite ease-in-out;
  transform-origin: center bottom;
}

@keyframes icon-shake {
  0%, 100% { transform: rotate(0deg); }
  10% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  30% { transform: rotate(6deg); }
  40% { transform: rotate(-6deg); }
  50% { transform: rotate(3deg); }
  60% { transform: rotate(-3deg); }
  70% { transform: rotate(0deg); }
}

.assistant-title {
  font-weight: bold;
  color: #2c3e50;
  font-size: 16px;
}

.assistant-link {
  color: #7f8c8d;
  font-size: 14px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 25px;
  border-radius: 25px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(45deg, #4facfe, #00f2fe);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.btn-secondary {
  background: white;
  color: #4facfe;
  border: 2px solid #4facfe;
}

.btn-secondary:hover {
  background: #4facfe;
  color: white;
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #7f8c8d;
  border: 2px solid #e0e0e0;
}

.btn-outline:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
}

/* 客服对话框样式 */
.customer-service-content {
  text-align: center;
  padding: 20px 0;
}

.customer-service-qrcode {
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-img {
  max-width: 100%;
  max-height: 100%;
}

.customer-service-tip {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
}

.customer-service-contact {
  font-size: 16px;
  margin-top: 10px;
  color: #333;
}

/* 解绑对话框样式 */
.unbind-content {
  padding: 10px 0;
}
.machine-code-info {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px 15px;
  margin-bottom: 20px;
  color: #606266;
  font-size: 14px;
  border-left: 3px solid #409EFF;
}
.unbind-content .el-form-item__label {
  font-weight: 500;
  color: #606266;
}
.unbind-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
}
.unbind-dialog :deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.unbind-dialog :deep(.el-dialog__body) {
  padding: 20px 25px;
}
.unbind-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
  background-color: #f8f9fa;
  border-radius: 0 0 8px 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.dialog-footer .el-button--danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  transition: all 0.3s ease;
}
.dialog-footer .el-button--danger:hover {
  background-color: #f78989;
  border-color: #f78989;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}
/* 更新对话框样式 */
.update-content {
  margin-bottom: 20px;
}

.update-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
}

.update-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.update-icon {
  width: 48px;
  height: 48px;
  margin-right: 15px;
}

.update-title {
  flex: 1;
}

.update-title h3 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 18px;
}

.update-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.version-info {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
}

.version-item {
  display: flex;
  margin-bottom: 8px;
}

.version-item:last-child {
  margin-bottom: 0;
}
.refresh-button {
  width: 30px;
  height: 30px;
  margin: 15px auto 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #7f8c8d; /* 确保图标有颜色 */
  font-size: 20px;
  background-color: transparent;
}
.refresh-icon {
  width: 30px;
  height: 30px;
  transition: all 0.3s ease;
}
.refresh-button:hover {
  transform: rotate(180deg);
  color: #4facfe;
  border-color: #4facfe;
}
.refresh-button:hover .refresh-icon {
  filter: invert(60%) sepia(75%) saturate(5017%) hue-rotate(195deg) brightness(101%) contrast(101%);
}
.refresh-button.refreshing {
  animation: rotating 2s linear infinite;
  color: #4facfe;
  cursor: not-allowed;
  border-color: #4facfe;
}
.refresh-button.refreshing .refresh-icon {
  filter: invert(60%) sepia(75%) saturate(5017%) hue-rotate(195deg) brightness(101%) contrast(101%);
}
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.version-label {
  width: 80px;
  color: #606266;
  font-weight: 500;
}

.version-value {
  flex: 1;
  color: #303133;
}

.version-value.current {
  color: #909399;
}

.version-value.latest {
  color: #67C23A;
  font-weight: 500;
}

.changelog {
  margin-top: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  background-color: #fafafa;
}

.changelog h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #303133;
  font-size: 16px;
}

.changelog-content {
  max-height: 150px;
  overflow-y: auto;
  color: #606266;
  line-height: 1.6;
  padding-right: 5px;
}

.update-progress {
  margin-top: 20px;
}
.copyright-info {
  text-align: center;
  padding: 0;
  margin-top: 5px;
}

.copyright-text {
  font-size: 12px;
  color: #909399;
  opacity: 0.8;
  font-weight: 400;
  letter-spacing: 0.5px;
}
@media (max-width: 580px) {
  .step-nav {
    display: none;
  }
}

/* 响应式设计 */
@media (max-width: 500px) {
  .main-container {
    flex-direction: column;
    padding: 20px;
  }
  .copyright-info {
    margin-top: 20px;
    padding: 10px 0;
  }
  
  .copyright-text {
    font-size: 11px;
  }
  .sidebar {
    width: 100%;
    display: flex;
    justify-content: flex-start; /* 改为靠左对齐 */
    padding: 15px 10px; /* 增加左右内边距 */
    align-items: center; /* 垂直方向不居中 */
    overflow-x: auto; /* 允许水平滚动 */
    flex-direction: row;
  }

  .sidebar-top {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .sidebar-actions {
    display: flex;
    flex-direction: row;
    padding-bottom: 0;
    margin-left: auto;
  }

  .sidebar-title {
    margin-bottom: 0;
    margin-right: 10px;
    display: flex;
    align-items: center;
    height: 50px;
  }

  .account-item {
    margin: 0 10px 0 0; /* 只保留右边距 */
  }
  
  .refresh-button {
    margin: 5px 0 5px 10px; /* 调整刷新按钮的边距 */
    width: 36px;
    height: 36px;
  }

  .content {
    padding: 30px 20px;
  }

  .stats-container {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .guide-body {
    flex-direction: column-reverse;
  }
  
  .step-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
}

/* 警示图标动画 */
.warning-icon {
  margin-left: auto;
  font-size: 14px;
  animation: pulse-warning 2s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning-badge {
  margin-left: 8px;
  font-size: 16px;
  animation: pulse-warning 2s infinite;
  display: inline-flex;
  vertical-align: middle;
}

@keyframes pulse-warning {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
