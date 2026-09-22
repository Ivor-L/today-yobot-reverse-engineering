export interface BrandConfig {
  channel_id: string
  name: string
  ename: string
  alias?: string
  logo: string
  contact: string
  copyright?: string
  slogan?: string           // 启动页 hero 一句话 slogan
  contactType?: 'text' | 'qrcode' // 联系方式类型
  qrcodeUrl?: string // 二维码图片链接
  skipStartup?: boolean // 是否跳过启动页
  enableFireflow?: boolean // 是否支持fireflow平台
  showRuntimeLog?: boolean // 是否在欢迎页展示运行日志入口，默认展示
}

export interface BrandConfigs {
  [key: string]: BrandConfig
}

// The macOS Agent embeds Control as the first-party RPA plugin. Keep the
// packaged frontend on the plugin channel unless an explicit persisted
// channel override is supplied by an OEM build.
const defaultChannel = 'default_rpa'

export const YOBOT_WEBSITE_URL = 'https://yobot.yokoagi.com'

// 渠道品牌配置
export const brandConfig: BrandConfigs = {
  default_rpa: {
    channel_id:'channel_000001',
    name: '私域AI销售',
    ename:'私域AI销售',
    logo: './img/ai_sale_logo.png',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/yoko_kefu.png',
    skipStartup: true,
    enableFireflow: true,
    showRuntimeLog: false
  },
  default: {
    channel_id:'channel_000001',
    name: 'YokoAI机器人',
    ename:'YokoAIbot',
    logo: './img/logo.jpg',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/yoko_kefu.png',
    copyright: 'YokoAI@2026 by 上海蒲兰科技',
    slogan: '7*24小时 AI 私域销售',
    enableFireflow: true
  },
  channel_coco: {
    channel_id:'channel_000050',
    name: 'COCO Agent分身',
    ename:'CoCoAgent',
    logo: './img/coco_logo.png',
    contact: '3049568552@qq.com',
    slogan: 'COCO Agent，您的私域分身'
  },
  channel_ykmf: {//二级代理：channel_000021
    channel_id:'channel_000049',
    name: '赢客魔方',
    ename:'YKBot',
    logo: './img/yingke_logo.jpg',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/yingke_kefu.jpg',
    slogan: 'AI 赋能私域，成交时刻在线'
  },
  channel_yh: {//二级代理：channel_000026
    channel_id:'channel_000048',
    name: '亿合私域AI系统',
    ename:'YHAIbot',
    logo: './img/yh_logo.png',
    contact: '13944172786',
    slogan: '亿合私域AI系统，让烘焙私域运营更简单高效'
  },
  channel_WOJO: {
    channel_id:'channel_000047',
    name: '域小通机器人',
    ename:'WOJOAIbot',
    logo: './img/wojo_logo.jpg',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/wojo_kefu.jpg',
    slogan: 'AI 赋能私域，让成交时刻在线'
  },
  channel_xiaoqian: {
    channel_id:'channel_000046',
    name: '小钱科技-微信销冠虾',
    ename:'Xiaoqian-ReplyXiaBot',
    logo: './img/xiaoqian_logo.png',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/xiaoqian_kefu.png',
    slogan: '花小钱 办大事'
  },
  channel_hui: {
    channel_id:'channel_000045',
    name: 'HuiAI机器人',
    ename:'HuiAIbot',
    logo: './img/hui_logo.jpg',
    contact: '730857262@qq.com'
  },
  channel_Eju: {//二级非OEM代理
    channel_id:'channel_000044',
    name: 'E居管家',
    ename:'Eju',
    logo: './img/eju_logo.jpg',
    contact: '730857262@qq.com'
  },
  channel_0313: {//二级非OEM代理
    channel_id:'channel_000043',
    name: 'AI增长销冠',
    ename:'AI Growth Champion',
    logo: './img/growth_champion.png',
    contact: '扫描二维码添加人工客服微信'
  },
  channel_growth_champion: {
    channel_id:'channel_000042',
    name: 'AI增长销冠',
    ename:'AI Growth Champion',
    logo: './img/growth_champion.png',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/growth_champion_kefu.jpg',
  },
  channel_ailink: {
    channel_id:'channel_000041',
    name: 'AiLink机器人',
    ename:'AiLinkBot',
    logo: './img/ailink_logo.jpg',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/ailink_kefu.jpg',
  },
  channel_moji: {
    channel_id:'channel_000040',
    name: '魔吉',
    ename:'Moji',
    logo: './img/moji_logo.png',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/moji_kefu.png',
  },
  channel_vanta: {
    channel_id:'channel_000039',
    name: '江门新会陈皮网——智慧获客',
    ename:'JMXHCPW——AI To Win customers',
    logo: './img/vanta_logo.jpg',
    contact: '345051813@qq.com'
  },
  channel_xiaoxin: {
    channel_id:'channel_000038',
    name: '小新AI点评系统',
    ename:'XiaoxinAIbot',
    logo: './img/xiaoxin_logo.png',
    contact: '212575@qq.com'
  },
  channel_zoyu: {
    channel_id:'channel_000037',
    name: '智享优圈AI机器人',
    ename:'ZOYUAIbot',
    logo: './img/zxyq_logo.png',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/zoyu_kefu.jpg',
  },
  channel_zhuqi: {//channel_000021的二级代理
    channel_id:'channel_000036',
    name: '助企AI智能客服',
    ename:'助企AI智能客服',
    logo: './img/zhuqi_logo.jpg',
    contact: '0335—77738888'
  },
  channel_healo: {
    channel_id:'channel_000035',
    name: 'HealoAI销冠',
    ename:'HealoAIbot',
    logo: './img/healo_logo.png',
    contact: '2634337479@qq.com'
  },
  channel_xipapa: {
    channel_id:'channel_000034',
    name: '喜啪啪',
    ename:'XIPAPA',
    logo: './img/xipapa_logo.png',
    contact: '3672480844@qq.com'
  },
  channel_yunt: {
    channel_id:'channel_000033',
    name: 'yun机器人',
    ename:'yunAIbot',
    logo: './img/yunt_logo.png',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/yunt_kefu.png',
  },
  channel_ycat: {
    channel_id:'channel_000032',
    name: '小馋猫AI机器人',
    ename:'YCatAIbot',
    logo: './img/ycat_logo.jpg',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/ycat_kefu.png',
  },
  channel_nutri: {
    channel_id:'channel_000031',
    name: '谆医营养师AI分身',
    ename:'Z-NutriAIA',
    logo: './img/nutri_logo.png',
    contact: 'hrcai@126.com',
    enableFireflow: true
  },
  channel_wsy: {
    channel_id:'channel_000030',
    name: '微三云客服',
    ename:'wsykf',
    logo: './img/wsy_logo.jpg',
    contact: '扫描二维码添加人工客服微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/wsy_kefu.png',
  },
  channel_tuitu: {//channel_000021的二级代理
    channel_id:'channel_000029',
    name: '推途AI机器人',
    ename:'TuituAIbot',
    logo: './img/tuitu_logo.png',
    contact: '13599505936'
  },
  channel_lichuang: {
    channel_id:'channel_000028',
    name: '荔创AI机器人',
    ename:'LICHUANGAI',
    logo: './img/lichuang_logo.png',
    contact: '2390016326@qq.com'
  },
  channel_refresh: {
    channel_id:'channel_000027',
    name: '焕旅AI 智能体',
    ename:'RefreshAI Agent',
    logo: './img/refresh_logo.jpeg',
    contact: 'Service@Refreshtour.com',
    copyright: 'RefreshAi@2025 by 上海焕旅科技'
  },
  channel_tange: {
    channel_id:'channel_000026',
    name: '谈哥AI机器人',
    ename:'TangeAIbot',
    logo: './img/logo_tange.png',
    contact: '2463691166@qq.com'
  },
  channel_aiboss: {
    channel_id:'channel_000025',
    name: '矩阵盾',
    ename:'Dun Pro',
    logo: './img/logo_aiboss.png',
    contact: '31350072@qq.com'
  },
    channel_relaxai: {
    channel_id:'channel_000023',
    name: '微洽宝',
    ename:'RelaxAi',
    logo: './img/relax_logo.jpg',
    contact: 'service@relaxai.cn'
  },
  channel_yysay: {
    channel_id:'channel_000024',
    name: '有鱼智客',
    ename:'yysayAI',
    logo: './img/yysay_logo.png',
    contact: '扫描二维码添加人工客服企业微信',
    contactType: 'qrcode', // 二维码联系方式
    qrcodeUrl: 'https://healthyeveryday.oss-cn-shanghai.aliyuncs.com/yokoai/yokobot_img/yysay_kefu.png'
  },
  channel_xlc: {
    channel_id:'channel_000022',
    name: '小懒虫AI机器人',
    ename:'小懒虫AI机器人',
    logo: './img/xlc_logo.png',
    contact: '403298000@qq.com'
  },
  channel_Ant: {
    channel_id:'channel_000021',
    name: '蚂蚁AI机器人',
    ename:'AntAIbot',
    logo: './img/ant_logo.png',
    contact: '3236602296@qq.com',
    copyright: 'AntAI@2025 by 厦门极昼科技'
  },
  channel_stan: {
    channel_id:'channel_000020',
    name: '省探AI销售机器人',
    ename:'STAibot',
    logo: './img/stan_logo.png',
    contact: '929944920@qq.com',
    copyright: 'STAibot@2025 by 省探（云南）科技有限公司'
  },
  channel_linkc: {
    channel_id:'channel_000019',
    name: '灵宸AI',
    ename:'灵宸智能',
    logo: './img/linkc_logo.png',
    contact: 'qq：22528142',
    copyright: '灵宸AI@2025 by 贵州灵宸人工智能科技'
  },
  channel_astrai: {
    channel_id:'channel_000018',
    name: 'Astra机器人',
    ename:'Astrai',
    logo: './img/astra_logo.png',
    contact: '876560060@qq.com'
  },
  channel_xiaoxiao: {
    channel_id:'channel_000017',
    name: '肖肖AI机器人',
    ename:'肖肖AIBot',
    logo: './img/xiaoxiao_logo.png',
    contact: 'momobaby_2023(微信)'
  },
  channel_xw: {
    channel_id:'channel_000015',
    name: '星梧 AIBot',
    ename:'XWKJ AIBot',
    logo: './img/xw_logo.png',
    contact: 'i62417'
  },
  channel_dacore: {
    channel_id:'channel_000016',
    name: '大可AI金牌销售系统',
    ename:'Da Core',
    logo: './img/dacore_logo.png',
    contact: 'dd2211999（微信）'
  },
  channel_yun: {
    channel_id:'channel_000005',
    name: '云视界机器人',
    ename:'yunwebot',
    logo: './img/yun_logo.png',
    contact: '18925982768'
  },
  channel_wanxiao: {
    channel_id:'channel_000014',
    name: '万校互联',
    ename:'All Schools Connect',
    logo: './img/wanxiao_logo.png',
    contact: 'wxhl6688@163.com'
  },
  channel_zhipu: {
    channel_id:'channel_000013',
    name: '知普AI机器人',
    ename:'ZhipuAI',
    logo: './img/zhipu_logo.png',
    contact: 'lhg20290@nudt.edu.com'
  },
  channel_atom: {
    channel_id:'channel_000012',
    name: 'AtomAI机器人',
    ename:'AtomAIbot',
    logo: './img/atom_logo.png',
    contact: '591905097@qq.com'
  },
  channel_shaozi: {
    channel_id:'channel_000010',
    name: '勺子AI-数智员工',
    ename:'ShaoziAI-Bot',
    logo: './img/shaozi_logo.png',
    contact: 'ShaoziAI'
  },
  channel_xlai: {
    channel_id:'channel_000011',
    name: '星链AI销冠',
    ename:'XLAI Sales Champion',
    logo: './img/xlai_logo.png',
    contact: '400-6685-139'
  },
  channel_anlun: {
    channel_id:'channel_000006',
    name: '安伦科技',
    ename:'Anlunai',
    logo: './img/anlun_logo.png',
    contact: '19128689489'
  },
  channel_busi: {
    channel_id:'channel_000007',
    name: 'BusiAi智能客服',
    ename:'BusiAIbot',
    logo: './img/busi_logo.jpg',
    contact: '641460330@qq.com'
  },
  channel_super: {
    channel_id:'channel_000008',
    name: '销冠AI助理',
    ename:'畜牧军火库★销冠AI助理',
    alias: '畜牧军火库★销冠AI助理',
    logo: './img/super_logo.jpg',
    contact: '328441536@qq.com'
  },
  channel_allwise: {
    channel_id:'channel_000009',
    name: 'ALLWISE AI机器人',
    ename:'ALLWISE AIbot',
    logo: './img/alws_logo.jpg',
    contact: 'allwiseai'
  },
  channel_xunyi: {
    channel_id:'channel_000003',
    name: '潘军师机器人',
    ename:'PanAibot',
    logo: './img/XUNYI_logo.png',
    contact: '15977004390'
  },
  channel_aiok: {
    channel_id:'channel_000002',
    name: 'AI数字员工',
    ename:'AIOK',
    logo: './img/aiok_logo.png',
    contact: 'AIOK'
  }
}

// 获取当前渠道配置
export function getBrandConfig(): BrandConfig {
  const channel = localStorage.getItem('channel') || defaultChannel
  return brandConfig[channel] || brandConfig.default
}

// YoBot 是自有品牌迁移入口，仅对官方 default 渠道用户展示。
// default_rpa 及所有代理渠道均不展示，避免在 OEM 产品中暴露 YoBot 品牌。
// 注意：必须与字面量 'default' 比较，不能用 defaultChannel——
// 那是打包时按代理商改动的回退渠道，用它判断会让入口跟着出包渠道漂移。
export function shouldShowYobotPromotion(): boolean {
  const channel = localStorage.getItem('channel') || defaultChannel
  return channel === 'default'
}

// 微信版本下载链接：
// - 自有渠道(default / default_rpa) → 飞书下载指南（带自有品牌）
// - 其余代理商渠道 → 通用下载站（不暴露自有 logo）
const WECHAT_DOWNLOAD_FEISHU = 'https://n2b8xxdgjx.feishu.cn/wiki/Nbauw9HWsihsQ7kgjYPcfZSCnKb'
const WECHAT_DOWNLOAD_GENERIC = 'https://n2b8xxdgjx.feishu.cn/wiki/Nbauw9HWsihsQ7kgjYPcfZSCnKb'
const OWN_BRAND_CHANNELS = ['default', 'default_rpa']

export function getWechatDownloadUrl(): string {
  const channel = localStorage.getItem('channel') || defaultChannel
  return OWN_BRAND_CHANNELS.includes(channel) ? WECHAT_DOWNLOAD_FEISHU : WECHAT_DOWNLOAD_GENERIC
}
