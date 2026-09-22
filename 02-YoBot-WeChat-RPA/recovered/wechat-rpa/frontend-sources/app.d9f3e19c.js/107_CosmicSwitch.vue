<template>
    <div class="cosmic-toggle" :class="{ 'is-disabled': disabled }">
      <input type="checkbox" class="toggle" :id="id" v-model="localValue" :disabled="disabled" @change="handleChange" />
      <label :for="id" class="slider">
        <div class="cosmos"></div>
        <div class="toggle-orb">
          <div class="inner-orb">
            <div class="ring"></div>
          </div>
        </div>
        <div class="particles">
          <div class="particle" style="--angle: 0deg"></div>
          <div class="particle" style="--angle: 60deg"></div>
          <div class="particle" style="--angle: 120deg"></div>
          <div class="particle" style="--angle: 180deg"></div>
          <div class="particle" style="--angle: 240deg"></div>
          <div class="particle" style="--angle: 300deg"></div>
        </div>
      </label>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, computed } from 'vue';
  import { v4 as uuidv4 } from 'uuid'; // 如果项目中没有uuid，需要安装：npm install uuid
  
  // 定义props
  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    },
    activeText: {
      type: String,
      default: '停止任务'
    },
    inactiveText: {
      type: String,
      default: '启动任务'
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  });
  
  // 定义事件
  const emit = defineEmits(['update:modelValue', 'change']);
  
  // 生成唯一ID
  const id = computed(() => `cosmic-switch-${uuidv4().substring(0, 8)}`);
  
  // 本地值
  const localValue = ref(props.modelValue);
  
  // 监听props变化
  watch(() => props.modelValue, (newVal) => {
    localValue.value = newVal;
  });
  
  // 监听本地值变化
  watch(localValue, (newVal) => {
    emit('update:modelValue', newVal);
  });
  
  // 处理变化事件
  const handleChange = () => {
    if (props.loading || props.disabled) {
      // 如果正在加载，恢复原值
      localValue.value = props.modelValue;
      return;
    }
    emit('change', localValue.value);
  };
  </script>
  
  <style scoped>
  /* 基于Uiverse.io by manish-sherawat的宇宙主题开关，适配YokoWebot项目 */ 
  .cosmic-toggle {
    position: relative;
    width: 95px;
    height: 34px;
    transform-style: preserve-3d;
    perspective: 500px;
    display: inline-block;
  }

  .cosmic-toggle.is-disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .cosmic-toggle.is-disabled .slider {
    cursor: not-allowed;
  }
  
  .toggle {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, #DCDFE6, #F2F6FC); /* 浅灰色渐变，与项目风格一致 */
    border-radius: 16px;
    transition: 0.5s;
    transform-style: preserve-3d;
    box-shadow:
      0 0 10px rgba(0, 0, 0, 0.1),
      inset 0 0 5px rgba(255, 255, 255, 0.1);
    overflow: hidden;
    border: 1px solid #C0C4CC;
  }
  
  .slider::before {
    content: attr(data-inactive-text, "启动任务");
    position: absolute;
    right: 9px;
    top: 50%; /* 改为50% */
    transform: translateY(-50%); /* 添加垂直居中变换 */
    font-size: 12px;
    color: #409EFF;
    font-weight: 500;
    z-index: 1;
    }
  
  .toggle:checked + .slider::before {
    content: attr(data-active-text, "停止任务");
    left: 9px;
    right: auto;
    color: white;
  }
  
  .cosmos {
    position: absolute;
    inset: 0;
    background: radial-gradient(1px 1px at 10% 10%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 20% 20%, #ffffff 100%, transparent),
      radial-gradient(2px 2px at 30% 30%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 40% 40%, #ffffff 100%, transparent),
      radial-gradient(2px 2px at 50% 50%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 60% 60%, #ffffff 100%, transparent),
      radial-gradient(2px 2px at 70% 70%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 80% 80%, #ffffff 100%, transparent),
      radial-gradient(1px 1px at 90% 90%, #ffffff 100%, transparent);
    background-size: 200% 200%;
    opacity: 0; /* 初始状态不显示星空效果 */
    transition: 0.5s;
  }
  
  .toggle-orb {
    position: absolute;
    height: 28px;
    width: 28px;
    left: 2px;
    bottom: 2px;
    background: linear-gradient(145deg, #DCDFE6, #F2F6FC); /* 浅灰色渐变 */
    border-radius: 50%;
    transition: 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transform-style: preserve-3d;
    z-index: 2;
    border: 1px solid #C0C4CC;
  }
  
  .inner-orb {
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    background: linear-gradient(
      145deg,
      #ffffff,
      #e6e6e6
    ); /* 白色到浅灰色 */
    transition: 0.5s;
    overflow: hidden;
  }
  
  .inner-orb::before {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(
      from 0deg,
      transparent 0deg,
      rgba(0, 0, 0, 0.1) 10deg,
      transparent 20deg
    );
    animation: none; /* 初始状态不显示动画 */
  }
  
  .ring {
    position: absolute;
    inset: -2px;
    border: 1px solid rgba(64, 158, 255, 0.3); /* 使用项目主色调 */
    border-radius: 50%;
    transition: 0.5s;
  }
  
  /* 开关打开状态 */
  .toggle:checked + .slider {
    background: linear-gradient(
      45deg,
      #409EFF,
      #79bbff
    ); /* 蓝色渐变，与项目风格一致 */
  }
  
  .toggle:checked + .slider .toggle-orb {
    transform: translateX(63px) rotate(360deg);
    background: linear-gradient(
      145deg,
      #409EFF,
      #79bbff
    ); /* 蓝色渐变 */
  }
  
  .toggle:checked + .slider .inner-orb {
    background: linear-gradient(
      145deg,
      #e6e6e6,
      #ffffff
    ); /* 浅灰色到白色 */
    transform: scale(0.9);
  }
  
  .toggle:checked + .slider .ring {
    border-color: rgba(255, 255, 255, 0.5); /* 更亮的边框 */
    animation: ringPulse 2s infinite;
  }
  
  /* 只有在开启状态才显示星空和动画效果 */
  .toggle:checked + .slider .cosmos {
    opacity: 0.2;
    animation: cosmosPan 20s linear infinite;
  }
  
  .toggle:checked + .slider .inner-orb::before {
    animation: patternRotate 10s linear infinite;
  }
  
  .particles {
    position: absolute;
    width: 100%;
    height: 100%;
  }
  
  .particle {
    position: absolute;
    width: 2px;
    height: 2px;
    background: #409EFF; /* 蓝色粒子 */
    border-radius: 50%;
    opacity: 0;
  }
  
  .toggle:checked + .slider .particle {
    animation: particleBurst 1s ease-out infinite;
  }
  
  .particle:nth-child(1) {
    left: 20%;
    animation-delay: 0s;
  }
  .particle:nth-child(2) {
    left: 40%;
    animation-delay: 0.2s;
  }
  .particle:nth-child(3) {
    left: 60%;
    animation-delay: 0.4s;
  }
  .particle:nth-child(4) {
    left: 80%;
    animation-delay: 0.6s;
  }
  .particle:nth-child(5) {
    left: 30%;
    animation-delay: 0.8s;
  }
  .particle:nth-child(6) {
    left: 70%;
    animation-delay: 1s;
  }
  
  /* 动画定义 */
  @keyframes ringPulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.6;
    }
  }
  
  @keyframes patternRotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  @keyframes particleBurst {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(
          calc(cos(var(--angle)) * 25px),
          calc(sin(var(--angle)) * 25px)
        )
        scale(0);
      opacity: 0;
    }
  }
  
  @keyframes cosmosPan {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 200% 200%;
    }
  }
  
  /* 按下状态 */
  .toggle:active + .slider .toggle-orb {
    transform: scale(0.95);
  }
  
  /* 开启状态的光晕效果 */
  .toggle:checked + .slider::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at var(--x) var(--y),
      rgba(255, 255, 255, 0.2),
      transparent 50%
    );
    opacity: 0;
    animation: glowFollow 2s linear infinite;
  }
  
  @keyframes glowFollow {
    0%,
    100% {
      opacity: 0.2;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  /* 加载状态 */
  .cosmic-toggle.loading .toggle-orb {
    animation: loadingPulse 1.5s infinite;
  }
  
  @keyframes loadingPulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
  </style>
