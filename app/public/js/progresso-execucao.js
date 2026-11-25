/* PlanoB - acompanhamento de execução e liberação do próximo vídeo. */
(function () {
  'use strict';

  var painel = document.querySelector('[data-pb-completion]');
  if (!painel) return;

  var barra = painel.querySelector('[data-pb-progressbar]');
  var preenchimento = painel.querySelector('[data-pb-progress-fill]');
  var rotulo = painel.querySelector('[data-pb-progress-label]');
  var mensagem = painel.querySelector('[data-pb-progress-message]');
  var botaoConcluir = document.querySelector('[data-pb-complete-button]');
  var proximo = document.querySelector('[data-pb-next-video]');
  var limite = Number(painel.getAttribute('data-required-percent')) || 80;
  var tempoAssistido = 0;
  var duracao = 0;
  var ultimoTempo = null;
  var concluido = false;

  function atualizar() {
    var percentual = duracao > 0 ? Math.min(100, Math.floor((tempoAssistido / duracao) * 100)) : 0;
    var liberado = duracao > 0 && percentual >= limite;

    preenchimento.style.width = percentual + '%';
    rotulo.textContent = percentual + '%';
    barra.setAttribute('aria-valuenow', String(percentual));

    if (liberado && !concluido) {
      concluido = true;
      mensagem.textContent = 'Exercício concluído! Você já pode avançar.';
      if (botaoConcluir) botaoConcluir.disabled = false;
      if (proximo) {
        proximo.setAttribute('aria-disabled', 'false');
        proximo.removeAttribute('tabindex');
        proximo.classList.remove('opacity-50', 'pointer-events-none');
        proximo.classList.add('hover:bg-primary', 'hover:text-white');
      }
    } else if (!concluido) {
      mensagem.textContent = 'Assista a pelo menos ' + limite + '% do vídeo para concluir.';
    }
  }

  function contarTempo(atual) {
    if (!isFinite(atual)) return;
    if (ultimoTempo !== null) {
      var diferenca = atual - ultimoTempo;
      // Só contabiliza avanço contínuo; saltos/avanços manuais não contam.
      if (diferenca > 0 && diferenca <= 2.5) {
        tempoAssistido += diferenca;
        atualizar();
      }
    }
    ultimoTempo = atual;
  }


  if (proximo) {
    proximo.addEventListener('click', function (evento) {
      if (!concluido) {
        evento.preventDefault();
        return;
      }
      var formulario = document.querySelector('[data-pb-completion-form]');
      var destino = formulario && formulario.querySelector('input[name="redirect_to"]');
      if (formulario && destino) {
        evento.preventDefault();
        destino.value = proximo.getAttribute('href');
        if (formulario.requestSubmit) formulario.requestSubmit();
        else formulario.submit();
      }
    });
  }

  var videoNativo = document.querySelector('video[data-pb-video]');
  if (videoNativo) {
    videoNativo.addEventListener('loadedmetadata', function () {
      duracao = videoNativo.duration || 0;
      ultimoTempo = videoNativo.currentTime || 0;
      atualizar();
    });
    videoNativo.addEventListener('timeupdate', function () {
      if (!videoNativo.paused && !videoNativo.seeking) contarTempo(videoNativo.currentTime);
    });
    videoNativo.addEventListener('seeking', function () { ultimoTempo = null; });
    videoNativo.addEventListener('seeked', function () { ultimoTempo = videoNativo.currentTime; });
    videoNativo.addEventListener('ended', function () { ultimoTempo = null; });
    return;
  }

  var iframe = document.querySelector('iframe[data-pb-youtube]');
  if (!iframe) {
    mensagem.textContent = 'Este exercício ainda não possui um vídeo disponível para acompanhar.';
    return;
  }

  var apiScript = document.createElement('script');
  apiScript.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(apiScript);

  var anteriorCallback = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (typeof anteriorCallback === 'function') anteriorCallback();
    if (!window.YT || !window.YT.Player) return;

    new window.YT.Player(iframe, {
      events: {
        onReady: function (evento) {
          duracao = evento.target.getDuration() || 0;
          atualizar();
          window.setInterval(function () {
            if (evento.target.getPlayerState() === window.YT.PlayerState.PLAYING) {
              var atual = evento.target.getCurrentTime();
              contarTempo(atual);
              var novaDuracao = evento.target.getDuration();
              if (novaDuracao > 0 && novaDuracao !== duracao) {
                duracao = novaDuracao;
                atualizar();
              }
            } else {
              ultimoTempo = null;
            }
          }, 1000);
        },
        onStateChange: function (evento) {
          if (evento.data === window.YT.PlayerState.PLAYING) {
            ultimoTempo = evento.target.getCurrentTime();
          } else {
            ultimoTempo = null;
          }
        },
        onError: function () {
          mensagem.textContent = 'O YouTube não permitiu carregar este vídeo. Tente outro exercício.';
        }
      }
    });
  };
})();
