/* =====================================================================
   PlanoB - Player de vídeo
   Procura <section data-pb-player> com um <video data-pb-video> dentro e
   troca os controles nativos pelos controles do site: play/pause, barra de
   progresso, tempo, volume, velocidade e tela cheia.
   Se o JS falhar, o vídeo continua com os controles nativos do navegador.
   ===================================================================== */
(function () {
  'use strict'

  var VELOCIDADES = [0.75, 1, 1.25, 1.5, 2]

  function el(tag, classe, texto) {
    var e = document.createElement(tag)

    if (classe) e.className = classe
    if (texto) e.textContent = texto

    return e
  }

  function icone(nome) {
    var i = el('i', 'material-symbols-outlined', nome)
    i.setAttribute('aria-hidden', 'true')
    return i
  }

  function botao(rotulo, nomeIcone, classe) {
    var b = el('button', classe || 'pb-btn')
    b.type = 'button'
    b.setAttribute('aria-label', rotulo)
    b.setAttribute('title', rotulo)

    if (nomeIcone) b.appendChild(icone(nomeIcone))

    return b
  }

  function formatar(segundos) {
    if (!isFinite(segundos) || segundos < 0) segundos = 0

    var m = Math.floor(segundos / 60)
    var s = Math.floor(segundos % 60)

    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }

  function pintarRange(input) {
    var max = Number(input.max) || 1
    var pct = (Number(input.value) / max) * 100
    input.style.setProperty('--pb-pct', pct + '%')
  }

  function iniciar(caixa) {
    var video = caixa.querySelector('video[data-pb-video]')

    if (!video || caixa.getAttribute('data-pb-pronto')) return

    caixa.setAttribute('data-pb-pronto', '1')
    caixa.classList.add('pb-player')
    video.removeAttribute('controls')
    video.setAttribute('playsinline', '')

    // Botão grande de play
    var grande = botao('Reproduzir vídeo', 'play_arrow', 'pb-play-grande')

    // Barra de controles
    var controles = el('footer', 'pb-controles')

    var linhaProgresso = el('p', 'pb-linha')
    linhaProgresso.style.margin = '0'

    var progresso = el('input', 'pb-range pb-progresso')
    progresso.type = 'range'
    progresso.min = '0'
    progresso.max = '1000'
    progresso.value = '0'
    progresso.step = '1'
    progresso.setAttribute('aria-label', 'Progresso do vídeo')
    linhaProgresso.appendChild(progresso)

    var linhaBotoes = el('p', 'pb-linha')
    linhaBotoes.style.margin = '8px 0 0'

    var btnPlay = botao('Reproduzir', 'play_arrow')
    var btnMudo = botao('Silenciar', 'volume_up')

    var volume = el('input', 'pb-range pb-volume')
    volume.type = 'range'
    volume.min = '0'
    volume.max = '100'
    volume.value = '100'
    volume.setAttribute('aria-label', 'Volume')

    var tempo = el('output', 'pb-tempo', '00:00 / 00:00')
    tempo.setAttribute('role', 'timer')

    var btnVelocidade = el('button', 'pb-velocidade', '1x')
    btnVelocidade.type = 'button'
    btnVelocidade.setAttribute('aria-label', 'Velocidade de reprodução')
    btnVelocidade.setAttribute('title', 'Velocidade de reprodução')

    var btnTela = botao('Tela cheia', 'fullscreen')

    var grupoEsq = el('fieldset', 'pb-grupo')
    grupoEsq.appendChild(btnPlay)
    grupoEsq.appendChild(btnMudo)
    grupoEsq.appendChild(volume)
    grupoEsq.appendChild(tempo)

    var grupoDir = el('fieldset', 'pb-grupo pb-grupo-direita')
    grupoDir.appendChild(btnVelocidade)
    grupoDir.appendChild(btnTela)

    linhaBotoes.appendChild(grupoEsq)
    linhaBotoes.appendChild(grupoDir)

    controles.appendChild(linhaProgresso)
    controles.appendChild(linhaBotoes)

    var erro = el('p', 'pb-erro', 'Não foi possível carregar este vídeo. Verifique sua conexão ou tente novamente mais tarde.')
    erro.hidden = true
    erro.setAttribute('role', 'alert')

    caixa.appendChild(grande)
    caixa.appendChild(controles)
    caixa.appendChild(erro)

    var arrastando = false
    var temporizador = null

    function tocar() {
      var p = video.play()

      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* o navegador pode pedir um toque do usuário */ })
      }
    }

    function alternar() {
      if (video.paused || video.ended) tocar()
      else video.pause()
    }

    function atualizarPlay() {
      var tocando = !video.paused && !video.ended

      caixa.classList.toggle('pb-tocando', tocando)
      btnPlay.firstChild.textContent = tocando ? 'pause' : 'play_arrow'
      btnPlay.setAttribute('aria-label', tocando ? 'Pausar' : 'Reproduzir')
      btnPlay.setAttribute('title', tocando ? 'Pausar' : 'Reproduzir')
    }

    function atualizarTempo() {
      var d = video.duration

      if (!arrastando && isFinite(d) && d > 0) {
        progresso.value = String(Math.round((video.currentTime / d) * 1000))
        pintarRange(progresso)
      }

      tempo.textContent = formatar(video.currentTime) + ' / ' + formatar(d)
    }

    function atualizarVolume() {
      var mudo = video.muted || video.volume === 0

      btnMudo.firstChild.textContent = mudo ? 'volume_off' : (video.volume < 0.5 ? 'volume_down' : 'volume_up')
      btnMudo.setAttribute('aria-label', mudo ? 'Ativar o som' : 'Silenciar')
      volume.value = String(mudo ? 0 : Math.round(video.volume * 100))
      pintarRange(volume)
    }

    function mostrarControles() {
      caixa.classList.remove('pb-ocioso')
      clearTimeout(temporizador)

      if (!video.paused) {
        temporizador = setTimeout(function () { caixa.classList.add('pb-ocioso') }, 3000)
      }
    }

    function telaCheiaAtiva() {
      return document.fullscreenElement === caixa || document.webkitFullscreenElement === caixa
    }

    function alternarTelaCheia() {
      if (telaCheiaAtiva()) {
        if (document.exitFullscreen) document.exitFullscreen()
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
        return
      }

      if (caixa.requestFullscreen) caixa.requestFullscreen()
      else if (caixa.webkitRequestFullscreen) caixa.webkitRequestFullscreen()
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen() // iPhone
    }

    function atualizarTelaCheia() {
      var ativa = telaCheiaAtiva()

      btnTela.firstChild.textContent = ativa ? 'fullscreen_exit' : 'fullscreen'
      btnTela.setAttribute('aria-label', ativa ? 'Sair da tela cheia' : 'Tela cheia')
    }

    grande.addEventListener('click', alternar)
    btnPlay.addEventListener('click', alternar)
    video.addEventListener('click', alternar)

    btnMudo.addEventListener('click', function () {
      video.muted = !video.muted

      if (!video.muted && video.volume === 0) video.volume = 0.6
    })

    volume.addEventListener('input', function () {
      var v = Number(volume.value) / 100

      video.volume = v
      video.muted = v === 0
    })

    progresso.addEventListener('input', function () {
      arrastando = true
      pintarRange(progresso)

      if (isFinite(video.duration)) {
        video.currentTime = (Number(progresso.value) / 1000) * video.duration
      }
    })

    progresso.addEventListener('change', function () { arrastando = false })

    btnVelocidade.addEventListener('click', function () {
      var i = VELOCIDADES.indexOf(video.playbackRate)
      var proxima = VELOCIDADES[(i + 1) % VELOCIDADES.length]

      video.playbackRate = proxima
      btnVelocidade.textContent = proxima + 'x'
    })

    btnTela.addEventListener('click', alternarTelaCheia)
    document.addEventListener('fullscreenchange', atualizarTelaCheia)
    document.addEventListener('webkitfullscreenchange', atualizarTelaCheia)

    video.addEventListener('play', function () { atualizarPlay(); mostrarControles() })
    video.addEventListener('pause', function () { atualizarPlay(); mostrarControles() })
    video.addEventListener('ended', atualizarPlay)
    video.addEventListener('timeupdate', atualizarTempo)
    video.addEventListener('loadedmetadata', atualizarTempo)
    video.addEventListener('durationchange', atualizarTempo)
    video.addEventListener('volumechange', atualizarVolume)

    video.addEventListener('error', function () { erro.hidden = false })
    video.addEventListener('loadeddata', function () { erro.hidden = true })
    var fonte = video.querySelector('source')
    if (fonte) fonte.addEventListener('error', function () { erro.hidden = false })

    caixa.addEventListener('mousemove', mostrarControles)
    caixa.addEventListener('touchstart', mostrarControles, { passive: true })

    // Atalhos: espaço/K play, setas = 5s, M mudo, F tela cheia
    caixa.addEventListener('keydown', function (e) {
      var alvo = e.target

      if (alvo && alvo.tagName === 'INPUT') return
      if ((e.key === ' ' || e.key === 'Enter') && alvo && alvo.tagName === 'BUTTON') return

      if (e.key === ' ' || e.key.toLowerCase() === 'k') { e.preventDefault(); alternar() }
      else if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration || 0, video.currentTime + 5) }
      else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5) }
      else if (e.key.toLowerCase() === 'm') { video.muted = !video.muted }
      else if (e.key.toLowerCase() === 'f') { alternarTelaCheia() }
    })

    pintarRange(progresso)
    pintarRange(volume)
    atualizarPlay()
    atualizarVolume()
    atualizarTempo()
  }

  function iniciarTodos() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pb-player]'), iniciar)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarTodos)
  else iniciarTodos()
})()
