const { buscarTreinosDoAluno, buscarTreinoDoDia } = require('../utils/treinoAluno')
const { redirecionarPainelAluno } = require('../utils/redirecionamentos')

// Página do aluno com o treino e a recomendação feitos pelo professor
exports.exibir = async (req, res) => {
    const aluno = req.session.aluno

    try {
        const treinos = await buscarTreinosDoAluno(aluno.id, aluno.id_plano)

        res.render('meutreino', {
            aluno,
            treinos,
            linkPainelAluno: redirecionarPainelAluno(aluno.id_plano),
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[meutreino]', err)

        res.render('meutreino', {
            aluno,
            treinos: [],
            linkPainelAluno: redirecionarPainelAluno(aluno.id_plano),
            sucesso: null,
            erro: 'Não foi possível carregar o seu treino agora. Tente novamente.'
        })
    }
}

// Middleware: deixa um resumo do treino disponível para os painéis (card "Treino do professor")
exports.resumoParaPainel = async (req, res, next) => {
    res.locals.resumoTreino = null
    res.locals.treinoDoDia = null

    try {
        const aluno = req.session.aluno
        const treinos = await buscarTreinosDoAluno(aluno.id, aluno.id_plano)

        if (treinos.length > 0) {
            const principal = treinos[0]

            res.locals.resumoTreino = {
                nome: principal.nome_ficha,
                professor: principal.professor_nome,
                totalExercicios: principal.totalExercicios,
                recomendacao: principal.recomendacao || ''
            }

            // Recomendação do dia: o treino (A, B, C...) que o aluno deve fazer hoje
            res.locals.treinoDoDia = await buscarTreinoDoDia(aluno.id, aluno.id_plano)
        }
    } catch (err) {
        console.error('[resumo treino painel]', err.message)
    }

    next()
}
