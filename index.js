;(function (window) {
  var YAudio = function (params) {
    var defaultOption = {
      element: null,
      autoplay: false,
      audio: null,
      playIndex: 0,
      barColor: '#666666',
      proBarColor: '#fe4f58,#b1060f'
    }
    // 合并后的参数
    this.option = Object.assign({}, defaultOption, params)
    // 歌曲索引
    this.playIndex = this._isArray(this.option.audio)
      ? this.option.playIndex
      : -1
    // 是否是单曲
    this.single =
      (this._isArray(this.option.audio) && this.option.audio.length === 1) ||
      !this._isArray(this.option.audio)
    this.music = this.getMusic(this.playIndex)
    // 是否正在播放
    this.playing = false
    // 鼠标是否正在 波形 滑动中
    this.moving = false
    // 是否音频加载完成
    this.load = false
    // 是否已经开始播放
    this.start = false
    // 进度是否滚动到评论区
    this.commentMoving = false
    // 保存音频
    this.audioMap = new Map()
    // 保存滚动的参数
    this.data = {
      offsetTop: 0,
      pageY: 0,
      touching: false
    }

    this.init()

    this.setMusic(this.playIndex, 'click')
  }

  YAudio.prototype = {
    init: function () {
      var element =
        'string' === typeof this.option.element
          ? document.querySelector(this.option.element)
          : this.option.element
      if (!element) {
        throw new Error('必须要一个容器承载')
      }

      this.bindHandlers()
      // 获取评论列表
      this.getCommentList()
      this.initDom()
      this.attachDomEvents()
    },
    bindHandlers: function () {
      for (const methodName of [
        'onWaveformClick',
        'onWaveformMouseMove',
        'onWaveformMouseLeave',

        'onCommentMouseMove',
        'onCommentMouseLeave',

        'onAudioEnd',
        'onAudioLoadedData',
        'onAudioDurationChange',

        'onAudilListScroll',
        'onAudioListClick',
        'onAudioListMore',

        'onScrollBarMousedown',
        'onScrollBarMousemove',
        'onScrollBarMouseup',

        'onPlay',
        'onSubmit'
      ]) {
        this[methodName] = this[methodName].bind(this)
      }
    },
    initDom: function () {
      var element = this.option.element
      var html = `
        <div class="yAudio-artword">
          <figure class="yAudio-figure">
            <img class="yAudio-pic" src="${this.music.pic}" alt="" />
          </figure>
        </div>
        <div class="yAudio-content">
          <header class="yAudio-header">
            <div class="yAudio-play">
              <svg
                class="yAudio-play__pause"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 16 31"
              >
                <path
                  d="M15.552 15.168q0.448 0.32 0.448 0.832 0 0.448-0.448 0.768l-13.696 8.512q-0.768 0.512-1.312 0.192t-0.544-1.28v-16.448q0-0.96 0.544-1.28t1.312 0.192z"
                ></path>
              </svg>
              <svg
                class="yAudio-play__playing"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 17 32"
              >
                <path d="M14.080 4.8q2.88 0 2.88 2.048v18.24q0 2.112-2.88 2.112t-2.88-2.112v-18.24q0-2.048 2.88-2.048zM2.88 4.8q2.88 0 2.88 2.048v18.24q0 2.112-2.88 2.112t-2.88-2.112v-18.24q0-2.048 2.88-2.048z"></path></svg>
            </div>
            <div class="yAudio-container">
              <p class="yAudio-author">${this.music.author}</p>
              <p class="yAudio-title">${this.music.title}</p>
            </div>
            <div class="yAudio-time">3 小时</div>
          </header>
          <main class="yAudio-main">
            <div class="yAudio-waveform">
              <canvas class="yAudio-waveform-canvas"></canvas>
              <div class="yAudio-pro">
                <canvas class="yAudio-pro-canvas"></canvas>
              </div>
            </div>
            ${
              this.single
                ? `
                <div class="yAudio-comments">
                  <div class="yAudio-wrapper"></div>
                  <div class="yAudio-popover">
                    <div class="yAudio-popover-wrapper">
                      <a href="javascript:;" class="yAudio-popover-wrapper__user">中原</a>
                      <p class="yAudio-popover-wrapper__comment">这是一条评论！</p>
                    </div>
                  </div>
                  <div class="yAudio-comments-from">
                    <input class="yAudio-comments-from__input" placeholder="评论一下吧" />
                  </div>
                </div>
              `
                : ``
            }
            <time class="yAudio-current">00:00</time>
            <time class="yAudio-total">00:00</time>
          </main>
          ${
            !this.single
              ? `
              <footer class="yAudio-footer">
                <div class="yAudio-list">
                  <div class="yAudio-list-container">
                    <ul class="yAudio-list-wrapper">
                    ${this.option.audio
                      .map(
                        (_, i) =>
                          `
                          <li class="yAudio-list-wrapper__item">
                            <img class="yAudio-list-wrapper__item-img" src="${
                              _.pic
                            }" />
                            <div class="yAudio-list-wrapper__item-number">${
                              i + 1
                            }</div>
                            <div class="yAudio-list-wrapper__item-content">
                              <span class="yAudio-list-wrapper__item-user">${
                                _.author
                              } -</span>
                              <span class="yAudio-list-wrapper__item-title">${
                                _.title
                              }</span>
                            </div>
                            <div class="yAudio-list-wrapper__item-btn"></div>
                          </li>
                        `
                      )
                      .join('')}
                    </ul>
                  </div>
                  <div class="yAudio-more">查看更多 ${
                    this.option.audio.length
                  } 首</div>
                </div>
              </footer>
            `
              : ``
          }
        </div>
      `
      element.insertAdjacentHTML('beforeEnd', html)
    },
    initAudio: function () {
      // 创建一个音频上下文
      var audioCtx = (this.audioCtx = new (window.AudioContext ||
        window.webkitAudioContext)())

      // 创建一个分析音频模块
      this.analyser = audioCtx.createAnalyser()
      // 设置音频的数量大小 默认是2048
      this.analyser.fftSize = 512

      // 关联音频
      this.analyser.connect(audioCtx.destination)

      // 对音频进行解码
      this.decodeArrayBuffer()
    },
    decodeArrayBuffer: function () {
      var self = this

      this.width = this.waveform.clientWidth
      this.height = this.waveform.clientHeight

      this.audioCtx.decodeAudioData(
        this.arraybuffer,
        function (buffer) {
          var pcm = self.loadDecodedBuffer(buffer)
          self.pcm = pcm
          self.pcmToCanvas(pcm)
        },
        function (err) {
          console.log(err)
        }
      )
    },
    loadDecodedBuffer: function (buffer) {
      var accuracy = 100
      // 创建 AudioBufferSourceNode
      this.befferSource = this.audioCtx.createBufferSource()
      // 讲解码之后的 buffer 放到 AudioBufferSourceNode 的 buffer 中
      this.befferSource.buffer = buffer
      this.befferSource.connect(this.analyser)

      // 返回计算断开时波形的最大值和最小值
      var peaks = this.drawPeaks()

      return peaks.map(function (item) {
        return Math.abs(Math.round(item * accuracy) / accuracy)
      })
    },
    drawPeaks: function () {
      var befferSource = this.befferSource.buffer,
        length = 200
      var sampleSize = befferSource.length / length
      var sampleStep = ~~(sampleSize / 10) || 1
      var channels = befferSource.numberOfChannels
      var splitPeaks = []
      var mergedPeaks = []

      for (var c = 0; c < channels; c++) {
        var peaks = (splitPeaks[c] = [])
        var chan = befferSource.getChannelData(c)

        for (var i = 0; i < length; i++) {
          var start = ~~(i * sampleSize)
          var end = ~~(start + sampleSize)
          var min = 0
          var max = 0

          for (var j = start; j < end; j += sampleStep) {
            var value = chan[j]

            if (value > max) {
              max = value
            }

            if (value < min) {
              min = value
            }
          }

          peaks[2 * i] = max
          peaks[2 * i + 1] = min

          if (c == 0 || max > mergedPeaks[2 * i]) {
            mergedPeaks[2 * i] = max
          }

          if (c == 0 || min < mergedPeaks[2 * i + 1]) {
            mergedPeaks[2 * i + 1] = min
          }
        }
      }

      return mergedPeaks
    },
    drawCanvas: function (canvas, peaks, color) {
      var bar_space = 1,
        botSize = 0.25,
        self = this

      var ctx = canvas.getContext('2d')
      var ratio = self._getPixelRatio(ctx)

      canvas.width = self.width * ratio
      canvas.height = self.height * ratio
      canvas.style.width = self.width + 'px'
      canvas.style.height = self.height + 'px'

      ctx.scale(ratio, ratio)
      ctx.imageSmoothingEnabled = false
      ctx.imageSmoothing = false
      ctx.imageSmoothingQuality = 'high'
      ctx.webkitImageSmoothing = false

      var max = Math.max.apply(null, peaks)

      var newArr = []
      for (var i = 0; i < peaks.length; i++) {
        newArr[i] = parseFloat(peaks[i] / Number(max))
      }

      var barCount = self.width / 3

      var bar_w = Math.ceil(self.width / barCount)

      var topSize = 1 - botSize
      var lastBarHeight = 0
      var searched_index = null
      var proBarColors = []

      function drawBars(isReflection) {
        for (var i = 0; i < barCount; i++) {
          ctx.save()

          searched_index = Math.ceil(i * (newArr.length / barCount))

          if (i < barCount / 5) {
            if (newArr[searched_index] < 0.1) {
              newArr[searched_index] = 0.1
            }
          }
          if (
            newArr.length > barCount * 2.5 &&
            i > 0 &&
            i < newArr.length - 1
          ) {
            newArr[searched_index] =
              Math.abs(
                newArr[searched_index] +
                  newArr[searched_index - 1] +
                  newArr[searched_index + 1]
              ) / 3
          }

          var targetRatio = isReflection ? botSize : topSize

          var barHeight = Math.abs(
            newArr[searched_index] * self.height * targetRatio
          )

          if (isNaN(lastBarHeight)) {
            lastBarHeight = 0
          }
          barHeight = barHeight / 1.5 + lastBarHeight / 2.5
          lastBarHeight = barHeight

          ctx.lineWidth = 0
          barHeight = Math.floor(barHeight)
          var barPositionTop = isReflection
            ? self.height * topSize
            : Math.ceil(self.height * targetRatio - barHeight)

          ctx.beginPath()
          ctx.rect(i * bar_w, barPositionTop, bar_w - bar_space, barHeight)

          if (isReflection) {
            ctx.fillStyle = self.hexToRgb(color, 0.25)
          } else {
            ctx.fillStyle = color
          }

          if (color === self.option.proBarColor) {
            if (color.indexOf(',') > -1) {
              proBarColors = color.split(',')
            }
            if (proBarColors.length) {
              var startColor = isReflection
                ? self.hexToRgb(proBarColors[0], 0.25)
                : proBarColors[0]
              var endColor = isReflection
                ? self.hexToRgb(proBarColors[1], 0.25)
                : proBarColors[1]

              gradient = ctx.createLinearGradient(0, 0, 0, self.height)
              gradient.addColorStop(0, startColor)
              gradient.addColorStop(1, endColor)
              ctx.fillStyle = gradient
            }
          }

          ctx.fill()
          ctx.closePath()
          ctx.restore()
        }
      }
      ctx.clearRect(0, 0, self.width, self.height)
      drawBars()
      drawBars(true)
    },
    ready: function () {
      var element = this.option.element,
        playIndex = this.playIndex
      if (
        (playIndex > -1 && !this.audioMap.get(playIndex)) ||
        playIndex === -1
      ) {
        this.audio = document.createElement('audio')
        this.audio.src = this.music.url
        this.audio.preload = 'metadata'
        this.audio.volume = 0.7
      } else {
        this.audio = this.audioMap.get(playIndex)
      }

      this.load = true
      this.attachAudioEvents()
      element.classList.add('load')
      element.querySelector('.yAudio-pic').setAttribute('src', this.music.pic)
      element.querySelector('.yAudio-author').innerHTML = this.music.author
      element.querySelector('.yAudio-title').innerHTML = this.music.title

      if (this.option.autoplay && !this._isMobile()) {
        this.onPlay()
      }
      this.option.autoplay = true

      if (playIndex > -1) {
        this.audio.pcm = this.pcm
        this.audioMap.set(playIndex, this.audio)
      }
    },
    onWaveformClick: function (event) {
      if (!this.playing && !this.start) return
      var element = this.option.element
      var duration = this.audio.duration
      var x = event.pageX
      var left = x - event.currentTarget.getBoundingClientRect().left
      var time = (left / this.width) * duration

      var totalWidth = element.querySelector('.yAudio-total').clientWidth

      this.audio.currentTime = time

      if (this.width - left > totalWidth) {
        element.querySelector('.yAudio-current').style.left = left + 'px'
      } else {
        element.querySelector('.yAudio-current').style.left =
          this.width - totalWidth + 'px'
      }

      event.currentTarget.style.setProperty('--bar-left', left + 'px')
      element.querySelector('.yAudio-pro').style.width = left + 'px'
      element.querySelector('.yAudio-current').innerHTML = this.formatTime(time)

      this.renderComment(left)
    },
    onWaveformMouseMove: function (event) {
      var element = this.option.element
      var duration = this.audio.duration
      var x = event.pageX
      var left = x - event.currentTarget.getBoundingClientRect().left
      var time = (left / this.width) * duration

      this.moving = true
      event.currentTarget.style.setProperty('--bar-left', left + 'px')
      element.querySelector('.yAudio-current').innerHTML = this.formatTime(time)
    },
    onWaveformMouseLeave: function () {
      var element = this.option.element

      this.moving = false
      element.querySelector('.yAudio-current').innerHTML = this.formatTime(
        this.audio.currentTime
      )
    },
    onCommentMouseMove: function (event) {
      this.commentMoving = true
      var element = this.option.element,
        currentTarget = event.currentTarget,
        wrapper = element.querySelector('.yAudio-wrapper')

      element.classList.add('comment')
      currentTarget.classList.add('current')
      wrapper.classList.add('active')

      this.renderComment(currentTarget.offsetLeft)
    },
    onCommentMouseLeave: function (event) {
      this.commentMoving = false
      var element = this.option.element,
        currentTarget = event.currentTarget,
        wrapper = element.querySelector('.yAudio-wrapper')

      currentTarget.classList.remove('current')
      wrapper.classList.remove('active')
    },
    onAudioError: function () {
      this.waveform.innerHTML = ' - Error happens ╥﹏╥'
    },
    onAudioEnd: function () {
      this.resetMusic()
      if (this.playIndex < this.option.audio.length - 1) {
        this.setMusic(this.playIndex, 'next')
      } else {
        this.audioPause()
      }
    },
    onAudioLoadedData: function () {
      var self = this
      var element = this.option.element,
        commentList = this.commentList,
        wrapper = element.querySelector('.yAudio-wrapper')
      if (wrapper.children.length) return

      wrapper.innerHTML = ''

      commentList.forEach(function (item) {
        var left = (item.duration / self.audio.duration) * self.width
        var obj = {
          class: 'yAudio-wrapper__item',
          style:
            'left: ' + left + 'px;background-image: url(' + item.avatar + ')',
          'data-user': item.user,
          'data-text': item.text
        }
        var comment = document.createElement('div')
        for (let [key, value] of Object.entries(obj)) {
          comment.setAttribute(key, value)
        }
        wrapper.appendChild(comment)
        self.addEvent(comment, 'mousemove', self.onCommentMouseMove)
        self.addEvent(comment, 'mouseleave', self.onCommentMouseLeave)
      })
    },
    onAudioDurationChange: function () {
      var element = this.option.element
      var duration = this.audio.duration
      if (duration !== 1) {
        element.querySelector('.yAudio-total').innerHTML =
          this.formatTime(duration)
      }
    },
    onAudilListScroll: function () {
      var element = this.option.element,
        container = element.querySelector('.yAudio-list-container'),
        wrapper = element.querySelector('.yAudio-list-wrapper'),
        bar = element.querySelector('.yAudio-list-bar')

      var wHeight = wrapper.offsetHeight
      var cHeight = container.offsetHeight

      var top = (container.scrollTop * cHeight) / wHeight

      if (bar) {
        bar.style.top = top + 'px'
      }
    },
    onAudioListClick: function (event) {
      var element = this.option.element,
        items = element.querySelectorAll('.yAudio-list-wrapper__item'),
        item = event.target
      var target = item.closest('.yAudio-list-wrapper__item')

      var index = this._getIndex(target)

      for (var i = 0, len = items.length; i < len; i++) {
        items[i].classList.remove('active')
      }

      items[index].classList.add('active')

      this.resetMusic()
      this.audioPause()
      this.setMusic(index, 'click')
    },
    onAudioListMore: function () {
      var self = this
      var element = this.option.element,
        container = element.querySelector('.yAudio-list-container'),
        wrapper = element.querySelector('.yAudio-list-wrapper'),
        more = element.querySelector('.yAudio-more'),
        height = 30

      if (container.classList.contains('active')) {
        container.classList.remove('active')
        more.innerHTML = `查看更多 ${this.option.audio.length} 首`

        element.querySelector('.yAudio-list-bar').remove()

        container.scrollTo({
          top: height * this.playIndex,
          behavior: 'smooth'
        })
      } else {
        container.classList.add('active')
        more.innerHTML = `收起`

        setTimeout(function () {
          var wHeight = wrapper.offsetHeight
          var cHeight = container.offsetHeight

          var height = cHeight * (cHeight / wHeight)
          var top = (container.scrollTop * cHeight) / wHeight

          var bar = document.createElement('div')
          bar.className = 'yAudio-list-bar'
          bar.style.height = height + 'px'
          bar.style.top = top + 'px'

          self.addEvent(bar, 'mousedown', self.onScrollBarMousedown)

          container.appendChild(bar)
        }, 300)
      }
    },
    onScrollBarMousedown: function (event) {
      event.preventDefault()
      var bar = event.target

      this.data.offsetTop = bar.offsetTop
      this.data.mouseY = event.pageY
      this.data.touching = true

      bar.classList.add('active')
      this.addEvent(document, 'mousemove', this.onScrollBarMousemove)
      this.addEvent(document, 'mouseup', this.onScrollBarMouseup)
    },
    onScrollBarMousemove: function (event) {
      event.preventDefault()
      if (!this.data.touching) return
      var element = this.option.element,
        container = element.querySelector('.yAudio-list-container'),
        wrapper = element.querySelector('.yAudio-list-wrapper'),
        bar = element.querySelector('.yAudio-list-bar'),
        data = this.data

      var wHeight = wrapper.offsetHeight
      var cHeight = container.offsetHeight

      var diff = (wHeight * cHeight) / wHeight - bar.offsetHeight
      var diff2 = data.offsetTop + (event.pageY - data.mouseY)
      var top = 0

      if (data.offsetTop + (event.pageY - data.mouseY) <= 0) {
        top = 0
      } else if (data.offsetTop + (event.pageY - data.mouseY) >= diff) {
        top = diff
      } else {
        top = diff2
      }

      bar.style.top = top + 'px'

      container.scrollTop = bar.offsetTop * (wHeight / cHeight)
    },
    onScrollBarMouseup: function () {
      var element = this.option.element,
        bar = element.querySelector('.yAudio-list-bar')

      this.data.touching = false

      bar.classList.remove('active')
      this.removeEvent(document, 'mousemove', this.onScrollBarMousemove)
      this.removeEvent(document, 'mouseup', this.onScrollBarMouseup)
    },
    onPlay: function () {
      if (!this.load) return
      var element = this.option.element,
        width = this.width,
        self = this

      var totalWidth = element.querySelector('.yAudio-total').clientWidth

      this.playing = !this.playing

      if (this.playing) {
        this.audio.play()
        this.start = true
        element.classList.add('start')
        element.classList.add('play')

        function getCurrentTime() {
          var proBarWidth =
            (self.audio.currentTime / self.audio.duration) * width

          if (proBarWidth > width) {
            proBarWidth = width
          }

          if (!self.commentMoving) {
            // 渲染评论
            self.renderComment(proBarWidth)
          }

          if (!self.moving) {
            element.querySelector('.yAudio-current').innerHTML =
              self.formatTime(self.audio.currentTime)
          }

          if (self.width - proBarWidth > totalWidth) {
            element.querySelector('.yAudio-current').style.left =
              proBarWidth + 'px'
          }

          element.querySelector('.yAudio-pro').style.width = proBarWidth + 'px'

          if (self.playing) {
            requestAnimationFrame(getCurrentTime)
          }
        }
        requestAnimationFrame(getCurrentTime)
      } else {
        this.audioPause()
      }
    },
    onSubmit: function (event) {
      var duration = this.audio.currentTime
      if (event.keyCode === 13) {
        var text = event.target.value
        this.commentList.push({
          duration: duration,
          avatar: './1.jpeg',
          user: '周源',
          text: text
        })
        this.onAudioLoadedData()
      }
    },
    audioPause: function () {
      var element = this.option.element

      this.audio.pause()
      this.playing = false
      element.classList.remove('play')
    },
    attachDomEvents: function () {
      var element = this.option.element
      this.waveform = element.querySelector('.yAudio-waveform')

      this.addEvent(this.waveform, 'click', this.onWaveformClick)
      this.addEvent(this.waveform, 'mousemove', this.onWaveformMouseMove)
      this.addEvent(this.waveform, 'mouseleave', this.onWaveformMouseLeave)

      !this.single &&
        this.addEvent(
          element.querySelector('.yAudio-list-container'),
          'scroll',
          this.onAudilListScroll
        )
      !this.single &&
        this.addEvent(
          element.querySelector('.yAudio-list-wrapper'),
          'click',
          this.onAudioListClick
        )
      !this.single &&
        this.addEvent(
          element.querySelector('.yAudio-more'),
          'click',
          this.onAudioListMore
        )

      this.addEvent(element.querySelector('.yAudio-play'), 'click', this.onPlay)

      this.single &&
        this.addEvent(
          element.querySelector('.yAudio-comments-from__input'),
          'keydown',
          this.onSubmit
        )
    },
    attachAudioEvents: function () {
      this.addEvent(this.audio, 'error', this.onAudioError)
      this.addEvent(this.audio, 'ended', this.onAudioEnd)
      this.addEvent(this.audio, 'durationchange', this.onAudioDurationChange)

      this.single &&
        this.addEvent(this.audio, 'loadeddata', this.onAudioLoadedData)
    },
    hexToRgb: function (hex, palpha) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      var str = ''
      if (result) {
        result = {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }

        str =
          'rgba(' +
          result.r +
          ',' +
          result.g +
          ',' +
          result.b +
          ',' +
          (palpha ? palpha : 1) +
          ')'
      }

      return str
    },
    formatTime: function (time) {
      time = time | 0
      var minute = (time / 60) | 0
      var second = this._pad(time % 60)
      return minute + ':' + second
    },
    addEvent: function (elm, type, fn) {
      if (window.attachEvent) {
        elm.attachEvent('on' + type, fn)
      } else if (window.addEventListener) {
        elm.addEventListener(type, fn, false)
      } else {
        elm['on' + type] = fn
      }
    },
    removeEvent: function (elm, type, fn) {
      if (window.detachEvent) {
        elm.detachEvent('on' + type, fn)
      } else if (window.removeEventListener) {
        elm.removeEventListener(type, fn, false)
      } else {
        elm['on' + type] = null
      }
    },
    renderComment: function (offsetLeft) {
      var element = this.option.element,
        WIDTH = 30,
        popover = element.querySelector('.yAudio-popover-wrapper'),
        wrapper = element.querySelector('.yAudio-wrapper'),
        items = element.querySelectorAll('.yAudio-wrapper__item')

      wrapper.classList.remove('active')
      for (var i = 0; i < items.length; i++) {
        if (
          items[i].offsetLeft <= offsetLeft &&
          offsetLeft <= items[i].offsetLeft + WIDTH
        ) {
          if (offsetLeft < this.width / 2) {
            popover.classList.remove('right')

            popover.style.right = 'auto'
            popover.style.left = items[i].offsetLeft + 'px'
          } else {
            popover.classList.add('right')

            popover.style.left = 'auto'
            popover.style.right =
              this.width - items[i].offsetLeft - WIDTH + 'px'
          }
          wrapper.classList.add('active')
          items[i].classList.add('current')
          popover.querySelector('.yAudio-popover-wrapper__user').innerHTML =
            items[i].getAttribute('data-user')
          popover.querySelector('.yAudio-popover-wrapper__comment').innerHTML =
            items[i].getAttribute('data-text')
        } else {
          items[i].classList.remove('current')
        }
      }
    },
    getCommentList: function () {
      this.commentList = [
        {
          duration: 8,
          avatar: './1.jpeg',
          user: '周源',
          text: '哈哈哈哈哈'
        },
        {
          duration: 40,
          avatar: './2.jpeg',
          user: '周梦',
          text: '我是一只小可爱'
        },
        {
          duration: 42,
          avatar: './3.jpg',
          user: '周大帅',
          text: '我是大帅哥！！！'
        },
        {
          duration: 146,
          avatar: './4.jpg',
          user: '周小梦',
          text: '垃圾王者荣耀'
        }
      ]
    },
    getMusic: function (index) {
      return index > -1 ? this.option.audio[index] : this.option.audio
    },
    setMusic: function (index, type) {
      var self = this
      var element = this.option.element,
        container = element.querySelector('.yAudio-list-container'),
        items = element.querySelectorAll('.yAudio-list-wrapper__item'),
        height = 30
      if (this.single) {
        this.getMusicArrayBuffer(function () {
          self.initAudio()
        })
        return
      }
      if (type === 'next') {
        if (this.playIndex > -1) {
          index++
        }
      }
      items[this.playIndex].classList.remove('active')
      items[this.playIndex].classList.add('isload')
      items[index].classList.add('active')
      this.playIndex = index
      this.music = this.getMusic(this.playIndex)

      var audio = this.audioMap.get(this.playIndex)
      if (audio && audio.pcm) {
        setTimeout(function () {
          self.pcm = audio.pcm
          self.pcmToCanvas(audio.pcm)
        }, 300)
      } else {
        this.getMusicArrayBuffer(function () {
          self.initAudio()
        })
      }
      if (!container.classList.contains('active')) {
        // 滚动列表
        container.scrollTo({
          top: height * this.playIndex,
          behavior: 'smooth'
        })
      }
    },
    resetMusic: function () {
      var element = this.option.element

      this.load = false
      this.start = false
      this.playing = false
      this.audio.currentTime = 0

      element.classList.remove('load')
      element.classList.remove('start')
      element.classList.remove('play')
    },
    getMusicArrayBuffer: function (callback) {
      var self = this
      var xhr = new XMLHttpRequest()
      xhr.open('GET', this.music.url, true)
      xhr.responseType = 'arraybuffer'
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
            self.arraybuffer = xhr.response
            callback()
          } else {
            throw new Error('获取音频地址失败: ' + xhr.status)
          }
        }
      }
      xhr.send()
    },
    pcmToCanvas: function (pcm) {
      var element = this.option.element,
        barColor = this.option.barColor,
        proBarColor = this.option.proBarColor
      this.drawCanvas(
        element.querySelector('.yAudio-waveform-canvas'),
        pcm,
        barColor
      )
      this.drawCanvas(
        element.querySelector('.yAudio-pro-canvas'),
        pcm,
        proBarColor
      )
      this.ready()
    },
    _getPixelRatio: function (context) {
      var backingStore =
        context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio ||
        1
      return (window.devicePixelRatio || 1) / backingStore
    },
    _pad: function (num) {
      var len = num.toString().length
      while (len < 2) {
        num = '0' + num
        len++
      }
      return num
    },
    _isMobile: function () {
      return navigator.userAgent.match(
        /(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i
      )
    },
    _getIndex: function (ele) {
      var index = 0
      for (var p = ele.previousSibling; p; ) {
        if (p.nodeType == 1) {
          index++
        }
        p = p.previousSibling
      }
      return index
    },
    _isArray: function (data) {
      return Object.prototype.toString.call(data) === '[object Array]'
    }
  }

  window.YAudio = YAudio
})(window)
