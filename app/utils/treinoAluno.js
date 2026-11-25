const db = require('../config/pool_conexoes')
const { buscarVideosProfessores } = require('./videos')

// Treinos que os professores montaram para o aluno (um por professor vinculado)
// já com os exercícios agrupados por dia (Treino A, B, C...).
async function buscarTreinosDoAluno(idAluno, idPlano) {
    const [fichas] = await db.query(
        `SELECT ft.id_ficha, ft.nome_ficha, ft.categoria, ft.nivel, ft.recomendacao, ft.treino_atualizado_em,
                p.nome AS professor_nome, p.foto_perfil AS professor_foto, p.cref AS professor_cref
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         JOIN professor p ON p.id_professor = ft.id_professor
         WHERE af.id_aluno = ?
         AND af.ativo = 1
         AND ft.treino_atualizado_em IS NOT NULL
         ORDER BY ft.treino_atualizado_em DESC`,
        [idAluno]
    )

    if (fichas.length === 0) return []

    const ids = fichas.map(ficha => ficha.id_ficha)

    const [exercicios] = await db.query(
        `SELECT id_ficha, id_exercicio, titulo, dia_treino, series, repeticoes, carga_kg, descanso_seg, observacao, id_video
         FROM exercicio
         WHERE id_ficha IN (?)
         ORDER BY dia_treino ASC, ordem ASC, id_exercicio ASC`,
        [ids]
    )

    // Só mostra o botão "ver vídeo" para vídeos que o plano do aluno realmente pode abrir
    const videosLiberados = new Set()

    try {
        const catalogo = await buscarVideosProfessores(db, idPlano)

        catalogo.forEach(video => {
            if (video.slug) videosLiberados.add(video.slug)
        })
    } catch (err) {
        console.error('[treino aluno] catálogo de vídeos:', err.message)
    }

    return fichas.map(ficha => {
        const doTreino = exercicios.filter(item => item.id_ficha === ficha.id_ficha)
        const porDia = {}

        doTreino.forEach(item => {
            const slug = item.id_video ? 'prof-' + item.id_video : null
            const dia = item.dia_treino || 'A'

            if (!porDia[dia]) porDia[dia] = []

            porDia[dia].push({
                ...item,
                slugVideo: slug && videosLiberados.has(slug) ? slug : null
            })
        })

        return {
            ...ficha,
            totalExercicios: doTreino.length,
            dias: Object.keys(porDia).sort().map(dia => ({ dia, exercicios: porDia[dia] }))
        }
    })
}

// Exercícios do treino que o aluno já concluiu (hoje e em dias anteriores)
async function buscarConclusoes(idAluno, idFicha) {
    try {
        const [rows] = await db.query(
            `SELECT id_exercicio, dia_treino,
                    DATE_FORMAT(data_conclusao, '%Y-%m-%d') AS data,
                    (data_conclusao = CURDATE()) AS hoje
             FROM exercicio_concluido
             WHERE id_aluno = ? AND id_ficha = ?
             ORDER BY concluido_em DESC`,
            [idAluno, idFicha]
        )

        return rows
    } catch (err) {
        console.error('[treino aluno] conclusões:', err.message)
        return []
    }
}

// "Treino do dia": o professor monta Treino A, B, C... e o aluno segue em sequência.
// - se o aluno já começou um dia hoje, continua nesse dia;
// - senão, vai para o próximo da sequência (conta os dias em que ele treinou esta ficha).
function escolherDia(treino, conclusoes) {
    const dias = treino.dias.map(grupo => grupo.dia)

    const deHoje = conclusoes.filter(item => Number(item.hoje) === 1)

    if (deHoje.length > 0 && dias.includes(deHoje[0].dia_treino)) {
        return deHoje[0].dia_treino
    }

    const datasAnteriores = new Set(
        conclusoes.filter(item => Number(item.hoje) !== 1).map(item => item.data)
    )

    return dias[datasAnteriores.size % dias.length]
}

function exercicioComStatus(exercicio, conclusoes) {
    const feitoHoje = conclusoes.some(item => Number(item.hoje) === 1 && Number(item.id_exercicio) === Number(exercicio.id_exercicio))

    return { ...exercicio, feito: feitoHoje }
}

// Monta os dados do treino de uma ficha para um dia (se dia não vier, usa o treino do dia)
async function montarTreinoDoDia(idAluno, treino, diaPedido) {
    if (!treino || !treino.dias || treino.dias.length === 0) return null

    const conclusoes = await buscarConclusoes(idAluno, treino.id_ficha)
    const dias = treino.dias.map(grupo => grupo.dia)
    const dia = diaPedido && dias.includes(diaPedido) ? diaPedido : escolherDia(treino, conclusoes)
    const grupo = treino.dias.find(item => item.dia === dia)

    const exercicios = grupo.exercicios.map(item => exercicioComStatus(item, conclusoes))
    const totalFeitos = exercicios.filter(item => item.feito).length

    return {
        id_ficha: treino.id_ficha,
        nome_ficha: treino.nome_ficha,
        nivel: treino.nivel,
        recomendacao: treino.recomendacao || '',
        professor_nome: treino.professor_nome,
        dia,
        exercicios,
        total: exercicios.length,
        totalFeitos,
        concluido: exercicios.length > 0 && totalFeitos === exercicios.length,
        proximo: exercicios.find(item => !item.feito) || null
    }
}

async function buscarTreinoDoDia(idAluno, idPlano) {
    const treinos = await buscarTreinosDoAluno(idAluno, idPlano)

    if (treinos.length === 0) return null

    return montarTreinoDoDia(idAluno, treinos[0])
}

module.exports = { buscarTreinosDoAluno, buscarTreinoDoDia, montarTreinoDoDia }
