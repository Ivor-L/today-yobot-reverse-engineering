# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: Uielements.marshal (Python 3.9)

'''
Uielements
---------
PC微信中的各种Ui-Object,我将其分成两大类

一类是按照属性分类,有Buttons,Edits,Texts,TabItems等,每一个类内基本包含了微信内

所有的control_type与类名一致的UI控件

另一类是按照其属的父级窗口,可分为Login_window(登录界面),Main_window(主界面)

Independent_window(独立窗口)这三类

使用时只需要:
```
from pyweixin.Uielements import Edits
searchbar=Edits().SearchEdit#返回值为kwargs字典,可以直接使用**解包
```
'''
language = '简体中文'

class Buttons:
    '''
    微信主界面内所有类型为Button的UI控件
    '''
    
    def __init__(self):
        self.MySelfButton = {
            'control_type': 'Button',
            'found_index': 0 }
        self.SendButton = {
            'control_type': 'Button',
            'title': '发送(S)' }
        self.CheckMoreMessagesButton = {
            'title': '查看更多消息',
            'control_type': 'Button',
            'found_index': 1 }
        self.OfficialAcountButton = {
            'title': '公众号',
            'control_type': 'Button' }
        self.SettingsAndOthersButton = {
            'title': '设置',
            'control_type': 'Button' }
        self.ConfirmQuitGroupButton = {
            'title': '退出',
            'control_type': 'Button' }
        self.CerateNewNote = {
            'title': '新建笔记',
            'control_type': 'Button' }
        self.CerateGroupChatButton = {
            'title': '发起群聊',
            'control_type': 'Button' }
        self.AddNewFriendButon = {
            'title': '添加朋友',
            'control_type': 'Button' }
        self.AddToContactsButton = {
            'control_type': 'Button',
            'title': '添加到通讯录' }
        self.AcceptButton = {
            'control_type': 'Button',
            'title': '接受' }
        self.ChatMessageButton = {
            'title': '聊天信息',
            'control_type': 'Button' }
        self.CloseAutoLoginButton = {
            'control_type': 'Button',
            'title': '关闭自动登录' }
        self.ConfirmButton = {
            'control_type': 'Button',
            'title': '确定' }
        self.CancelButton = {
            'control_type': 'Button',
            'title': '取消' }
        self.DeleteButton = {
            'control_type': 'Button',
            'title': '确定' }
        self.ClearButton = {
            'control_type': 'Button',
            'title': '确定' }
        self.MultiSelectButton = {
            'control_type': 'Button',
            'title': '多选' }
        self.HangUpButton = {
            'control_type': 'Button',
            'title': '挂断' }
        self.SendButton = {
            'control_type': 'Button',
            'title': '发送' }
        self.SendRespectivelyButton = {
            'control_type': 'Button',
            'title_re': '分别发送' }
        self.SettingsButton = {
            'control_type': 'Button',
            'title': '设置',
            'found_index': 0 }
        self.ChatFilesButton = {
            'control_type': 'Button',
            'title': '聊天文件',
            'found_index': 0 }
        self.ClearChatHistoryButton = {
            'control_type': 'Button',
            'title': '清空聊天记录' }
        self.RestoreDefaultSettingsButton = {
            'control_type': 'Button',
            'title': '恢复默认设置' }
        self.VoiceCallButton = {
            'control_type': 'Button',
            'title': '语音聊天' }
        self.VideoCallButton = {
            'control_type': 'Button',
            'title': '视频聊天' }
        self.CompleteButton = {
            'control_type': 'Button',
            'title': '完成' }
        self.PinButton = {
            'control_type': 'Button',
            'title': '置顶' }
        self.CancelPinButton = {
            'control_type': 'Button',
            'title': '取消置顶' }
        self.TagEditButton = {
            'control_type': 'Button',
            'title': '点击编辑标签' }
        self.ChatHistoryButton = {
            'control_type': 'Button',
            'title': '聊天记录' }
        self.ChangeGroupNameButton = {
            'control_type': 'Button',
            'title': '群聊名称' }
        self.MyNicknameInGroupButton = {
            'control_type': 'Button',
            'title': '我在本群的昵称' }
        self.RemarkButton = {
            'control_type': 'Button',
            'title': '备注' }
        self.QuitGroupButton = {
            'control_type': 'Button',
            'title': '退出群聊' }
        self.DeleteButton = {
            'control_type': 'Button',
            'title': '删除' }
        self.EditButton = {
            'control_type': 'Button',
            'title': '编辑' }
        self.EditGroupNotificationButton = {
            'control_type': 'Button',
            'title': '点击编辑群公告' }
        self.PublishButton = {
            'control_type': 'Button',
            'title': '发布' }
        self.ContactsManageButton = {
            'title': '通讯录管理',
            'control_type': 'Button' }
        self.ConfirmEmptyChatHistoryButon = {
            'title': '清空',
            'control_type': 'Button' }
        self.MoreButton = {
            'title': '更多',
            'control_type': 'Button' }
        self.LogoutButton = {
            'title': '退出登录',
            'control_type': 'Button' }
        self.RefreshButton = {
            'title': '刷新',
            'control_type': 'Button' }
        self.RectentGroupButton = {
            'title': '最近群聊',
            'control_type': 'Button' }
        self.MultiPersonCallButton = {
            'title': '多人通话',
            'control_type': 'Button' }
        self.MomentsButton = {
            'title': '朋友圈',
            'control_type': 'Button',
            'class_name': 'mmui::ExtensionDiscoverContentCell',
            'found_index': 0 }
        self.ChannelsButton = {
            'title': '视频号',
            'control_type': 'Button',
            'class_name': 'mmui::ExtensionDiscoverContentCell',
            'found_index': 0 }
        self.SearchButton = {
            'title': '搜一搜',
            'control_type': 'Button',
            'class_name': 'mmui::ExtensionDiscoverContentCell',
            'found_index': 0 }
        self.MiniProgramButton = {
            'title': '小程序',
            'control_type': 'Button',
            'class_name': 'mmui::ExtensionDiscoverContentCell',
            'found_index': 0 }



class Edits:
    '''微信主界面内所有类型为Edit(不包含独立窗口)的UI控件'''
    
    def __init__(self):
        self.SearchEdit = {
            'title': '搜索',
            'control_type': 'Edit',
            'class_name': 'mmui::XValidatorTextEdit' }
        self.CurrentChatEdit = {
            'control_type': 'Edit',
            'found_index': 1 }
        self.AddNewFriendSearchEdit = {
            'title': '搜索',
            'control_type': 'Edit' }
        self.SearchNewFriendEdit = {
            'title': '微信号/手机号',
            'control_type': 'Edit' }
        self.TagEdit = {
            'title': '设置标签',
            'control_type': 'Edit' }
        self.RequestContentEdit = {
            'title_re': '我是',
            'control_type': 'Edit' }
        self.SearchGroupMemeberEdit = {
            'title': '搜索群成员',
            'control_type': 'Edit' }
        self.EditWnd = {
            'control_type': 'Edit',
            'class_name': 'EditWnd',
            'framework_id': 'Win32' }



class Texts:
    '''微信主界面以及设置界面内所有类型为Text的UI控件
'''
    
    def __init__(self):
        self.NetWorkError = {
            'title': '网络不可用，请检查你的网络设置',
            'control_type': 'Text' }
        self.SearchContactsResult = {
            'title_re': '搜索',
            'control_type': 'Text' }
        self.ChangeGroupNameWarnText = {
            'title': '仅群主或管理员可以修改',
            'control_type': 'Text' }
        self.EditGroupNoticeWarnText = {
            'title': '仅群主和管理员可编辑',
            'control_type': 'Text' }
        self.SendMessageShortcutText = {
            'title': '发送消息',
            'control_type': 'Text' }
        self.CptureScreenShortcutText = {
            'title': '截取屏幕',
            'control_type': 'Text' }
        self.OpenWechatShortcutText = {
            'title': '打开微信',
            'control_type': 'Text' }
        self.LockWechatShortcutText = {
            'title': '锁定微信',
            'control_type': 'Text' }
        self.LanguageText = {
            'title': '语言',
            'control_type': 'Text' }
        self.GroupNameText = {
            'title': '群聊名称',
            'control_type': 'Text' }



class TabItems:
    
    def __init__(self):
        self.ShortCutTabItem = {
            'title': '快捷键',
            'control_type': 'TabItem' }
        self.GeneralTabItem = {
            'title': '通用设置',
            'control_type': 'TabItem' }
        self.MyAccountTabItem = {
            'title': '账号设置',
            'control_type': 'TabItem' }
        self.NotificationsTabItem = {
            'title': '消息通知',
            'control_type': 'TabItem' }
        self.FileTabItem = {
            'title': '文件',
            'control_type': 'TabItem' }
        self.PhotoAndVideoTabItem = {
            'title': '照片和视频',
            'control_type': 'TabItem',
            'class_name': 'mmui::XButton',
            'framework_id': 'Qt' }
        self.LinkTabItem = {
            'title': '链接',
            'control_type': 'TabItem',
            'class_name': 'mmui::XButton',
            'framework_id': 'Qt' }
        self.MiniProgramTabItem = {
            'title': '小程序',
            'control_type': 'TabItem',
            'class_name': 'mmui::XButton',
            'framework_id': 'Qt' }
        self.MusicTabItem = {
            'title': '音乐与音频',
            'control_type': 'TabItem',
            'class_name': 'mmui::XButton',
            'framework_id': 'Qt' }
        self.ChannelTabItem = {
            'title': '视频号',
            'control_type': 'TabItem',
            'class_name': 'mmui::XButton',
            'framework_id': 'Qt' }
        self.DateTabItem = {
            'title': '日期',
            'control_type': 'TabItem' }



class Lists:
    
    def __init__(self):
        self.ChatHistoryList = {
            'title': '全部',
            'control_type': 'List' }
        self.ContactsList = {
            'title': '通讯录',
            'control_type': 'List' }
        self.ConversationList = {
            'title': '会话',
            'control_type': 'List' }
        self.FriendChatList = {
            'title': '消息',
            'control_type': 'List' }
        self.FileList = {
            'title': '文件',
            'control_type': 'List' }
        self.PhotoAndVideoList = {
            'title': '照片和视频',
            'control_type': 'List' }
        self.LinkList = {
            'title': '链接',
            'control_type': 'List' }
        self.MiniProgramList = {
            'title': '小程序',
            'control_type': 'List' }
        self.MusicList = {
            'title': '音乐与音频',
            'control_type': 'List' }
        self.ChannelList = {
            'title': '视频号',
            'control_type': 'List' }



class Panes:
    
    def __init__(self):
        self.ContactsManagePane = {
            'title': '全部',
            'control_type': 'Pane' }
        self.ConfirmPane = {
            'title': '',
            'class_name': 'WeUIDialog',
            'control_type': 'Pane' }
        self.ChangeShortcutPane = {
            'title': '',
            'control_type': 'Pane',
            'class_name': 'SetAcceleratorWnd' }



class Menus:
    
    def __init__(self):
        self.RightClickMenu = {
            'title': '',
            'control_type': 'Menu',
            'class_name': 'CMenuWnd',
            'framework_id': 'Win32' }



class MenuItems:
    
    def __init__(self):
        self.ForwardMenuItem = {
            'title': '转发...',
            'control_type': 'MenuItem' }
        self.SetPrivacyMenuItem = {
            'title': '设置朋友权限',
            'control_type': 'MenuItem' }
        self.StarMenuItem = {
            'title': '设为星标朋友',
            'control_type': 'MenuItem' }
        self.BlockMenuItem = {
            'title': '加入黑名单',
            'control_type': 'MenuItem' }
        self.EditContactMenuItem = {
            'title': '设置备注和标签',
            'control_type': 'MenuItem' }
        self.ShareContactMenuItem = {
            'title_re': '推荐给朋友',
            'control_type': 'MenuItem' }
        self.DeleteMenuItem = {
            'title': '删除联系人',
            'control_type': 'MenuItem' }
        self.UnBlockMenuItem = {
            'title': '移出黑名单',
            'control_type': 'MenuItem' }
        self.UnStarMenuItem = {
            'title': '不再设为星标朋友',
            'control_type': 'MenuItem' }
        self.Tickle = {
            'title': '拍一拍',
            'control_type': 'MenuItem' }
        self.CopyMenuItem = {
            'title': '复制',
            'control_type': 'MenuItem' }
        self.SaveMenuItem = {
            'title': '另存为',
            'control_type': 'MenuItem' }
        self.ForwardMenuItem = {
            'title': '转发...',
            'control_type': 'MenuItem' }
        self.AddToFavoritesMenuItem = {
            'title': '收藏',
            'control_type': 'MenuItem' }
        self.TranslateMenuItem = {
            'title': '翻译',
            'control_type': 'MenuItem' }
        self.EditMenuItem = {
            'title': '编辑',
            'control_type': 'MenuItem' }
        self.DeleteMenuItem = {
            'title': '删除',
            'control_type': 'MenuItem' }
        self.SearchMenuItem = {
            'title': '搜一搜',
            'control_type': 'MenuItem' }
        self.QuoteMeunItem = {
            'title': '引用',
            'control_type': 'MenuItem' }
        self.SelectMenuItem = {
            'title': '多选',
            'control_type': 'MenuItem' }
        self.EnlargeMeunItem = {
            'title': '放大阅读',
            'control_type': 'MenuItem' }
        self.FindInChatMenuItem = {
            'title': '定位到聊天位置',
            'control_type': 'MenuItem' }
        self.OpenWithDefaultBrowser = {
            'title': '使用默认浏览器打开',
            'control_type': 'MenuItem' }



class CheckBoxes:
    
    def __init__(self):
        self.ChatsOnlyCheckBox = {
            'title': '仅聊天',
            'control_type': 'CheckBox' }
        self.OpenChatCheckBox = {
            'title': '聊天、朋友圈、微信运动等',
            'control_type': 'CheckBox' }
        self.OnScreenNamesCheckBox = {
            'title': '显示群成员昵称',
            'control_type': 'CheckBox' }
        self.MuteNotificationsCheckBox = {
            'title': '消息免打扰',
            'control_type': 'CheckBox' }
        self.StickyonTopCheckBox = {
            'title': '置顶聊天',
            'control_type': 'CheckBox' }
        self.SavetoContactsCheckBox = {
            'title': '保存到通讯录',
            'control_type': 'CheckBox' }



class Windows:
    
    def __init__(self):
        self.EditPrivacyWindow = {
            'title': '朋友权限',
            'class_name': 'WeUIDialog',
            'framework_id': 'Win32' }
        self.EditContactWindow = {
            'title': '设置备注和标签',
            'class_name': 'WeUIDialog',
            'framework_id': 'Win32' }
        self.SettingsMenu = {
            'class_name': 'SetMenuWnd',
            'control_type': 'Window' }
        self.DeleteMemberWindow = {
            'title': 'DeleteMemberWnd',
            'control_type': 'Window',
            'framework_id': 'Win32' }
        self.AddMemberWindow = {
            'title': 'AddMemberWnd',
            'control_type': 'Window',
            'framework_id': 'Win32' }
        self.SelectContactWindow = {
            'title': '',
            'control_type': 'Window',
            'class_name': 'SelectContactWnd',
            'framework_id': 'Win32' }



class Login_window:
    '''登录界面要用到的唯二的两个Ui:登录界面与进入微信按钮
'''
    
    def __init__(self):
        self.LoginWindow = {
            'title': '微信',
            'class_name': 'mmui::LoginWindow' }
        self.LoginButton = {
            'control_type': 'Button',
            'title': '进入微信' }



class SideBar:
    '''主界面侧边栏下的所有Ui'''
    
    def __init__(self):
        self.Chats = {
            'title': '微信',
            'control_type': 'Button' }
        self.Contacts = {
            'title': '通讯录',
            'control_type': 'Button' }
        self.Collections = {
            'title': '收藏',
            'control_type': 'Button',
            'class_name': 'mmui::XTabBarItem' }
        self.Moments = {
            'title': '朋友圈',
            'control_type': 'Button',
            'class_name': 'mmui::XTabBarItem' }
        self.Search = {
            'title': '搜一搜',
            'control_type': 'Button',
            'class_name': 'mmui::XTabBarItem' }
        self.Channels = {
            'title': '视频号',
            'control_type': 'Button',
            'class_name': 'mmui::XTabBarItem' }
        self.MiniProgram = {
            'title': '小程序面板',
            'control_type': 'Button',
            'class_name': 'mmui::XTabBarItem' }
        self.Discovery = {
            'title': '发现',
            'control_type': 'Button' }
        self.More = {
            'title': '更多',
            'control_type': 'Button',
            'found_index': 0 }



class Main_window:
    '''主界面下所有的第一级Ui
'''
    
    def __init__(self):
        self.MainWindow = {
            'title': '微信',
            'class_name': 'mmui::MainWindow',
            'framework_id': 'Qt' }
        self.MySelfButton = {
            'control_type': 'Button',
            'found_index': 0 }
        self.AddTalkMemberWindow = {
            'title': '微信选择成员',
            'control_type': 'Window',
            'class_name': 'mmui::SessionPickerWindow',
            'framework_id': 'Qt' }
        self.MainWindow = {
            'title': '微信',
            'class_name': 'mmui::MainWindow' }
        self.Toolbar = {
            'title': '导航',
            'control_type': 'ToolBar' }
        self.ConversationList = {
            'title': '会话',
            'control_type': 'List',
            'framework_id': 'Qt' }
        self.Search = {
            'title': '搜索',
            'control_type': 'Edit',
            'class_name': 'mmui::XValidatorTextEdit' }
        self.SearchResult = {
            'title': '',
            'control_type': 'List',
            'auto_id': 'search_list' }
        self.ChatToolBar = {
            'title': '',
            'found_index': 0,
            'control_type': 'ToolBar' }
        self.CurrentChatWindow = {
            'control_type': 'Edit',
            'title': 'Edit' }
        self.ProfileWindow = {
            'class_name': 'ContactProfileWnd',
            'control_type': 'Pane',
            'framework_id': 'Win32' }
        self.FriendMenu = {
            'control_type': 'Menu',
            'title': '',
            'class_name': 'CMenuWnd',
            'framework_id': 'Win32' }
        self.FriendSettingsWindow = {
            'class_name': 'SessionChatRoomDetailWnd',
            'control_type': 'Pane',
            'framework_id': 'Win32' }
        self.GroupSettingsWindow = {
            'title': 'SessionChatRoomDetailWnd',
            'control_type': 'Pane',
            'framework_id': 'Win32' }
        self.SettingsMenu = {
            'class_name': 'SetMenuWnd',
            'control_type': 'Window' }
        self.ContactsList = {
            'control_type': 'List',
            'class_name': 'mmui::StickyHeaderRecyclerListView' }
        self.SearchNewFriendBar = {
            'title': '微信号/手机号',
            'control_type': 'Edit' }
        self.SearchNewFriendResult = {
            'title_re': '@str:IDS_FAV_SEARCH_RESULT',
            'control_type': 'List' }
        self.AddFriendRequestWindow = {
            'title': '添加朋友请求',
            'class_name': 'WeUIDialog',
            'control_type': 'Window',
            'framework_id': 'Win32' }
        self.AddMemberWindow = {
            'title': 'AddMemberWnd',
            'control_type': 'Window',
            'framework_id': 'Win32' }
        self.DeleteMemberWindow = {
            'title': 'DeleteMemberWnd',
            'control_type': 'Window',
            'framework_id': 'Win32' }
        self.Tickle = {
            'title': '拍一拍',
            'control_type': 'MenuItem' }
        self.SelectContactWindow = {
            'title': '',
            'control_type': 'Window',
            'class_name': 'SelectContactWnd',
            'framework_id': 'Win32' }
        self.SetTag = {
            'title': '设置标签',
            'framework_id': 'Win32',
            'class_name': 'StandardConfirmDialog' }
        self.FriendChatList = {
            'title': '消息',
            'control_type': 'List' }
        self.SearchContactsResult = {
            'title_re': '搜索',
            'control_type': 'Text' }
        self.EditArea = {
            'control_type': 'Edit',
            'class_name': 'mmui::ChatInputField' }



class Independent_window:
    '''独立于微信主界面,将微信主界面关闭后仍能在桌面显示的窗口Ui
'''
    
    def __init__(self):
        self.Desktop = {
            'backend': 'uia' }
        self.SettingWindow = {
            'title': '设置',
            'class_name': 'mmui::PreferenceWindow',
            'control_type': 'Window' }
        self.ContactManagerWindow = {
            'title': '通讯录管理',
            'class_name': 'mmui::ContactsManagerWindow' }
        self.MomentsWindow = {
            'title': '朋友圈',
            'control_type': 'Window',
            'class_name': 'mmui::SNSWindow',
            'framework_id': 'Qt' }
        self.ChatFilesWindow = {
            'title': '聊天文件',
            'control_type': 'Window',
            'class_name': 'mmui::FileManagerWindow' }
        self.MiniProgramWindow = {
            'title': '微信',
            'control_type': 'Pane',
            'class_name': 'Chrome_WidgetWin_0' }
        self.SearchWindow = {
            'title': '微信',
            'class_name': 'Chrome_WidgetWin_0',
            'control_type': 'Pane' }
        self.ChannelsWindow = {
            'title': '微信',
            'class_name': 'Chrome_WidgetWin_0',
            'control_type': 'Pane' }
        self.ContactProfileWindow = {
            'title': '微信',
            'class_name': 'ContactProfileWnd',
            'framework_id': 'Win32',
            'control_type': 'Pane' }
        self.ChatHistoryWindow = {
            'control_type': 'Window',
            'class_name': 'mmui::SearchMsgUniqueChatWindow',
            'framework_id': 'Qt' }
        self.GroupAnnouncementWindow = {
            'title': '群公告',
            'framework_id': 'Win32',
            'class_name': 'ChatRoomAnnouncementWnd' }
        self.NoteWindow = {
            'title': '笔记',
            'class_name': 'FavNoteWnd',
            'framework_id': 'Win32' }
        self.OldIncomingCallWindow = {
            'class_name': 'VoipTrayWnd',
            'title': '微信' }
        self.NewIncomingCallWindow = {
            'class_name': 'ILinkVoipTrayWnd',
            'title': '微信' }
        self.OldVoiceCallWindow = {
            'title': '微信',
            'class_name': 'AudioWnd' }
        self.NewVoiceCallWindow = {
            'title': '微信',
            'class_name': 'ILinkAudioWnd' }
        self.OldVideoCallWindow = {
            'title': '微信',
            'class_name': 'VoipWnd' }
        self.NewVideoCallWindow = {
            'title': '微信',
            'class_name': 'ILinkVoipWnd' }
        self.OfficialAccountWindow = {
            'title': '公众号',
            'control_type': 'Window',
            'class_name': 'H5SubscriptionProfileWnd' }


