# 提问之后的 10 秒 · Remotion 科普短片

用 Remotion 做的科普视频：用户点下发送后，AI 在约 10 秒里到底做了什么。
清新亮色版：薄荷绿 / 天蓝 / 奶油白，10 个场景，整体 10 倍慢放，左上角常驻「提问后第 X 秒」。

预览地址：http://localhost:3111/AiAnswer10s （`npm run dev` 启动 Studio）

## 这一版改了什么

| 反馈 | 处理 |
| --- | --- |
| 音效呢 | 全片 21 个音效在本地程序化合成（`scripts/gen-audio.js`，正弦+噪声，无外部素材）：打字、剪刀、弹出、层塔咔哒、骰子、红叉、门灯、打字机、收尾和弦，另有轻声背景音乐与思考铺垫音；`node scripts/check-audio.js` 自动质检（时长/削波/静音） |
| 不要全是字 | 每幕以角色和图形动画为主，文字只剩 1 行字幕 + 2～3 个指向画面的短标注 |
| 多加动画 / 复杂点 | 小机器人贯穿全片；切词剪刀、词向量泡泡云、16 层塔与注意力弧线、便利贴草稿、词表扇形打分、概率柱+温度滑杆+骰子、五检查门、传送带流水线、总结七步卡 |
| 清新点 | 奶油底 + 薄荷/天蓝/丁香柔光，白卡片圆角，背景 6 颗半透明泡泡缓慢漂浮，白色暗角（不发暗） |
| 元素超出边界 | 全场景按 x∈[150,1770]、y∈[120,880] 排版，底部字幕 y≈905，进度条 bottom:24，水印右下角；逐帧抽检过每一幕 |
| 别太抽象 | 每个动画元素旁都有具体标注（如「8 个字 → 8 个 token」「4096 个小数」「第 12/16 层」「62 个/秒」），字幕给结论 |
| 界面设计 | 参考 Apple 流体界面规范：落地的卡片用 spring 回弹、普通出现用 cubic 缓出、退出与进入同路径反向、标题负字距、HUD 等宽数字 |

## 命令

```bash
npm run dev                     # Remotion Studio 预览（逐帧拖时间轴、改 props）
npm run lint                    # eslint + tsc
node scripts/gen-audio.js       # 重新合成音效 → public/sfx
node scripts/check-audio.js     # 音效质检
npx remotion render AiAnswer10s out/ai-answer-10s.mp4
npx remotion render SfxPreview out/sfx-finale.mp4   # 只导出一段音效试听
```

Studio 里 `Scenes` 文件夹下每一幕都是独立 composition，可单独打开/渲染；`Audio` 文件夹下 `SfxPreview` 可单独听某个音效。

## 目录

```
src/
  Video.tsx            主时间轴：10 个 Sequence + 进度条 + 水印 + 音效轨 + 背景音乐
  Root.tsx             注册 AiAnswer10s、10 个分镜、SfxPreview
  lib/
    theme.ts           配色 / 安全区 / 场景时长（秒→帧）
    motion.ts          节奏曲线：enter / springIn / appear / leave / pulseAt…
    font.ts            微软雅黑加载（StrictMode 安全）
    cues.ts            全片音效清单（帧 → 音效），按帧升序
    sfxTimeline.ts     calculateMetadata：读 WAV 真实时长排成一条音轨 + 声明音频资源
    answer.ts          示例请假邮件文本
  components/
    cast.tsx           小机器人 / 柔光 / 对勾叉
    ui.tsx             Header / Card / Caption / Chip
    chrome.tsx         背景、时钟 HUD
    fx.tsx             向量条、连线、彩带、气泡、进度环…
    SfxTrack.tsx       音效轨与背景音乐
    Watermark.tsx      右下角水印
  scenes/              00 → 09 共 10 个分镜
scripts/
  gen-audio.js         程序化合成音效（纯本地，无外部素材）
  check-audio.js       音效质检
  ttc2ttf.js           从 Windows msyh.ttc 拆出 TTF
```

## 说明

- 片中的数字（4096 维、10 万词表、0.4 秒首字延迟、62 tokens/s、282 个 token、16 层）都是讲解用的示意量级，不同模型会有差异。
- 字体与音效均在本机生成，仅用于本机渲染；对外分发请换有授权的中文字体，音效可保留或重做。
- 若 C 盘空间紧张导致渲染失败，把 `TEMP`/`TMP` 指到 D 盘再渲染。
