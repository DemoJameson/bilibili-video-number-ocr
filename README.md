[B 站](https://www.bilibili.com/index.html)有个非官方的[周刊排行榜](https://search.bilibili.com/all?keyword=%E5%91%A8%E5%88%8A%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E6%8E%92%E8%A1%8C%E6%A6%9C&from_source=video_tag)做的很好，到现在已经有 362 期持续 7 年了。曾经有段时间视频中的视频编号可以点击跳转到对应的视频，目测是通过高级弹幕实现的，但不只为何后来又没了。为了让自己在看到感兴趣的视频时，免去从全屏状态退出然后手输视频编号的麻烦，写了一个油猴脚本自动提取视频编号，然后在后台打开视频或者在页面上插入视频链接，以便稍后观看。

<!--more-->

# 原理

通过 canvas 截取 H5 视频中某时刻的部分内容，然后借助 [Tesseract](https://github.com/naptha/tesseract.js) 这个 OCR 库来识别图片中的视频编号。

# 使用说明

1. 安装扩展浏览器扩展 [Tampermonkey](https://tampermonkey.net/)
2. 安装本工具脚本，[点击安装](https://openuserjs.org/install/DemoJameson/B_%E7%AB%99%E6%8E%92%E8%A1%8C%E6%A6%9C%E7%B1%BB%E8%A7%86%E9%A2%91%E4%B8%AD_av_%E7%BC%96%E5%8F%B7%E6%8F%90%E5%8F%96%E5%B7%A5%E5%85%B7.user.js)
3. 打开一个榜单类视频，比如[周刊排行榜](https://search.bilibili.com/all?keyword=%E5%91%A8%E5%88%8A%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E6%8E%92%E8%A1%8C%E6%A6%9C&from_source=video_tag)
4. 播放视频，按下 Alt+A 键后使用鼠标左键拖拽放手选定视频编号所在的区域
5. 确认选定的区域包含视频编号（以弹出图片的形式供用户确认）
6. 回到视频，按下 Alt+Q 键开始识别（初次使用需等待加载识别库加载数据，大小为 9m）
7. 识别成功后会在后台新标签页打开编号对应的视频，或者在当前页插入链接，或者在评论框插入视频编号标题

# 注意事项

* 必须使用 HTML5 播放器
* 首次使用必须等待加载 OCR 数据，时间可能有点久（我能怎么办，我也很绝望啊），加载进度会显示在浏览器标签页上
* 选择区域和识别的快捷键可定制
* 识别成功后执行的操作可开关