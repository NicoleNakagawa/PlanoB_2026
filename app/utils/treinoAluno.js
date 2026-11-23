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

module.exports = { buscarTreinosDoAluno }
