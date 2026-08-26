# TTS 解说词生成:按 douyin-script 分镜逐句合成 wav(Windows System.Speech 离线)
Add-Type -AssemblyName System.Speech
$out = Join-Path $PSScriptRoot '..\docs\assets\video'
$lines = @(
  '你还在手写提示词吗?这玩意儿,点点点就好了!',
  '我给我常用的 AI 工具,装了一个提示词优化插件,发送键旁边,多了个星星按钮。',
  '轻轻一点,模糊的需求,就被改写成有目标、有步骤、有约束的标准提示词,面板里看得清清楚楚。',
  '觉得不错,点一下应用,直接替换草稿;不满意,就放弃,一个字都不改。',
  '重点来了:它不挑模型,不加配置,就用你正在用的模型;优化前后,对比着看;换会话马上清空,不串台。',
  '写代码、写文档、拆需求,一个星星按钮,全搞定。',
  '项目已经开源,搜索 dsh prompt optimize plugin,一键安装就能用。',
  '觉得有用,点赞收藏,关注我;评论区告诉我,你还想让 AI 工具一键做什么,我们评论区见!'
)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Huihui Desktop')
$synth.Rate = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  $path = Join-Path $out ("tts-{0}.wav" -f ($i + 1))
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $synth.SetOutputToWaveFile($path)
  $synth.Speak($lines[$i])
  $synth.SetOutputToNull()
  $sw.Stop()
  Write-Output ("tts-{0}.wav  {1:N1}s  {2}" -f ($i + 1), $sw.Elapsed.TotalSeconds, $lines[$i])
}
$synth.Dispose()
