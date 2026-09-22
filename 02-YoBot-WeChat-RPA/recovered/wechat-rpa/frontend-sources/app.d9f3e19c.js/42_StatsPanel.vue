import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "stat-card" }
const _hoisted_2 = { class: "stat-content" }
const _hoisted_3 = { class: "stat-number" }
const _hoisted_4 = { class: "stat-card" }
const _hoisted_5 = { class: "stat-content" }
const _hoisted_6 = { class: "stat-number" }
const _hoisted_7 = { class: "stat-card" }
const _hoisted_8 = { class: "stat-content" }
const _hoisted_9 = { class: "stat-number" }
const _hoisted_10 = { class: "stat-trend" }


  
  interface Stats {
    sessionCount: number;
    sessionIncrease: number;
    messageCount: number;
    messageIncrease: number;
    savedHours: number;
    savedMoney: number;
  }
  
  
export default /*@__PURE__*/_defineComponent({
  __name: 'StatsPanel',
  props: {
    expanded: { type: Boolean },
    stats: {}
  },
  setup(__props: any) {

  const props = __props;
  
return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", {
    class: _normalizeClass(["stats-grid", { expanded: __props.expanded }])
  }, [
    _createElementVNode("div", _hoisted_1, [
      _createElementVNode("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, _toDisplayString(__props.stats.sessionCount), 1),
        _cache[0] || (_cache[0] = _createElementVNode("div", { class: "stat-label" }, "服务用户数", -1)),
        _createElementVNode("div", {
          class: _normalizeClass(["stat-trend", { 'trend-up': __props.stats.sessionIncrease >= 0, 'trend-down': __props.stats.sessionIncrease < 0 }])
        }, _toDisplayString(__props.stats.sessionIncrease >= 0 ? '↗️' : '↘️') + " " + _toDisplayString(__props.stats.sessionIncrease >= 0 ? '+' : '') + _toDisplayString(__props.stats.sessionIncrease) + "% 昨日 ", 3)
      ])
    ]),
    _createElementVNode("div", _hoisted_4, [
      _createElementVNode("div", _hoisted_5, [
        _createElementVNode("div", _hoisted_6, _toDisplayString(__props.stats.messageCount), 1),
        _cache[1] || (_cache[1] = _createElementVNode("div", { class: "stat-label" }, "自动回复数", -1)),
        _createElementVNode("div", {
          class: _normalizeClass(["stat-trend", { 'trend-up': __props.stats.messageIncrease >= 0, 'trend-down': __props.stats.messageIncrease < 0 }])
        }, _toDisplayString(__props.stats.messageIncrease >= 0 ? '↗️' : '↘️') + " " + _toDisplayString(__props.stats.messageIncrease >= 0 ? '+' : '') + _toDisplayString(__props.stats.messageIncrease) + "% 昨日 ", 3)
      ])
    ]),
    _createElementVNode("div", _hoisted_7, [
      _createElementVNode("div", _hoisted_8, [
        _createElementVNode("div", _hoisted_9, _toDisplayString(__props.stats.savedHours), 1),
        _cache[2] || (_cache[2] = _createElementVNode("div", { class: "stat-label" }, "节省工时(小时)", -1)),
        _createElementVNode("div", _hoisted_10, " 💰 约节省 ¥" + _toDisplayString(__props.stats.savedMoney), 1)
      ])
    ])
  ], 2))
}
}

})