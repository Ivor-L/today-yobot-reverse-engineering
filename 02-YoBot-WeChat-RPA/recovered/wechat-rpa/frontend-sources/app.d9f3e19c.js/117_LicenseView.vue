<template>
  <div class="license-container">
    <el-card class="license-card">
      <template #header>
        <div class="card-header">
          <span>软件授权激活</span>
        </div>
      </template>
      
      <div class="license-content">
        <template v-if="!isActivated">
          <!-- 显示机器码 -->
          <el-alert
            type="info"
            :title="`您的机器码: ${machineCode || '正在获取...'}`"
            class="mb-3"
          >
            <el-button link @click="copyMachineCode">
              复制机器码
            </el-button>
          </el-alert>
          
          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            show-icon
            class="mb-3"
          />
          
          <el-form :model="form" label-width="100px">
            <el-form-item label="激活码">
              <el-input
                v-model="form.activationCode"
                placeholder="请输入激活码"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button 
                type="primary" 
                :loading="loading"
                @click="handleActivate"
              >
                激活软件
              </el-button>
            </el-form-item>
          </el-form>
        </template>
        
        <template v-else>
          <el-result
            icon="success"
            title="软件已激活"
            :sub-title="activationInfo"
          >
            <template #extra>
              <el-button type="primary" @click="handleGoHome">进入首页</el-button>
            </template>
          </el-result>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, } from 'vue';
import { useRouter } from 'vue-router';
import { activateLicense, verifyLicense,getMachineCode } from '@/api/license';
import { useLicenseStore } from '@/store/license';
import { ElMessage } from 'element-plus';  // 添加这行


const router = useRouter();
const licenseStore = useLicenseStore();
const loading = ref(false);
const isActivated = ref(false);
const errorMessage = ref('');
const activationInfo = ref('');

const machineCode = ref('');
const form = ref({
  activationCode: ''
});

// 获取机器码
const fetchMachineCode = async () => {  // 重命名方法
  try {
    machineCode.value = await getMachineCode();  // 使用导入的 API 方法
  } catch (error) {
    console.error('获取机器码失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '获取机器码失败，请重试';
  }
};

// 复制机器码
const copyMachineCode = () => {
  navigator.clipboard.writeText(machineCode.value)
    .then(() => {
      ElMessage.success('机器码已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制');
    });
};

const handleGoHome = async () => {
  try {
    await router.push('/startup');
  } catch (routerError) {
    console.error('路由跳转失败，尝试使用location:', routerError);
    window.location.href = '/startup';
  }
};

const handleActivate = async () => {
  if (!form.value.activationCode) {
    errorMessage.value = '请输入激活码';
    return;
  }
  
  loading.value = true;
  errorMessage.value = '';
  
  try {
      const result = await activateLicense({
        activation_code: form.value.activationCode,
        machine_code: machineCode.value
      });
      
                // 修改激活逻辑：无论是新激活还是已激活，都更新本地授权
      if (result.valid || result.message === '此设备已激活') {
        try {
          // 统一处理授权信息
          let licenseData = result.data?.license_info;
          
          if (!licenseData) {
            // 如果激活结果中没有授权信息，再尝试验证
            const verifyResult = await verifyLicense();
            console.log('验证结果:', verifyResult);
            
            if (verifyResult?.valid) {
              licenseData = verifyResult.data;
            } else {
              throw new Error(verifyResult?.message || '验证授权失败，请重试');
            }
          }

          if (licenseData) {
            // 更新store状态
            licenseStore.$patch({
              isValid: true,
              isVerified: true,
              licenseInfo: licenseData,
              lastVerifyTime: Date.now()
            });

            isActivated.value = true;
            activationInfo.value = '软件激活成功，即将跳转到主页...';
            ElMessage.success('激活成功');
            
            setTimeout(() => {
              handleGoHome();
            }, 1000);
          }
        } catch (verifyError) {
          console.error('验证过程详细错误:', verifyError);
          errorMessage.value = verifyError instanceof Error ? verifyError.message : '授权验证失败，请重试';
        }
      } else {
        errorMessage.value = result.message;
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '激活失败，请稍后重试';
    } finally {
      loading.value = false;
    }
};
const checkLicense = async () => {
    try {
    const result = await verifyLicense();
    if (result.valid) {
      // 更新store
      licenseStore.$patch({
        isValid: true,
        isVerified: true,
        licenseInfo: result.data,
        lastVerifyTime: Date.now()
      });

      isActivated.value = true;
      activationInfo.value = `激活时间: ${new Date(result.data?.activated_at || '').toLocaleString()}`;
      // 修改跳转路径
      setTimeout(() => handleGoHome(), 1500);
    }
  } catch (error) {
    console.error('验证授权失败:', error);
    errorMessage.value = '验证授权失败，请重试';
  }
};
onMounted(async () => {
  await fetchMachineCode();  // 使用新的方法名
  console.log("检查授权信息...");
  
  checkLicense();
});
</script>

<style scoped>
.license-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.license-card {
  width: 500px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.license-content {
  padding: 20px 0;
}

.mb-3 {
  margin-bottom: 20px;
}
</style>
