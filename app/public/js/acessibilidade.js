/* =====================================================================
   PlanoB - Menu de acessibilidade (todas as páginas)
   - Botão fixo no canto superior direito (logo abaixo do cabeçalho fixo da página)
   - Modo escuro, alto contraste, tamanho do texto, fonte legível,
     espaçamento do texto, destacar links e pausar animações
   - Tudo fica salvo no navegador e vale para o site inteiro
   ===================================================================== */
(function () {
  'use strict'

  var CHAVE = 'planob-a11y'
  var NIVEIS_FONTE = [90, 100, 115, 130, 145]
  var PADRAO = { escuro: false, contraste: false, fonte: 1, fonteLegivel: false, espacamento: false, links: false, semAnimacao: false }

  var CLASSES = {
    escuro: 'a11y-escuro',
    contraste: 'a11y-contraste',
    fonteLegivel: 'a11y-fonte-legivel',
    espacamento: 'a11y-espacamento',
    links: 'a11y-links',
    semAnimacao: 'a11y-sem-animacao'
  }

  var OPCOES = [
    { chave: 'escuro', icone: 'dark_mode', rotulo: 'Modo escuro' },
    { chave: 'contraste', icone: 'contrast', rotulo: 'Alto contraste' },
    { chave: 'fonteLegivel', icone: 'text_fields', rotulo: 'Fonte para leitura' },
    { chave: 'espacamento', icone: 'format_line_spacing', rotulo: 'Espaçamento do texto' },
    { chave: 'links', icone: 'link', rotulo: 'Destacar links' },
    { chave: 'semAnimacao', icone: 'motion_photos_off', rotulo: 'Pausar animações' }
  ]

  var estado = carregar()
  var raiz, botao, painel, saida, botaoMenos, botaoMais
  var botoesOpcao = {}

  function carregar() {
    var salvo = {}

    try {
      salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}
    } catch (e) {
      salvo = {}
    }

    var estadoInicial = {}

    Object.keys(PADRAO).forEach(function (k) {
      estadoInicial[k] = salvo[k] !== undefined ? salvo[k] : PADRAO[k]
    })

    var nivel = Number(estadoInicial.fonte)
    estadoInicial.fonte = nivel >= 0 && nivel < NIVEIS_FONTE.length ? nivel : 1

    return estadoInicial
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado))
    } catch (e) { /* navegador sem armazenamento: a preferência vale só nesta página */ }
  }

  function garantirFonteLegivel() {
    if (document.getElementById('a11y-fonte-legivel-link')) return

    var link = document.createElement('link')
    link.id = 'a11y-fonte-legivel-link'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap'
    document.head.appendChild(link)
  }

  function garantirIcones() {
    var temIcones = Array.prototype.some.call(document.querySelectorAll('link[href*="Material+Symbols"]'), Boolean)

    if (temIcones) return

    var link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
    document.head.appendChild(link)

    var estilo = document.createElement('style')
    estilo.textContent = '.material-symbols-outlined{font-family:"Material Symbols Outlined";font-weight:400;font-style:normal;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:"liga";font-feature-settings:"liga";-webkit-font-smoothing:antialiased}'
    document.head.appendChild(estilo)
  }

  function aplicar() {
    var html = document.documentElement

    Object.keys(CLASSES).forEach(function (k) {
      html.classList.toggle(CLASSES[k], !!estado[k])
    })

    var pct = NIVEIS_FONTE[estado.fonte]
    html.style.fontSize = pct === 100 ? '' : pct + '%'

    if (estado.fonteLegivel) garantirFonteLegivel()

    atualizarControles()
    posicionar()
    marcarAreasEscuras()
  }

  // No modo escuro a página é invertida. Áreas que já são escuras (fundo preto, azul-marinho...)
  // ficariam brancas, então marcamos essas áreas para manterem a cor original.
  function luminancia(cor) {
    var m = /rgba?\(([^)]+)\)/.exec(cor || '')

    if (!m) return null

    var p = m[1].split(',').map(function (n) { return parseFloat(n) })
    var alfa = p.length > 3 ? p[3] : 1

    if (isNaN(alfa) || alfa < 0.85) return null

    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255
  }

  function marcarAreasEscuras() {
    var marcadas = document.querySelectorAll('.a11y-manter')

    Array.prototype.forEach.call(marcadas, function (e) { e.classList.remove('a11y-manter') })

    if (!estado.escuro) return

    var tags = { SECTION: 1, ARTICLE: 1, FOOTER: 1, HEADER: 1, ASIDE: 1, NAV: 1, FIGURE: 1, DIV: 1 }
    var todos = document.body.querySelectorAll('*')

    for (var i = 0; i < todos.length; i++) {
      var e = todos[i]

      if (!tags[e.tagName]) continue
      if (e.closest('.a11y-raiz, .tut-raiz, .a11y-manter')) continue

      var r = e.getBoundingClientRect()

      if (r.width < 240 || r.height < 100) continue

      var lum = luminancia(window.getComputedStyle(e).backgroundColor)

      if (lum !== null && lum < 0.3) e.classList.add('a11y-manter')
    }
  }

  function atualizarControles() {
    if (!raiz) return

    OPCOES.forEach(function (op) {
      var b = botoesOpcao[op.chave]
      var ligado = !!estado[op.chave]

      b.setAttribute('aria-checked', ligado ? 'true' : 'false')
      b.querySelector('small').textContent = ligado ? 'Ligado' : 'Desligado'
    })

    saida.textContent = NIVEIS_FONTE[estado.fonte] + '%'
    botaoMenos.disabled = estado.fonte <= 0
    botaoMais.disabled = estado.fonte >= NIVEIS_FONTE.length - 1
  }

  // Fica logo abaixo do cabeçalho fixo da página (se existir), sem cobrir o menu do site
  function posicionar() {
    if (!raiz) return

    var topo = 12
    var cabecalhos = document.querySelectorAll('header')

    for (var i = 0; i < cabecalhos.length; i++) {
      var c = cabecalhos[i]

      if (raiz.contains(c)) continue

      var cs = window.getComputedStyle(c)

      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue

      var r = c.getBoundingClientRect()

      if (r.top <= 2 && r.height > 20 && r.height < 200 && r.width > window.innerWidth * 0.5) {
        topo = Math.max(topo, Math.round(r.bottom) + 10)
      }
    }

    raiz.style.top = topo + 'px'
    raiz.style.setProperty('--a11y-topo', topo + 'px')
  }

  function abrir() {
    painel.hidden = false
    botao.setAttribute('aria-expanded', 'true')
    botao.setAttribute('aria-label', 'Fechar menu de acessibilidade')
    posicionar()
  }

  function fechar(devolverFoco) {
    painel.hidden = true
    botao.setAttribute('aria-expanded', 'false')
    botao.setAttribute('aria-label', 'Abrir menu de acessibilidade')

    if (devolverFoco) botao.focus()
  }

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

  function montar() {
    garantirIcones()

    raiz = el('aside', 'a11y-raiz')
    raiz.setAttribute('aria-label', 'Acessibilidade')
    raiz.setAttribute('data-no-transition', '')

    botao = el('button', 'a11y-fab')
    botao.type = 'button'
    botao.setAttribute('aria-expanded', 'false')
    botao.setAttribute('aria-controls', 'a11y-painel')
    botao.setAttribute('aria-label', 'Abrir menu de acessibilidade')
    botao.setAttribute('title', 'Acessibilidade')
    botao.appendChild(icone('accessibility_new'))

    painel = el('section', 'a11y-painel')
    painel.id = 'a11y-painel'
    painel.hidden = true
    painel.setAttribute('role', 'dialog')
    painel.setAttribute('aria-labelledby', 'a11y-titulo')

    var cab = el('header', 'a11y-cab')
    var titulo = el('h2', 'a11y-titulo', 'Acessibilidade')
    titulo.id = 'a11y-titulo'

    var btnFechar = el('button', 'a11y-fechar')
    btnFechar.type = 'button'
    btnFechar.setAttribute('aria-label', 'Fechar menu de acessibilidade')
    btnFechar.appendChild(icone('close'))

    cab.appendChild(titulo)
    cab.appendChild(btnFechar)

    var grupoFonte = el('fieldset', 'a11y-grupo')
    grupoFonte.appendChild(el('legend', '', 'Tamanho do texto'))

    var linhaFonte = el('p', 'a11y-fonte')
    linhaFonte.style.margin = '0'

    botaoMenos = el('button', '', 'A−')
    botaoMenos.type = 'button'
    botaoMenos.setAttribute('aria-label', 'Diminuir o texto')

    saida = el('output', '', '100%')
    saida.setAttribute('aria-live', 'polite')

    botaoMais = el('button', '', 'A+')
    botaoMais.type = 'button'
    botaoMais.setAttribute('aria-label', 'Aumentar o texto')

    linhaFonte.appendChild(botaoMenos)
    linhaFonte.appendChild(saida)
    linhaFonte.appendChild(botaoMais)
    grupoFonte.appendChild(linhaFonte)

    var lista = el('ul', 'a11y-lista')

    OPCOES.forEach(function (op) {
      var li = el('li')
      var b = el('button', 'a11y-opcao')
      b.type = 'button'
      b.setAttribute('role', 'switch')
      b.setAttribute('aria-checked', 'false')
      b.appendChild(icone(op.icone))
      b.appendChild(el('strong', '', op.rotulo))
      b.appendChild(el('small', '', 'Desligado'))
      b.addEventListener('click', function () {
        estado[op.chave] = !estado[op.chave]
        salvar()
        aplicar()
      })
      botoesOpcao[op.chave] = b
      li.appendChild(b)
      lista.appendChild(li)
    })

    var rodape = el('footer', 'a11y-rodape')
    var restaurar = el('button', 'a11y-restaurar')
    restaurar.type = 'button'
    restaurar.appendChild(icone('restart_alt'))
    restaurar.appendChild(el('strong', '', 'Restaurar padrão'))
    rodape.appendChild(restaurar)

    painel.appendChild(cab)
    painel.appendChild(grupoFonte)
    painel.appendChild(lista)
    painel.appendChild(rodape)

    raiz.appendChild(botao)
    raiz.appendChild(painel)
    document.body.appendChild(raiz)

    botao.addEventListener('click', function () {
      if (painel.hidden) abrir()
      else fechar(false)
    })

    btnFechar.addEventListener('click', function () { fechar(true) })

    botaoMenos.addEventListener('click', function () {
      if (estado.fonte > 0) {
        estado.fonte--
        salvar()
        aplicar()
      }
    })

    botaoMais.addEventListener('click', function () {
      if (estado.fonte < NIVEIS_FONTE.length - 1) {
        estado.fonte++
        salvar()
        aplicar()
      }
    })

    restaurar.addEventListener('click', function () {
      estado = JSON.parse(JSON.stringify(PADRAO))
      salvar()
      aplicar()
    })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !painel.hidden) fechar(true)
    })

    document.addEventListener('click', function (e) {
      if (!painel.hidden && !raiz.contains(e.target)) fechar(false)
    })

    window.addEventListener('resize', posicionar)
    window.addEventListener('load', function () { posicionar(); marcarAreasEscuras() })

    aplicar()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar)
  } else {
    montar()
  }
})()
