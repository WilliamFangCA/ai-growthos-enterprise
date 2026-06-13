// 內容工廠 — 預設情境範例模板
// 點擊後填入 prompt 輸入框（可編輯）。依當前介面語言取用對應文案。
// 【】內為使用者需替換的占位內容。

export const CONTENT_PRESETS = {
  article: [
    {
      id: 'launch',
      icon: '🚀',
      label: { en: 'Product Launch', 'zh-TW': '新品發布文', 'zh-CN': '新品发布文' },
      prompt: {
        'zh-TW': '為【產品名稱】撰寫一篇新品發布文章。產品核心賣點：【賣點1、賣點2、賣點3】。目標讀者：【目標客群】。需包含：吸睛開頭、痛點描述、產品如何解決、早鳥優惠資訊（【優惠內容】）、行動呼籲。',
        'zh-CN': '为【产品名称】撰写一篇新品发布文章。产品核心卖点：【卖点1、卖点2、卖点3】。目标读者：【目标客群】。需包含：吸睛开头、痛点描述、产品如何解决、早鸟优惠信息（【优惠内容】）、行动呼吁。',
        en: 'Write a product launch article for [PRODUCT]. Key selling points: [POINT 1, 2, 3]. Target audience: [AUDIENCE]. Include: hook opening, pain points, how the product solves them, early-bird offer ([OFFER]), and a call to action.',
      },
    },
    {
      id: 'howto',
      icon: '📖',
      label: { en: 'How-to Guide', 'zh-TW': '教學文', 'zh-CN': '教学文' },
      prompt: {
        'zh-TW': '撰寫一篇「如何【解決某問題 / 完成某任務】」的教學文章，目標讀者是【新手 / 進階使用者】。結構：問題場景 → 準備事項 → 5-7 個步驟（每步含具體操作與常見錯誤提醒）→ 進階技巧 → 總結。文末自然帶入【產品 / 服務】如何讓這件事更簡單。',
        'zh-CN': '撰写一篇「如何【解决某问题 / 完成某任务】」的教学文章，目标读者是【新手 / 进阶用户】。结构：问题场景 → 准备事项 → 5-7 个步骤（每步含具体操作与常见错误提醒）→ 进阶技巧 → 总结。文末自然带入【产品 / 服务】如何让这件事更简单。',
        en: 'Write a how-to guide on "[TASK/PROBLEM]" for [beginner/advanced] readers. Structure: scenario → prerequisites → 5-7 steps (with actions and common mistakes) → pro tips → summary. End by naturally mentioning how [PRODUCT] makes this easier.',
      },
    },
    {
      id: 'casestudy',
      icon: '🏆',
      label: { en: 'Case Study', 'zh-TW': '客戶案例研究', 'zh-CN': '客户案例研究' },
      prompt: {
        'zh-TW': '撰寫一篇客戶成功案例文章。客戶背景：【產業、公司規模】。遇到的挑戰：【挑戰描述】。使用【產品名稱】後的成果：【具體數據，如轉化率+30%、成本-20%】。包含客戶引言（自然口語化）與「他們是怎麼做到的」3 個關鍵步驟。',
        'zh-CN': '撰写一篇客户成功案例文章。客户背景：【行业、公司规模】。遇到的挑战：【挑战描述】。使用【产品名称】后的成果：【具体数据，如转化率+30%、成本-20%】。包含客户引言（自然口语化）与「他们是怎么做到的」3 个关键步骤。',
        en: 'Write a customer case study. Background: [INDUSTRY, COMPANY SIZE]. Challenge: [CHALLENGE]. Results after using [PRODUCT]: [METRICS e.g. +30% conversion]. Include a natural customer quote and 3 key steps of how they did it.',
      },
    },
    {
      id: 'trend',
      icon: '📈',
      label: { en: 'Industry Trends', 'zh-TW': '產業趨勢分析', 'zh-CN': '行业趋势分析' },
      prompt: {
        'zh-TW': '撰寫一篇【產業名稱】2026 年趨勢分析文章，給【目標讀者】看。涵蓋 3-5 個關鍵趨勢，每個趨勢含：現況數據或案例、對讀者的影響、可立即採取的行動建議。結尾給出「現在就該做的 3 件事」清單。',
        'zh-CN': '撰写一篇【行业名称】2026 年趋势分析文章，给【目标读者】看。涵盖 3-5 个关键趋势，每个趋势含：现状数据或案例、对读者的影响、可立即采取的行动建议。结尾给出「现在就该做的 3 件事」清单。',
        en: 'Write a 2026 trend analysis for the [INDUSTRY] industry, aimed at [AUDIENCE]. Cover 3-5 key trends, each with current data/examples, impact on the reader, and actionable advice. End with a "3 things to do now" list.',
      },
    },
  ],
  social: [
    {
      id: 'festival',
      icon: '🎊',
      label: { en: 'Holiday Post', 'zh-TW': '節慶貼文', 'zh-CN': '节庆贴文' },
      prompt: {
        'zh-TW': '為【節日，如中秋節 / 雙11 / 聖誕節】寫一則社群貼文。品牌：【品牌名稱】。活動內容：【優惠或活動描述】。需包含：節慶氛圍開場、優惠亮點（用列點）、限時急迫感、互動引導（留言 / 標記好友）、3-5 個 hashtag。',
        'zh-CN': '为【节日，如中秋节 / 双11 / 圣诞节】写一则社群贴文。品牌：【品牌名称】。活动内容：【优惠或活动描述】。需包含：节庆氛围开场、优惠亮点（用列点）、限时急迫感、互动引导（留言 / 标记好友）、3-5 个 hashtag。',
        en: 'Write a social post for [HOLIDAY]. Brand: [BRAND]. Promotion: [OFFER]. Include: festive opening, offer highlights (bullets), urgency, engagement hook (comment/tag a friend), and 3-5 hashtags.',
      },
    },
    {
      id: 'giveaway',
      icon: '🎁',
      label: { en: 'Giveaway', 'zh-TW': '抽獎活動貼文', 'zh-CN': '抽奖活动贴文' },
      prompt: {
        'zh-TW': '寫一則抽獎活動社群貼文。獎品：【獎品內容與名額】。參加方式：【按讚 + 留言 + 標記 2 位好友 / 分享限動】。截止時間：【日期】。開獎方式：【日期與方式】。語氣活潑有趣，開頭要在 1 秒內抓住注意力，結尾提醒「別忘了開啟小鈴鐺」。',
        'zh-CN': '写一则抽奖活动社群贴文。奖品：【奖品内容与名额】。参加方式：【点赞 + 留言 + 标记 2 位好友 / 分享限动】。截止时间：【日期】。开奖方式：【日期与方式】。语气活泼有趣，开头要在 1 秒内抓住注意力，结尾提醒「别忘了开启小铃铛」。',
        en: 'Write a giveaway post. Prize: [PRIZE & WINNERS]. How to enter: [like + comment + tag 2 friends / share story]. Deadline: [DATE]. Winner announcement: [DATE & METHOD]. Fun, attention-grabbing first line; end with "turn on notifications".',
      },
    },
    {
      id: 'ugc',
      icon: '📸',
      label: { en: 'UGC Campaign', 'zh-TW': 'UGC 曬單徵集', 'zh-CN': 'UGC 晒单征集' },
      prompt: {
        'zh-TW': '寫一則 UGC 徵集貼文，邀請顧客分享使用【產品名稱】的照片 / 心得。獎勵機制：【積分 / 折扣 / 精選轉發】。指定 hashtag：【#品牌標籤】。包含：為什麼想看大家的分享（情感連結）、參與步驟（3 步內）、優秀範例會獲得什麼。',
        'zh-CN': '写一则 UGC 征集贴文，邀请顾客分享使用【产品名称】的照片 / 心得。奖励机制：【积分 / 折扣 / 精选转发】。指定 hashtag：【#品牌标签】。包含：为什么想看大家的分享（情感连结）、参与步骤（3 步内）、优秀范例会获得什么。',
        en: 'Write a UGC collection post inviting customers to share photos/reviews of [PRODUCT]. Reward: [POINTS/DISCOUNT/FEATURE]. Hashtag: [#BRANDTAG]. Include: emotional why, 3-step participation, and what featured posts get.',
      },
    },
    {
      id: 'behindscenes',
      icon: '🎬',
      label: { en: 'Behind the Scenes', 'zh-TW': '品牌幕後故事', 'zh-CN': '品牌幕后故事' },
      prompt: {
        'zh-TW': '寫一則品牌幕後故事貼文。主題：【產品製作過程 / 團隊日常 / 創辦初心】。要有真實感與溫度，講一個具體的小故事（包含一個轉折或困難時刻），結尾連結到品牌理念，並邀請粉絲分享自己的故事。',
        'zh-CN': '写一则品牌幕后故事贴文。主题：【产品制作过程 / 团队日常 / 创办初心】。要有真实感与温度，讲一个具体的小故事（包含一个转折或困难时刻），结尾连结到品牌理念，并邀请粉丝分享自己的故事。',
        en: 'Write a behind-the-scenes post. Topic: [PRODUCTION PROCESS / TEAM LIFE / FOUNDING STORY]. Make it authentic and warm — tell one specific small story with a turning point, tie it to brand values, invite followers to share theirs.',
      },
    },
  ],
  ad: [
    {
      id: 'flashsale',
      icon: '⚡',
      label: { en: 'Flash Sale', 'zh-TW': '限時促銷廣告', 'zh-CN': '限时促销广告' },
      prompt: {
        'zh-TW': '為【產品名稱】寫限時促銷廣告文案。優惠：【折扣內容，如全館 7 折】。限時：【倒數時間，如 48 小時】。目標受眾：【受眾描述】。用 AIDA 結構，主打急迫感與損失規避（「錯過再等一年」），給 2 個版本：理性版（強調省多少）與感性版（強調體驗）。',
        'zh-CN': '为【产品名称】写限时促销广告文案。优惠：【折扣内容，如全馆 7 折】。限时：【倒数时间，如 48 小时】。目标受众：【受众描述】。用 AIDA 结构，主打急迫感与损失规避（「错过再等一年」），给 2 个版本：理性版（强调省多少）与感性版（强调体验）。',
        en: 'Write flash sale ad copy for [PRODUCT]. Offer: [DISCOUNT]. Time limit: [COUNTDOWN]. Audience: [AUDIENCE]. AIDA structure, urgency + loss aversion. Provide 2 versions: rational (savings) and emotional (experience).',
      },
    },
    {
      id: 'retargeting',
      icon: '🔄',
      label: { en: 'Retargeting', 'zh-TW': '再行銷廣告', 'zh-CN': '再营销广告' },
      prompt: {
        'zh-TW': '為「看過【產品名稱】但沒購買」的受眾寫再行銷廣告文案。可能的猶豫原因：【價格 / 信任 / 比較中】。文案需：喚起他們瀏覽過的記憶、針對猶豫點給出反駁（社會證明 / 保證 / 評價數據）、提供回頭誘因（【折扣碼 / 免運】）。給 3 個不同切角的短版本。',
        'zh-CN': '为「看过【产品名称】但没购买」的受众写再营销广告文案。可能的犹豫原因：【价格 / 信任 / 比较中】。文案需：唤起他们浏览过的记忆、针对犹豫点给出反驳（社会证明 / 保证 / 评价数据）、提供回头诱因（【折扣码 / 免运】）。给 3 个不同切角的短版本。',
        en: 'Write retargeting ad copy for people who viewed [PRODUCT] but did not buy. Likely hesitation: [PRICE/TRUST/COMPARING]. Recall their visit, counter the hesitation (social proof/guarantee/reviews), offer a comeback incentive ([CODE/FREE SHIPPING]). 3 short versions with different angles.',
      },
    },
    {
      id: 'awareness',
      icon: '💡',
      label: { en: 'Brand Awareness', 'zh-TW': '品牌認知廣告', 'zh-CN': '品牌认知广告' },
      prompt: {
        'zh-TW': '為【品牌名稱】寫品牌認知廣告文案，目標是讓【目標客群】第一次認識我們。品牌定位：【一句話定位】。與競品的差異：【差異點】。不要直接促銷，用一個引發共鳴的問題或場景開頭，建立「這品牌懂我」的感受，結尾輕 CTA（追蹤 / 了解更多）。',
        'zh-CN': '为【品牌名称】写品牌认知广告文案，目标是让【目标客群】第一次认识我们。品牌定位：【一句话定位】。与竞品的差异：【差异点】。不要直接促销，用一个引发共鸣的问题或场景开头，建立「这品牌懂我」的感受，结尾轻 CTA（关注 / 了解更多）。',
        en: 'Write brand awareness ad copy for [BRAND], introducing us to [AUDIENCE] for the first time. Positioning: [ONE-LINER]. Differentiator: [DIFFERENCE]. No hard sell — open with a resonant question or scene, build "this brand gets me", soft CTA (follow/learn more).',
      },
    },
  ],
  campaign: [
    {
      id: 'double11',
      icon: '🛒',
      label: { en: 'Double 11 / Black Friday', 'zh-TW': '雙11 大促企劃', 'zh-CN': '双11 大促企划' },
      prompt: {
        'zh-TW': '用 TIP 模型規劃【品牌名稱】的雙11 大促活動。目標：【GMV 目標 / 新客數】。預算：【金額】。主力商品：【商品清單】。需包含：預熱期（前 2 週）/ 爆發期（當天）/ 返場期（後 3 天）三階段的工具選擇、渠道場景、優惠包裝、每日節奏表與 KPI。',
        'zh-CN': '用 TIP 模型规划【品牌名称】的双11 大促活动。目标：【GMV 目标 / 新客数】。预算：【金额】。主力商品：【商品清单】。需包含：预热期（前 2 周）/ 爆发期（当天）/ 返场期（后 3 天）三阶段的工具选择、渠道场景、优惠包装、每日节奏表与 KPI。',
        en: 'Plan a Double 11 / Black Friday campaign for [BRAND] using the TIP model. Goal: [GMV/NEW CUSTOMERS]. Budget: [AMOUNT]. Hero products: [LIST]. Cover warm-up (2 weeks) / peak day / encore (3 days): tools, channels, offer packaging, daily rhythm, KPIs.',
      },
    },
    {
      id: 'memberday',
      icon: '👑',
      label: { en: 'Member Day', 'zh-TW': '會員日活動', 'zh-CN': '会员日活动' },
      prompt: {
        'zh-TW': '規劃【品牌名稱】的每月會員日活動（每月【日期】）。會員等級：【等級結構】。目標：提升會員活躍與復購。設計：各等級專屬優惠差異化、積分加倍機制、會員專屬限定品、非會員當天入會誘因、LINE/Email 通知節奏（前 3 天 / 前 1 天 / 當天）。',
        'zh-CN': '规划【品牌名称】的每月会员日活动（每月【日期】）。会员等级：【等级结构】。目标：提升会员活跃与复购。设计：各等级专属优惠差异化、积分加倍机制、会员专属限定品、非会员当天入会诱因、LINE/Email 通知节奏（前 3 天 / 前 1 天 / 当天）。',
        en: 'Plan a monthly Member Day for [BRAND] (on the [DATE] each month). Tiers: [STRUCTURE]. Goal: boost member activity & repurchase. Design tier-differentiated offers, double points, member-only exclusives, same-day join incentive for non-members, and notification rhythm (D-3/D-1/day-of).',
      },
    },
    {
      id: 'grandopening',
      icon: '🎉',
      label: { en: 'Grand Opening', 'zh-TW': '新店開幕企劃', 'zh-CN': '新店开幕企划' },
      prompt: {
        'zh-TW': '規劃【店名 / 品牌】新店開幕活動。地點：【城市商圈】。開幕日：【日期】。預算:【金額】。需包含：開幕前造勢（社群倒數 / KOL 探店 / 在地社團）、開幕週活動（前 100 名禮 / 打卡送 / 限定套餐）、開幕後留客機制（加 LINE 領券 / 集點卡），與每項的預估成本和預期人流。',
        'zh-CN': '规划【店名 / 品牌】新店开幕活动。地点：【城市商圈】。开幕日：【日期】。预算：【金额】。需包含：开幕前造势（社群倒数 / KOL 探店 / 在地社团）、开幕周活动（前 100 名礼 / 打卡送 / 限定套餐）、开幕后留客机制（加 LINE 领券 / 集点卡），与每项的预估成本和预期人流。',
        en: 'Plan a grand opening for [STORE/BRAND]. Location: [AREA]. Date: [DATE]. Budget: [AMOUNT]. Include pre-launch buzz (countdown/KOL visits/local groups), opening-week activities (first-100 gifts/check-in rewards/limited sets), post-opening retention (LINE coupon/stamp card), with cost and traffic estimates per item.',
      },
    },
    {
      id: 'referral',
      icon: '🤝',
      label: { en: 'Referral Program', 'zh-TW': '老帶新裂變活動', 'zh-CN': '老带新裂变活动' },
      prompt: {
        'zh-TW': '設計【品牌名稱】的老帶新裂變活動。現有客戶數：【人數】。目標：【新客目標】。設計雙向獎勵機制（推薦人與被推薦人各得什麼）、推薦碼 / 連結機制、防刷單規則、3 波推廣節奏（上線通知 → 中期戰報刺激 → 最後衝刺），並預估 K 因子與成本。',
        'zh-CN': '设计【品牌名称】的老带新裂变活动。现有客户数：【人数】。目标：【新客目标】。设计双向奖励机制（推荐人与被推荐人各得什么）、推荐码 / 链接机制、防刷单规则、3 波推广节奏（上线通知 → 中期战报刺激 → 最后冲刺），并预估 K 因子与成本。',
        en: 'Design a referral program for [BRAND]. Existing customers: [N]. Goal: [NEW CUSTOMER TARGET]. Design two-sided rewards, referral code/link mechanics, anti-fraud rules, 3-wave promotion rhythm (launch → mid-campaign leaderboard → final push), estimated K-factor and cost.',
      },
    },
  ],
  image: [
    {
      id: 'productshot',
      icon: '📦',
      label: { en: 'Product Shot', 'zh-TW': '商品情境圖', 'zh-CN': '商品情境图' },
      prompt: {
        'zh-TW': '一張【產品名稱，如：手工皂禮盒】的商業攝影情境圖，擺放在【場景，如：原木桌面、自然採光的窗邊】，背景【風格，如：溫暖米色調、淺景深】，高質感電商主圖風格，4K 細節。',
        'zh-CN': '一张【产品名称，如：手工皂礼盒】的商业摄影情境图，摆放在【场景，如：原木桌面、自然采光的窗边】，背景【风格，如：温暖米色调、浅景深】，高质感电商主图风格，4K 细节。',
        en: 'A commercial product photo of [PRODUCT, e.g. handmade soap gift set] placed on [SCENE, e.g. a wooden table by a sunlit window], background [STYLE, e.g. warm beige tones, shallow depth of field], premium e-commerce hero shot, 4K detail.',
      },
    },
    {
      id: 'socialvisual',
      icon: '🖼️',
      label: { en: 'Social Visual', 'zh-TW': '社群貼文視覺', 'zh-CN': '社群贴文视觉' },
      prompt: {
        'zh-TW': '為主題「【貼文主題，如：夏季新品上市】」設計一張 Instagram 貼文視覺，風格【扁平插畫 / 3D 渲染 / 真實攝影】，主色調【品牌色，如：珊瑚橘與奶油白】，畫面簡潔有留白，吸睛且適合行動端瀏覽。',
        'zh-CN': '为主题「【贴文主题，如：夏季新品上市】」设计一张 Instagram 贴文视觉，风格【扁平插画 / 3D 渲染 / 真实摄影】，主色调【品牌色，如：珊瑚橘与奶油白】，画面简洁有留白，吸睛且适合移动端浏览。',
        en: 'Design an Instagram post visual for "[TOPIC, e.g. summer launch]", style [flat illustration / 3D render / photography], main colors [BRAND COLORS, e.g. coral and cream], clean composition with whitespace, eye-catching and mobile-friendly.',
      },
    },
    {
      id: 'banner',
      icon: '🪧',
      label: { en: 'Ad Banner', 'zh-TW': '廣告 Banner 背景', 'zh-CN': '广告 Banner 背景' },
      prompt: {
        'zh-TW': '一張【活動主題，如：雙 11 限時優惠】的廣告 Banner 背景圖，【風格，如：科技感漸層、節慶喜氣】，留出中央文字區域，色彩對比強烈、具行動呼籲氛圍，適合電商版頭。',
        'zh-CN': '一张【活动主题，如：双 11 限时优惠】的广告 Banner 背景图，【风格，如：科技感渐变、节庆喜气】，留出中央文字区域，色彩对比强烈、具行动呼吁氛围，适合电商版头。',
        en: 'An ad banner background for [CAMPAIGN, e.g. 11.11 flash sale], [STYLE, e.g. tech gradient / festive], with empty central area for text overlay, strong color contrast, CTA-ready mood, suited for an e-commerce header.',
      },
    },
    {
      id: 'brandmascot',
      icon: '🦊',
      label: { en: 'Brand Mascot', 'zh-TW': '品牌吉祥物', 'zh-CN': '品牌吉祥物' },
      prompt: {
        'zh-TW': '設計一隻【動物 / 角色，如：橘色小狐狸】作為【品牌類型，如：咖啡品牌】的吉祥物，個性【活潑友善 / 沉穩專業】，圓潤可愛的卡通風格，正面全身像，乾淨純色背景，適合做貼圖與周邊。',
        'zh-CN': '设计一只【动物 / 角色，如：橘色小狐狸】作为【品牌类型，如：咖啡品牌】的吉祥物，个性【活泼友善 / 沉稳专业】，圆润可爱的卡通风格，正面全身像，干净纯色背景，适合做贴图与周边。',
        en: 'Design a [ANIMAL/CHARACTER, e.g. orange fox] mascot for a [BRAND TYPE, e.g. coffee brand], personality [friendly / professional], rounded cute cartoon style, full-body front view, clean solid background, suitable for stickers and merch.',
      },
    },
  ],
  video: [
    {
      id: 'productdemo',
      icon: '🛍️',
      label: { en: 'Product Showcase', 'zh-TW': '商品展示短片', 'zh-CN': '商品展示短片' },
      prompt: {
        'zh-TW': '【產品名稱】的特寫展示鏡頭：產品在【場景，如：旋轉展示台】上緩慢旋轉，柔和的攝影棚燈光掃過表面細節，背景【乾淨漸層 / 生活場景】，質感高級，類似精品廣告運鏡。',
        'zh-CN': '【产品名称】的特写展示镜头：产品在【场景，如：旋转展示台】上缓慢旋转，柔和的摄影棚灯光扫过表面细节，背景【干净渐变 / 生活场景】，质感高级，类似精品广告运镜。',
        en: 'Close-up showcase of [PRODUCT]: the product slowly rotates on [SCENE, e.g. a turntable], soft studio light sweeping across surface details, background [clean gradient / lifestyle scene], premium feel, luxury-ad style camera work.',
      },
    },
    {
      id: 'brandstory',
      icon: '🎞️',
      label: { en: 'Brand Mood Clip', 'zh-TW': '品牌氛圍短片', 'zh-CN': '品牌氛围短片' },
      prompt: {
        'zh-TW': '一段【品牌調性，如：溫暖手作感】的品牌氛圍影片：【畫面內容，如：清晨陽光灑進工作室，職人雙手沖煮咖啡，蒸氣緩緩上升】，慢鏡頭、淺景深、電影感色調。',
        'zh-CN': '一段【品牌调性，如：温暖手作感】的品牌氛围视频：【画面内容，如：清晨阳光洒进工作室，职人双手冲煮咖啡，蒸气缓缓上升】，慢镜头、浅景深、电影感色调。',
        en: 'A [BRAND MOOD, e.g. warm artisanal] brand mood clip: [SCENE, e.g. morning light pouring into a studio, hands brewing coffee, steam rising slowly], slow motion, shallow depth of field, cinematic color grade.',
      },
    },
    {
      id: 'socialad',
      icon: '📱',
      label: { en: 'Social Ad Clip', 'zh-TW': '社群廣告素材', 'zh-CN': '社群广告素材' },
      prompt: {
        'zh-TW': '適合 Reels / TikTok 的直式廣告畫面：【主體，如：年輕人在城市街頭使用產品】，節奏明快、色彩鮮明、動感運鏡，開頭 1 秒就有視覺衝擊，結尾畫面留空供加上 CTA 文字。',
        'zh-CN': '适合 Reels / TikTok 的竖版广告画面：【主体，如：年轻人在城市街头使用产品】，节奏明快、色彩鲜明、动感运镜，开头 1 秒就有视觉冲击，结尾画面留空供加上 CTA 文字。',
        en: 'A vertical ad clip for Reels/TikTok: [SUBJECT, e.g. young people using the product on a city street], fast-paced, vivid colors, dynamic camera moves, visual hook in the first second, ending frame left clean for CTA text.',
      },
    },
    {
      id: 'logointro',
      icon: '✨',
      label: { en: 'Logo Intro', 'zh-TW': 'Logo 開場動畫', 'zh-CN': 'Logo 开场动画' },
      prompt: {
        'zh-TW': '一段品牌開場動畫概念畫面：【元素，如：金色粒子】在深色背景中匯聚成發光的標誌形狀，光暈擴散，氛圍【科技感 / 奢華感 / 清新自然】，適合影片開頭 5 秒使用。',
        'zh-CN': '一段品牌开场动画概念画面：【元素，如：金色粒子】在深色背景中汇聚成发光的标志形状，光晕扩散，氛围【科技感 / 奢华感 / 清新自然】，适合视频开头 5 秒使用。',
        en: 'A brand intro concept: [ELEMENTS, e.g. golden particles] converging into a glowing logo shape on a dark background, halo light spreading, mood [tech / luxury / fresh & natural], suited for the first 5 seconds of a video.',
      },
    },
  ],
  music: [
    {
      id: 'brandbgm',
      icon: '🎧',
      label: { en: 'Brand BGM', 'zh-TW': '品牌背景音樂', 'zh-CN': '品牌背景音乐' },
      prompt: {
        'zh-TW': '為【品牌類型，如：質感咖啡店】創作一段背景音樂，氛圍【放鬆溫暖 / 專業俐落】，節奏中慢板，樂器以【鋼琴與木吉他 / 電子合成器】為主，適合店內循環播放與影片配樂。',
        'zh-CN': '为【品牌类型，如：质感咖啡店】创作一段背景音乐，氛围【放松温暖 / 专业利落】，节奏中慢板，乐器以【钢琴与木吉他 / 电子合成器】为主，适合店内循环播放与视频配乐。',
        en: 'Create background music for a [BRAND TYPE, e.g. specialty café], mood [relaxed & warm / clean & professional], mid-slow tempo, led by [piano & acoustic guitar / synths], suitable for in-store loops and video scoring.',
      },
    },
    {
      id: 'adjingle',
      icon: '📣',
      label: { en: 'Ad Jingle', 'zh-TW': '廣告主題曲', 'zh-CN': '广告主题曲' },
      prompt: {
        'zh-TW': '為【產品 / 活動，如：夏季新品上市】寫一首朗朗上口的廣告短歌，風格【流行輕快 / 復古放克】，副歌要重複品牌名「【品牌名】」，旋律簡單好記、30 秒內讓人留下印象。',
        'zh-CN': '为【产品 / 活动，如：夏季新品上市】写一首朗朗上口的广告短歌，风格【流行轻快 / 复古放克】，副歌要重复品牌名「【品牌名】」，旋律简单好记、30 秒内让人留下印象。',
        en: 'Write a catchy ad jingle for [PRODUCT/CAMPAIGN, e.g. summer launch], style [upbeat pop / retro funk], chorus repeating the brand name "[BRAND]", simple memorable melody that sticks within 30 seconds.',
      },
    },
    {
      id: 'eventopening',
      icon: '🎪',
      label: { en: 'Event Opening', 'zh-TW': '活動開場音樂', 'zh-CN': '活动开场音乐' },
      prompt: {
        'zh-TW': '為【活動類型，如：產品發表會】創作開場音樂，情緒由緩漸強、層層堆疊到高潮，風格【史詩管弦 / 電子節拍】，營造期待感與儀式感，適合燈光亮起的進場瞬間。',
        'zh-CN': '为【活动类型，如：产品发布会】创作开场音乐，情绪由缓渐强、层层堆叠到高潮，风格【史诗管弦 / 电子节拍】，营造期待感与仪式感，适合灯光亮起的进场瞬间。',
        en: 'Create opening music for a [EVENT TYPE, e.g. product launch], building from calm to a climactic peak, style [epic orchestral / electronic beats], creating anticipation and ceremony for the moment the lights come up.',
      },
    },
    {
      id: 'lofiwork',
      icon: '🌙',
      label: { en: 'Lo-fi Ambience', 'zh-TW': 'Lo-fi 氛圍曲', 'zh-CN': 'Lo-fi 氛围曲' },
      prompt: {
        'zh-TW': '一首 Lo-fi Chill 氛圍曲，主題是【場景，如：深夜的工作室】，慵懶的鼓點、溫暖的電鋼琴、輕微的黑膠底噪，情緒放鬆專注，適合直播背景與學習工作歌單。',
        'zh-CN': '一首 Lo-fi Chill 氛围曲，主题是【场景，如：深夜的工作室】，慵懒的鼓点、温暖的电钢琴、轻微的黑胶底噪，情绪放松专注，适合直播背景与学习工作歌单。',
        en: 'A lo-fi chill track themed around [SCENE, e.g. a studio late at night], lazy drums, warm electric piano, subtle vinyl crackle, relaxed and focused mood, perfect for stream backgrounds and study playlists.',
      },
    },
  ],
};
