<template>
  <div class="stats-grid" :class="{ expanded: expanded }">
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-number">{{ stats.sessionCount }}</div>
        <div class="stat-label">服务用户数</div>
        <div class="stat-trend" :class="{ 'trend-up': stats.sessionIncrease >= 0, 'trend-down': stats.sessionIncrease < 0 }">
          {{ stats.sessionIncrease >= 0 ? '↗️' : '↘️' }} 
          {{ stats.sessionIncrease >= 0 ? '+' : '' }}{{ stats.sessionIncrease }}% 昨日
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-number">{{ stats.messageCount }}</div>
        <div class="stat-label">自动回复数</div>
        <div class="stat-trend" :class="{ 'trend-up': stats.messageIncrease >= 0, 'trend-down': stats.messageIncrease < 0 }">
          {{ stats.messageIncrease >= 0 ? '↗️' : '↘️' }} 
          {{ stats.messageIncrease >= 0 ? '+' : '' }}{{ stats.messageIncrease }}% 昨日
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-number">{{ stats.savedHours }}</div>
        <div class="stat-label">节省工时(小时)</div>
        <div class="stat-trend">
          💰 约节省 ¥{{ stats.savedMoney }}
        </div>
      </div>
    </div>
  </div>
</template>
  
  <script setup lang="ts">
  import { defineProps } from 'vue';
  
  interface Stats {
    sessionCount: number;
    sessionIncrease: number;
    messageCount: number;
    messageIncrease: number;
    savedHours: number;
    savedMoney: number;
  }
  
  const props = defineProps<{
    expanded: boolean;
    stats: Stats;
  }>();
  </script>
  
  <style scoped>
.stats-grid {
  display: flex;
  gap: 15px;
  padding: 0 15px 15px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.stats-grid.expanded {
  opacity: 1;
  max-height: 120px;
  transform: translateY(0);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 15px;
}

.stat-card {
  flex: 1;
  background: rgba(249, 250, 251, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 14px;
  color: #718096;
  margin-bottom: 3px;
}

.stat-trend {
  font-size: 12px;
  color: #48bb78;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.trend-up {
  color: #48bb78; /* 绿色，表示增长 */
}

.trend-down {
  color: #e53e3e; /* 红色，表示下降 */
}

@media (max-width: 768px) {
  .stats-grid.expanded {
    max-height: 120px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .stat-trend {
    font-size: 10px;
  }
}
</style>