// Decide para qual painel/lista de vídeos o aluno deve ir,
// de acordo com o plano contratado (1 = Free, 2 = Lazuli, 3 = Diamante).
// Extraído do router.js porque é usado tanto ali quanto nos controllers.

function redirecionarPainelAluno(idPlano) {
    const plano = Number(idPlano)

    if (plano === 2) return '/painellazuli'
    if (plano === 3) return '/paineldiamante'

    return '/painelfree'
}

function redirecionarVideosAluno(idPlano) {
    const plano = Number(idPlano)

    if (plano >= 2) return '/videos'

    return '/videosfree'
}

module.exports = {
    redirecionarPainelAluno,
    redirecionarVideosAluno
}
