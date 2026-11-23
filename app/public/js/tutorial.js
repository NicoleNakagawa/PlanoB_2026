/* =====================================================================
   PlanoB - Tutorial de primeiro acesso
   Lê { tipo, nome, plano } de <script id="tutorial-config"> (gerado pelo
   partial tutorial.ejs, que só existe se a conta ainda não viu o tutorial).
   Ao concluir ou pular, avisa o servidor (POST /api/tutorial/concluir),
   que grava tutorial_visto = 1 - e o tutorial nunca mais aparece.
   ===================================================================== */
(function () {
  'use strict'

  var configEl = document.getElementById('tutorial-config')
  if (!configEl) return

  var config = {}

  try {
    config = JSON.parse(configEl.textContent || '{}')
  } catch (e) {
    return
  }

  if (!config.tipo) return

  // Procura o primeiro elemento VISÍVEL entre vários seletores (menu lateral no
  // desktop, menu inferior no celular)
  function achar(seletores) {
    for (var i = 0; i < seletores.length; i++) {
      var lista = document.querySelectorAll(seletores[i])

      for (var j = 0; j < lista.length; j++) {
        var r = lista[j].getBoundingClientRect()

        if (r.width > 0 && r.height > 0) return lista[j]
      }
    }

    return null
  }

  function menu(href) {
    return [
      'aside a[href="' + href + '"]',
      'aside a[href$="' + href + '"]',
      'nav[aria-label="Navegação mobile"] a[href="' + href + '"]',
      'nav[aria-label="Navegação mobile"] a[href$="' + href + '"]'
    ]
  }

  var primeiroNome = String(config.nome || '').trim().split(' ')[0]
  var plano = Number(config.plano) || 1
  var passos = []

  function passo(icone, titulo, texto, alvo) {
    passos.push({ icone: icone, titulo: titulo, texto: texto, alvo: alvo || null })
  }

  var SELETOR_MENU = ['aside nav[aria-label="Menu lateral"]', 'nav[aria-label="Navegação mobile"]']
  var SELETOR_ACESSIBILIDADE = ['.a11y-fab']
  var SELETOR_SUPORTE = ['aside .menu-sair-link--suporte']

  if (config.tipo === 'aluno') {
    passo('waving_hand', 'Bem-vindo ao PlanoB' + (primeiroNome ? ', ' + primeiroNome : '') + '!',
      'Vamos fazer um tour rápido para você saber <strong>onde fica cada coisa</strong> e como usar o site. Ele aparece <strong>só desta vez</strong>.')

    passo('menu', 'Seu menu de navegação',
      plano >= 2
        ? 'É por aqui que você vai para <strong>Início, Vídeos, Progresso, Feedback e Perfil</strong>. O menu fica sempre visível.'
        : 'É por aqui que você vai para <strong>Início, Vídeos, Planos e Perfil</strong>. O menu fica sempre visível.',
      SELETOR_MENU)

    passo('fitness_center', 'Início: seu painel',
      'Na tela inicial você acompanha o seu plano e os atalhos principais. Quando um professor monta um treino para você, aparece aqui o card <strong>Treino do seu professor</strong>, com a recomendação dele e o acesso à página <strong>Meu Treino</strong>.',
      menu(plano === 3 ? '/paineldiamante' : plano === 2 ? '/painellazuli' : '/painelfree'))

    passo('play_circle', 'Vídeos de treino',
      plano >= 2
        ? 'Aqui ficam <strong>todos os vídeos de treino</strong> do seu plano. Escolha um, faça o treino e registre para somar na sua evolução.'
        : 'No plano grátis você tem <strong>vídeos demonstrativos</strong> para conhecer a metodologia do PlanoB.',
      menu(plano >= 2 ? '/videos' : '/videosfree'))

    if (plano >= 2) {
      passo('monitoring', 'Progresso e ofensiva',
        'Acompanhe sua <strong>evolução semanal</strong> e sua <strong>ofensiva</strong> (dias seguidos treinando). Manter a ofensiva libera descontos na assinatura.',
        menu('/progressosemanal'))

      passo('forum', plano === 3 ? 'Feedback com o seu professor' : 'Feedback',
        plano === 3
          ? 'Converse com o professor, tire dúvidas e receba orientações. O <strong>treino personalizado</strong> que o professor montar para você aparece no seu painel, na página <strong>Meu Treino</strong>.'
          : 'Converse com os professores e envie suas dúvidas sobre os treinos.',
        menu('/feedbackaluno'))
    } else {
      passo('payments', 'Planos',
        'Quando quiser mais, compare os planos <strong>Lazuli</strong> e <strong>Diamante</strong> e escolha o que combina com você.',
        menu('#planos'))
    }

    passo('person', 'Perfil',
      'No <strong>Perfil</strong> você altera nome, e-mail e foto e vê o resumo dos seus treinos.',
      menu('/perfilaluno'))

    passo('accessibility_new', 'Acessibilidade',
      'Este botão, no canto superior direito de todas as páginas, abre o menu de acessibilidade: <strong>modo escuro, tamanho do texto, alto contraste</strong> e mais.',
      SELETOR_ACESSIBILIDADE)

    passo('support_agent', 'Precisa de ajuda?',
      'Em <strong>Suporte</strong> você encontra perguntas frequentes e pode <strong>abrir um chamado</strong>. A equipe responde dentro do próprio site.',
      SELETOR_SUPORTE)

    passo('task_alt', 'Tudo pronto!',
      'Agora é com você. Bons treinos! Você não verá este tutorial novamente.')
  } else {
    passo('waving_hand', 'Bem-vindo ao PlanoB' + (primeiroNome ? ', professor ' + primeiroNome : '') + '!',
      'Este tour mostra <strong>tudo o que você pode fazer</strong> como professor: acompanhar alunos, <strong>montar treinos personalizados</strong>, publicar vídeos e responder feedbacks. Leva 1 minuto e você pode revê-lo quando quiser em <strong>Rever tutorial</strong>, no menu lateral.')

    passo('menu', 'Seu menu de navegação',
      'É por aqui que você vai para <strong>Dashboard, Meus Alunos, Meus Vídeos, Feedbacks e Perfil</strong>. No celular, o menu fica na parte de baixo da tela.',
      SELETOR_MENU)

    passo('dashboard', 'Dashboard: sua visão geral',
      'Veja de relance <strong>quantos alunos</strong> estão vinculados, <strong>quantos vídeos</strong> você publicou, os <strong>feedbacks esperando resposta</strong> e a <strong>progressão média</strong> da sua turma. Também mostra alunos recentes, vídeos em destaque e atalhos.',
      menu('/painelprofessor'))

    passo('person_add', 'Vincular alunos',
      'Em <strong>Meus Alunos</strong> clique em <strong>Vincular aluno</strong>, escolha quem você vai acompanhar e confirme. Só alunos vinculados a você aparecem na sua lista, e você pode <strong>desvincular</strong> quando quiser.',
      menu('/todosalunos'))

    passo('edit_note', 'Montar treino para cada aluno',
      'Na lista de alunos, o botão de <strong>lápis</strong> abre a montagem de treino. Você vê o <strong>perfil do aluno</strong> (objetivo, nível, local, equipamentos, dias por semana e limitações), escreve a <strong>recomendação</strong> e adiciona os exercícios com <strong>dia (Treino A, B, C...), séries, repetições, carga, descanso e observações</strong>. Dá para reordenar com as setas e editar sempre que precisar.')

    passo('assignment_ind', 'O que o aluno enxerga',
      'Ao salvar, o aluno recebe um card no painel e a página <strong>Meu Treino</strong>, com a <strong>sua recomendação em destaque</strong>, os exercícios por dia e o botão para registrar que concluiu o treino. Cada aluno tem o <strong>seu</strong> treino, separado dos demais.')

    passo('monitoring', 'Acompanhar a evolução',
      'O botão de <strong>olho</strong> abre o perfil do aluno: treinos feitos, tempo, ofensiva (dias seguidos), frequência semanal e feedbacks. Use isso para ajustar o treino com base no que ele realmente está fazendo.')

    passo('video_library', 'Publicar e gerenciar vídeos',
      'Em <strong>Meus Vídeos</strong> você <strong>lança um vídeo</strong> enviando um arquivo ou colando um link (como o do YouTube), com título, categoria, nível e descrição. Também pode <strong>editar</strong> ou <strong>excluir</strong> os seus vídeos. Depois, vincule-os aos exercícios do treino.',
      menu('/todosvideos'))

    passo('forum', 'Feedbacks dos alunos',
      'Aqui chegam as mensagens dos alunos. <strong>Responda</strong> para tirar dúvidas, ajustar treinos e manter o acompanhamento em dia. As novas mensagens também aparecem no <strong>sininho</strong> do topo.',
      menu('/feedbackprofessor'))

    passo('person', 'Seu perfil profissional',
      'Atualize <strong>nome, e-mail, CREF</strong> e sua <strong>foto</strong>. Seus dados aparecem para os alunos vinculados a você.',
      menu('/perfilprofessor'))

    passo('accessibility_new', 'Acessibilidade',
      'Este botão, no canto superior direito de todas as páginas, abre o menu de acessibilidade: <strong>modo escuro, tamanho do texto, alto contraste</strong> e mais.',
      SELETOR_ACESSIBILIDADE)

    passo('support_agent', 'Precisa de ajuda?',
      'Em <strong>Suporte</strong> você encontra perguntas frequentes e pode <strong>abrir um chamado</strong>. A equipe responde dentro do próprio site.',
      SELETOR_SUPORTE)

    passo('task_alt', 'Tudo pronto!',
      'Comece vinculando seu primeiro aluno e montando o treino dele. Bom trabalho! Para ver este tour de novo, use <strong>Rever tutorial</strong> no menu lateral.')
  }

  var atual = 0
  var raiz, fundo, foco, card, elPasso, elIcone, elTitulo, elTexto, elProgresso, btnVoltar, btnProximo, btnPular
  var alvoAtual = null

  function el(tag, classe) {
    var e = document.createElement(tag)

    if (classe) e.className = classe

    return e
  }

  function finalizar() {
    try {
      fetch('/api/tutorial/concluir', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).catch(function () {})
    } catch (e) { /* sem rede: o tutorial pode aparecer de novo na próxima visita */ }

    window.removeEventListener('resize', posicionar)
    window.removeEventListener('scroll', posicionar, true)
    document.removeEventListener('keydown', teclado)

    if (raiz && raiz.parentNode) raiz.parentNode.removeChild(raiz)
  }

  function montar() {
    raiz = el('aside', 'tut-raiz')
    raiz.setAttribute('role', 'dialog')
    raiz.setAttribute('aria-modal', 'true')
    raiz.setAttribute('aria-labelledby', 'tut-titulo')
    raiz.setAttribute('aria-describedby', 'tut-texto')
    raiz.setAttribute('data-no-transition', '')

    fundo = el('b', 'tut-fundo')
    fundo.setAttribute('aria-hidden', 'true')

    foco = el('b', 'tut-foco')
    foco.setAttribute('aria-hidden', 'true')

    card = el('article', 'tut-card')

    var cab = el('header', 'tut-cab')
    elPasso = el('mark', 'tut-passo')

    var linha = el('p', 'tut-titulo-linha')
    linha.style.margin = '0'

    var figura = el('figure', 'tut-icone')
    figura.style.margin = '0'
    elIcone = el('i', 'material-symbols-outlined')
    elIcone.setAttribute('aria-hidden', 'true')
    figura.appendChild(elIcone)

    elTitulo = el('h2', 'tut-titulo')
    elTitulo.id = 'tut-titulo'

    linha.appendChild(figura)
    linha.appendChild(elTitulo)

    cab.appendChild(elPasso)
    cab.appendChild(linha)

    elTexto = el('p', 'tut-texto')
    elTexto.id = 'tut-texto'

    elProgresso = el('progress', 'tut-progresso')
    elProgresso.max = passos.length
    elProgresso.setAttribute('aria-label', 'Progresso do tutorial')

    var acoes = el('footer', 'tut-acoes')

    btnPular = el('button', 'tut-btn-pular')
    btnPular.type = 'button'
    btnPular.textContent = 'Pular tutorial'

    btnVoltar = el('button', 'tut-btn-voltar')
    btnVoltar.type = 'button'
    btnVoltar.textContent = 'Voltar'

    btnProximo = el('button', 'tut-btn-principal')
    btnProximo.type = 'button'

    acoes.appendChild(btnPular)
    acoes.appendChild(btnVoltar)
    acoes.appendChild(btnProximo)

    card.appendChild(cab)
    card.appendChild(elTexto)
    card.appendChild(elProgresso)
    card.appendChild(acoes)

    raiz.appendChild(fundo)
    raiz.appendChild(foco)
    raiz.appendChild(card)
    document.body.appendChild(raiz)

    btnPular.addEventListener('click', finalizar)
    btnVoltar.addEventListener('click', function () { ir(atual - 1) })
    btnProximo.addEventListener('click', function () {
      if (atual >= passos.length - 1) finalizar()
      else ir(atual + 1)
    })

    window.addEventListener('resize', posicionar)
    window.addEventListener('scroll', posicionar, true)
    document.addEventListener('keydown', teclado)

    ir(0)
  }

  function teclado(e) {
    if (e.key === 'Escape') finalizar()
    else if (e.key === 'ArrowRight' && atual < passos.length - 1) ir(atual + 1)
    else if (e.key === 'ArrowLeft' && atual > 0) ir(atual - 1)
  }

  function ir(i) {
    atual = Math.max(0, Math.min(passos.length - 1, i))

    var p = passos[atual]

    elPasso.textContent = 'Passo ' + (atual + 1) + ' de ' + passos.length
    elIcone.textContent = p.icone
    elTitulo.textContent = p.titulo
    elTexto.innerHTML = p.texto
    elProgresso.value = atual + 1

    btnVoltar.hidden = atual === 0
    btnPular.hidden = atual === passos.length - 1
    btnProximo.textContent = atual === 0 ? 'Começar' : atual === passos.length - 1 ? 'Concluir' : 'Próximo'

    alvoAtual = p.alvo ? achar(p.alvo) : null

    if (alvoAtual) {
      var r0 = alvoAtual.getBoundingClientRect()
      var foraDaTela = r0.bottom < 0 || r0.top > window.innerHeight

      if (foraDaTela) alvoAtual.scrollIntoView({ block: 'center' })
    }

    posicionar()
    btnProximo.focus({ preventScroll: true })
  }

  function limitar(valor, min, max) {
    return Math.max(min, Math.min(max, valor))
  }

  function posicionar() {
    if (!card) return

    var vw = window.innerWidth
    var vh = window.innerHeight
    var cw = card.offsetWidth
    var ch = card.offsetHeight

    if (!alvoAtual) {
      foco.classList.remove('tut-visivel')
      fundo.classList.add('tut-visivel')
      card.style.left = Math.round((vw - cw) / 2) + 'px'
      card.style.top = Math.round((vh - ch) / 2) + 'px'
      return
    }

    var r = alvoAtual.getBoundingClientRect()
    var folga = 6

    fundo.classList.remove('tut-visivel')
    foco.classList.add('tut-visivel')
    foco.style.top = Math.round(r.top - folga) + 'px'
    foco.style.left = Math.round(r.left - folga) + 'px'
    foco.style.width = Math.round(r.width + folga * 2) + 'px'
    foco.style.height = Math.round(r.height + folga * 2) + 'px'
    foco.style.borderRadius = Math.min(r.height / 2 + folga, 28) + 'px'

    var left, top

    if (vw >= 768 && r.right < 340 && r.width < 340) {
      // alvo no menu lateral: o card abre ao lado dele
      left = r.right + folga + 16
      top = r.top - 10
    } else {
      left = r.left + r.width / 2 - cw / 2

      if (r.top > vh / 2) top = r.top - ch - folga - 14
      else top = r.bottom + folga + 14
    }

    card.style.left = Math.round(limitar(left, 12, vw - cw - 12)) + 'px'
    card.style.top = Math.round(limitar(top, 12, vh - ch - 12)) + 'px'
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(montar, 400) })
  } else {
    setTimeout(montar, 400)
  }
})()
