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
