import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, Fragment as _Fragment, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "license-container" }
const _hoisted_2 = { class: "license-content" }

import { ref, onMounted, } from 'vue';
import { useRouter } from 'vue-router';
import { activateLicense, verifyLicense,getMachineCode } from '@/api/license';
import { useLicenseStore } from '@/store/license';
import { ElMessage } from 'element-plus';  // 添加这行



export default /*@__PURE__*/_defineComponent({
  __name: 'LicenseView',
  setup(__props) {

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

return (_ctx: any,_cache: any) => {
  const _component_el_button = _resolveComponent("el-button")!
  const _component_el_alert = _resolveComponent("el-alert")!
  const _component_el_input = _resolveComponent("el-input")!
  const _component_el_form_item = _resolveComponent("el-form-item")!
  const _component_el_form = _resolveComponent("el-form")!
  const _component_el_result = _resolveComponent("el-result")!
  const _component_el_card = _resolveComponent("el-card")!

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createVNode(_component_el_card, { class: "license-card" }, {
      header: _withCtx(() => [...(_cache[1] || (_cache[1] = [
        _createElementVNode("div", { class: "card-header" }, [
          _createElementVNode("span", null, "软件授权激活")
        ], -1)
      ]))]),
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_2, [
          (!isActivated.value)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                _createVNode(_component_el_alert, {
                  type: "info",
                  title: `您的机器码: ${machineCode.value || '正在获取...'}`,
                  class: "mb-3"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_button, {
                      link: "",
                      onClick: copyMachineCode
                    }, {
                      default: _withCtx(() => [...(_cache[2] || (_cache[2] = [
                        _createTextVNode(" 复制机器码 ", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                (errorMessage.value)
                  ? (_openBlock(), _createBlock(_component_el_alert, {
                      key: 0,
                      title: errorMessage.value,
                      type: "error",
                      "show-icon": "",
                      class: "mb-3"
                    }, null, 8, ["title"]))
                  : _createCommentVNode("", true),
                _createVNode(_component_el_form, {
                  model: form.value,
                  "label-width": "100px"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_el_form_item, { label: "激活码" }, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_input, {
                          modelValue: form.value.activationCode,
                          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event: any) => ((form.value.activationCode) = $event)),
                          placeholder: "请输入激活码"
                        }, null, 8, ["modelValue"])
                      ]),
                      _: 1
                    }),
                    _createVNode(_component_el_form_item, null, {
                      default: _withCtx(() => [
                        _createVNode(_component_el_button, {
                          type: "primary",
                          loading: loading.value,
                          onClick: handleActivate
                        }, {
                          default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
                            _createTextVNode(" 激活软件 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["loading"])
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["model"])
              ], 64))
            : (_openBlock(), _createBlock(_component_el_result, {
                key: 1,
                icon: "success",
                title: "软件已激活",
                "sub-title": activationInfo.value
              }, {
                extra: _withCtx(() => [
                  _createVNode(_component_el_button, {
                    type: "primary",
                    onClick: handleGoHome
                  }, {
                    default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
                      _createTextVNode("进入首页", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["sub-title"]))
        ])
      ]),
      _: 1
    })
  ]))
}
}

})