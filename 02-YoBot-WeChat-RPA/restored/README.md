# 部分恢复源码

python 内有手工还原的协议、消息方法和最小依赖。frontend/src 是 source map 中恢复的原前端源内容。

这还不是能独立启动的微信 bot：原生 Helper、完整驱动和后端装配尚未源码化。message_methods.py 是两个原方法组成的 mixin，必须由完整驱动提供会话、实例、mapper、能力校验及锁。

验证范围和来源见 ../analysis/还原进展.md。请勿把自动反编译候选拷进这里覆盖已核对的源码。
