# RPA HTTP 接口索引

2026-09-20 从本机运行服务的 `/openapi.json` 读取。接口存在不等于业务已验收，也不等于对外 MCP 暴露。参数、请求体与响应模型见同目录 OpenAPI 快照。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/license/info` | Info |
| GET | `/api/license/machine-code` | Machine Code |
| GET | `/api/license/verify` | Verify |
| POST | `/api/license/activate` | Activate |
| POST | `/api/license/unbind` | Unbind |
| GET | `/api/health` | Control Host Health |
| GET | `/api/agent/runtime-identity` | Get Agent Runtime Identity |
| GET | `/api/agent/contract` | Get Agent Contract |
| GET | `/api/runtime/capabilities` | Get Runtime Capabilities |
| GET | `/api/runtime/startup` | Get Runtime Startup |
| POST | `/api/runtime/startup/actions` | Execute Runtime Startup Action |
| GET | `/api/chat/monitor/status` | Get Monitor Status |
| POST | `/api/chat/monitor/stop` | Stop Chat Monitor |
| POST | `/api/chat/multi-monitor/start` | Start Multi Chat Monitor |
| GET | `/api/agent/instances_status` | Get Agent Instances Status |
| GET | `/api/instances` | Get All Instances |
| GET | `/api/instances/active` | Get Active Instances |
| POST | `/api/init/multi` | Initialize Macos Mvp Wechat |
| POST | `/api/system/wechat/launch` | Launch Macos Mvp Wechat |
| GET | `/api/config/{config_type}` | Get Macos Mvp Config |
| POST | `/api/config/{config_type}` | Save Macos Mvp Config |
| POST | `/api/file/upload` | Upload Macos Greeting Asset |
| GET | `/api/chat/history_sessions` | Get Macos Mvp History Sessions |
| GET | `/api/chat/history_messages/{session_id}` | Get Macos Mvp History Messages |
| GET | `/api/chat/latest_sessions` | Get Macos Mvp Latest Sessions |
| GET | `/api/chat/messages/{session_name}` | Get Macos Mvp Messages |
| POST | `/api/chat/send_message` | Send Macos Mvp Message |
| GET | `/api/chat/suspended_sessions` | Get Macos Mvp Suspended Sessions |
| GET | `/api/chat/suspended_count` | Get Macos Mvp Suspended Count |
| POST | `/api/chat/unsuspend_session` | Unsuspend Macos Mvp Session |
| GET | `/api/connection/status` | Get Macos Mvp Connection Status |
| GET | `/api/user/current` | Get Macos Mvp Current User |
| GET | `/api/contacts` | Get Macos Mvp Contacts |
| GET | `/api/contacts/groups` | Get Macos Mvp Groups |
| GET | `/api/contacts/tags` | Get Macos Mvp Contact Tags |
| GET | `/api/contacts/group_tags` | Get Macos Mvp Group Tags |
| POST | `/api/contacts/groups/set-tag` | Set Macos Mvp Group Tags |
| POST | `/api/contact/sync` | Sync Macos Mvp Contacts |
| POST | `/api/tasks/sync-contacts` | Create Macos Mvp Sync Contacts Task |
| GET | `/api/tasks/sync-contacts/status` | Get Macos Mvp Sync Contacts Task Status |
| GET | `/api/tasks/sync-contacts/{task_id}` | Get Macos Mvp Sync Contacts Task Info |
| POST | `/api/tasks/sync-contacts/{task_id}/cancel` | Cancel Macos Mvp Sync Contacts Task |
| POST | `/api/contacts/invite-to-group` | Invite Macos Mvp Friends To Group |
| POST | `/api/chat/monitor/manual-review` | Set Macos Mvp Manual Review |
| GET | `/api/tasks/mass-sending` | List Tasks |
| POST | `/api/tasks/mass-sending` | Create Task |
| GET | `/api/tasks/mass-sending/campaigns` | List Campaigns |
| GET | `/api/tasks/mass-sending/campaigns/{campaign_id}` | Get Campaign |
| POST | `/api/tasks/mass-sending/campaigns/{campaign_id}/resume` | Resume Campaign |
| POST | `/api/tasks/mass-sending/campaigns/{campaign_id}/cancel` | Cancel Campaign |
| POST | `/api/tasks/mass-sending/pause-all` | Pause All |
| POST | `/api/tasks/mass-sending/cancel-all` | Cancel All |
| POST | `/api/tasks/mass-sending/{task_id}/pause` | Pause Task |
| POST | `/api/tasks/mass-sending/{task_id}/resume` | Resume Task |
| POST | `/api/tasks/mass-sending/{task_id}/cancel` | Cancel Task |
| GET | `/api/tasks/auto-follow` | List Tasks |
| POST | `/api/tasks/auto-follow` | Create Task |
| POST | `/api/tasks/auto-follow/batch` | Create Batch |
| GET | `/api/tasks/auto-follow/logs` | List Logs |
| GET | `/api/tasks/auto-follow/by-start-date` | Find Tasks |
| POST | `/api/tasks/auto-follow/batch-cancel` | Cancel Batch |
| POST | `/api/tasks/auto-follow/batch-update-agent` | Update Batch Agent |
| POST | `/api/tasks/auto-follow/{task_id}/cancel` | Cancel Task |
| POST | `/api/tasks/auto-follow/{task_id}/pause` | Pause Task |
| POST | `/api/tasks/auto-follow/{task_id}/resume` | Resume Task |
| GET | `/api/tasks/auto-follow/{task_id}` | Get Task |
| POST | `/api/moment/toggle-auto-comment` | Toggle Auto Comment |
| GET | `/api/moment/interactions` | Get Moment Interactions |
| GET | `/api/moment-material/plans` | List Moment Plans |
| POST | `/api/moment-material/create-folder` | Create Moment Folder |
| GET | `/api/moment-material/groups` | List Moment Groups |
| GET | `/api/moment-material/select-folder` | Select Moment Folder |
| GET | `/api/moment-material/open-folder` | Open Moment Folder |
| POST | `/api/moment/post-task` | Create Moment Post Task |
| GET | `/api/moment/post-tasks` | List Moment Post Tasks |
| POST | `/api/moment/post-task/cancel` | Cancel Moment Post Task |
| GET | `/api/moment/post-logs` | Get Moment Post Logs |
| POST | `/api/agent/post_moment/` | Agent Post Moment |
| POST | `/api/agent/post_moment` | Agent Post Moment |
| GET | `/api/friend/list` | List Friends |
| DELETE | `/api/friend/list/{wxid}` | Delete Friend |
| POST | `/api/friend/list/batch_delete` | Batch Delete |
| POST | `/api/friend/auto-add-new/toggle` | Toggle |
| POST | `/api/friend/import` | Import Friends |
| GET | `/api/friend/remaining-count` | Remaining |
| GET | `/api/friend/add-logs` | Logs |
| GET | `/api/tasks/friend-request/risk-records` | Risks |
| GET | `/api/friend/list/export` | Export Friends |
| GET | `/api/friend/list/export_path` | Export Path |
| POST | `/api/tasks/friend-request/toggle` | Toggle |
| GET | `/api/tasks/friend-request/logs` | Logs |
| POST | `/api/agent/chat/send_file` | Send File |
| POST | `/api/agent/mass_sending` | Mass Sending |
| GET | `/api/agent/tasks` | Tasks |
| GET | `/api/agent/backend_status` | Backend Status |
| GET | `/api/agent/features_status` | Features Status |
| POST | `/api/agent/test` | Test Agent |
