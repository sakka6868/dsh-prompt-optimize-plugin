# 抖音演示视频合成:按 douyin-script 分镜,用 e2e 截图 + TTS 音频 + 字幕,
# FFmpeg 生成 1080x1920 竖版视频。运行:pwsh -File scripts/make-video.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'docs\assets\video'
$font = "'C\:/Windows/Fonts/msyh.ttc'"
$fontBold = "'C\:/Windows/Fonts/msyhbd.ttc'"

function Get-Duration([string]$path) {
  return [double]((& ffprobe -v error -show_entries format=duration -of csv=p=0 $path).Trim())
}

$shots = @(
  @{ n = 'clip-1'; img = $null;   audio = 'tts-1.wav'; pad = 0.8; big = '你还在手写提示词吗?'; small = '点点点,一键优化' },
  @{ n = 'clip-2'; img = 'shot-2-input.png'; audio = 'tts-2.wav'; pad = 0.6; line1 = '发送键旁,多了个星星按钮'; line2 = '' },
  @{ n = 'clip-3'; img = 'shot-3-panel.png'; audio = 'tts-3.wav'; pad = 0.8; line1 = '一键改写：目标 · 步骤 · 约束'; line2 = '面板里看得清清楚楚' },
  @{ n = 'clip-4'; img = 'shot-4-applied.png'; audio = 'tts-4.wav'; pad = 0.6; line1 = '应用 / 放弃,你说了算'; line2 = '' },
  @{ n = 'clip-5'; img = 'shot-5-overview.png'; audio = 'tts-5.wav'; pad = 0.6; line1 = '零配置 · 对比可见 · 会话不串台'; line2 = '' },
  @{ n = 'clip-6'; img = 'shot-6-compare.png'; audio = 'tts-6.wav'; pad = 0.6; line1 = '写代码、写文档、拆需求'; line2 = '一个按钮全搞定' },
  @{ n = 'clip-7'; img = 'shot-7-repo.png'; audio = 'tts-7.wav'; pad = 0.8; line1 = '已开源：npm 一键安装'; line2 = 'github.com/sakka6868/dsh-prompt-optimize-plugin' },
  @{ n = 'clip-8'; img = $null;   audio = 'tts-8.wav'; pad = 1.0; big = '关注 + 收藏,不迷路'; small = '评论区聊聊你想要的 AI 一键功能' }
)

$list = @()
$i = 0
foreach ($s in $shots) {
  $i++
  $audioPath = Join-Path $dir $s.audio
  $dur = [Math]::Round((Get-Duration $audioPath) + $s.pad, 2)
  $durStr = $dur.ToString('0.00', [System.Globalization.CultureInfo]::InvariantCulture)
  $out = Join-Path $dir ($s.n + '.mp4')
  $args = @('-y')

  if ($s.img -eq $null) {
    $ln1 = $s.big
    $ln2 = $s.small
    $args += @('-i', $audioPath)
    $fc = "color=black:s=1080x1920:d=$durStr[base];" +
      "[base]drawtext=fontfile=${fontBold}:text='${ln1}':fontsize=88:fontcolor=white:borderw=6:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.34[v0];" +
      "[v0]drawtext=fontfile=${font}:text='${ln2}':fontsize=46:fontcolor=0xdddddd:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.34+150[v]"
    $mapAudio = '0:a'
  } else {
    $ln1 = $s.line1
    $ln2 = $s.line2
    $imgPath = Join-Path $dir $s.img
    $args += @('-i', $audioPath, '-i', $imgPath, '-i', $imgPath)
    $fc = "[1:v]loop=loop=-1:size=1,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2[bg];" +
      "[2:v]loop=loop=-1:size=1,scale=940:-1[fg];" +
      "[bg][fg]overlay=(W-w)/2:240[v0];"
    if ($ln2 -ne '') {
      $fc += "[v0]drawtext=fontfile=${font}:text='${ln1}':fontsize=46:fontcolor=white:borderw=5:bordercolor=black@0.8:x=(w-text_w)/2:y=h-330[v1];" +
        "[v1]drawtext=fontfile=${font}:text='${ln2}':fontsize=34:fontcolor=0xcccccc:borderw=4:bordercolor=black@0.8:x=(w-text_w)/2:y=h-250[v]"
    } else {
      $fc += "[v0]drawtext=fontfile=${font}:text='${ln1}':fontsize=46:fontcolor=white:borderw=5:bordercolor=black@0.8:x=(w-text_w)/2:y=h-300[v]"
    }
    $mapAudio = '0:a'
  }

  $args += @('-filter_complex', $fc, '-map', '[v]', '-map', $mapAudio, '-t', $durStr, '-r', '30',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-ar', '44100', '-b:a', '128k', $out)
  Write-Output ("== {0}  dur={1}s ==" -f $s.n, $durStr)
  & ffmpeg @args
  if ($LASTEXITCODE -ne 0) { throw ("ffmpeg failed for " + $s.n) }
  $list += "file '$($s.n).mp4'"
}

$listFile = Join-Path $dir 'concat.txt'
[System.IO.File]::WriteAllText($listFile, ($list -join "`n"), [System.Text.UTF8Encoding]::new($false))
$final = Join-Path $dir 'douyin-demo.mp4'
& ffmpeg -y -f concat -safe 0 -i $listFile -c copy $final
if ($LASTEXITCODE -ne 0) { throw 'concat failed' }
Write-Output ('DONE: ' + $final)
