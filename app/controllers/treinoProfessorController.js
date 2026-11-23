const db = require('../config/pool_conexoes')

// =======================
// TREINO PERSONALIZADO (PROFESSOR -> ALUNO)
// =======================
// O professor monta, para cada aluno vinculado, uma ficha com recomendação e
// exercícios (séries, repetições, carga, descanso, vídeo). O aluno vê tudo em /meutreino.
// Usa as tabelas ficha_treino (1 por aluno vinculado) e exercicio.

const NIVEIS = ['iniciante', 'intermediario', 'avancado']
const DIAS = ['A', 'B', 'C', 'D', 'E']
const MAX_EXERCICIOS = 40

function texto(valor, max) {
    return String(valor === undefined || valor === null ? '' : valor).trim().slice(0, max)
}

function inteiro(valor, min, max) {
    if (valor === '' || valor === null || valor === undefined) return null

    const n = Number(valor)

    if (!Number.isInteger(n) || n < min || n > max) return NaN

    return n
}

function decimal(valor, min, max) {
    if (valor === '' || valor === null || valor === undefined) return null

    const n = Number(String(valor).replace(',', '.'))

    if (!Number.isFinite(n) || n < min || n > max) return NaN

    return Math.round(n * 100) / 100
}

// Confere se o aluno está vinculado a este professor e devolve a ficha dele
async function buscarVinculo(idProfessor, idAluno) {
    const [rows] = await db.query(
        `SELECT ft.id_ficha, ft.nome_ficha, ft.categoria, ft.nivel, ft.recomendacao, ft.treino_atualizado_em
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         WHERE af.id_aluno = ?
         AND ft.id_professor = ?
         AND af.ativo = 1
         ORDER BY af.atribuido_em DESC
         LIMIT 1`,
        [idAluno, idProfessor]
    )

    return rows[0] || null
}

async function buscarVideosDoProfessor(idProfessor) {
    const [rows] = await db.query(
        `SELECT id_video, titulo, categoria
         FROM video
         WHERE id_professor = ? AND ativo = 1
         ORDER BY titulo ASC`,
        [idProfessor]
    )

    return rows
}

function voltar(res, idAluno, tipo, mensagem) {
    return res.redirect(`/professor/treino/${idAluno}?${tipo}=` + encodeURIComponent(mensagem))
}

// =======================
// TELA DE MONTAR TREINO
// =======================

exports.exibir = async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.params.id)

    if (!Number.isInteger(idAluno) || idAluno <= 0) {
        return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno inválido.'))
    }

    try {
        const ficha = await buscarVinculo(idProfessor, idAluno)

        if (!ficha) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Este aluno não está vinculado ao seu perfil.'))
        }

        const [alunoRows] = await db.query(
            `SELECT a.id_aluno, a.nome, a.foto_perfil, a.id_plano, a.objetivo, a.tipo_treino, a.nivel_treino,
                    a.local_treino, a.equipamentos, a.dias_semana, a.limitacoes, a.dados_completos,
                    COALESCE(p.nome, 'Free') AS plano
             FROM aluno a
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             WHERE a.id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        if (alunoRows.length === 0) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno não encontrado.'))
        }

        const [exercicios] = await db.query(
            `SELECT id_exercicio, titulo, dia_treino, series, repeticoes, carga_kg, descanso_seg, observacao, id_video
             FROM exercicio
             WHERE id_ficha = ?
             ORDER BY dia_treino ASC, ordem ASC, id_exercicio ASC`,
            [ficha.id_ficha]
        )

        const videos = await buscarVideosDoProfessor(idProfessor)

        res.render('montartreino', {
            professor: req.session.professor,
            aluno: alunoRows[0],
            ficha,
            exercicios,
            videos,
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[montar treino GET]', err)

        res.redirect('/todosalunos?erro=' + encodeURIComponent('Não foi possível abrir a montagem de treino.'))
    }
}

// =======================
// SALVAR TREINO
// =======================

exports.salvar = async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.params.id)

    if (!Number.isInteger(idAluno) || idAluno <= 0) {
        return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno inválido.'))
    }

    const nomeFicha = texto(req.body.nome_ficha, 100)
    const categoria = texto(req.body.categoria, 50)
    const recomendacao = texto(req.body.recomendacao, 1500)
    const nivel = NIVEIS.includes(req.body.nivel) ? req.body.nivel : 'iniciante'

    if (nomeFicha.length < 3) {
        return voltar(res, idAluno, 'erro', 'Dê um nome ao treino (mínimo 3 caracteres).')
    }

    let lista

    try {
        lista = JSON.parse(req.body.exercicios_json || '[]')
    } catch (err) {
        return voltar(res, idAluno, 'erro', 'Não foi possível ler os exercícios enviados. Tente de novo.')
    }

    if (!Array.isArray(lista) || lista.length === 0) {
        return voltar(res, idAluno, 'erro', 'Adicione pelo menos um exercício ao treino.')
    }

    if (lista.length > MAX_EXERCICIOS) {
        return voltar(res, idAluno, 'erro', `O treino pode ter no máximo ${MAX_EXERCICIOS} exercícios.`)
    }

    try {
        const ficha = await buscarVinculo(idProfessor, idAluno)

        if (!ficha) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Este aluno não está vinculado ao seu perfil.'))
        }

        // Só aceita vídeos que são deste professor
        const videosDoProfessor = await buscarVideosDoProfessor(idProfessor)
        const idsVideoValidos = new Set(videosDoProfessor.map(video => Number(video.id_video)))

        const exercicios = []

        for (let i = 0; i < lista.length; i++) {
            const item = lista[i] || {}
            const numero = i + 1
            const titulo = texto(item.titulo, 100)

            if (titulo.length < 2) {
                return voltar(res, idAluno, 'erro', `Exercício ${numero}: informe o nome.`)
            }

            const dia = DIAS.includes(item.dia) ? item.dia : 'A'
            const series = inteiro(item.series, 1, 20)
            const repeticoes = inteiro(item.repeticoes, 1, 200)
            const descanso = inteiro(item.descanso_seg, 0, 600)
            const carga = decimal(item.carga_kg, 0, 999)

            if ([series, repeticoes, descanso, carga].some(valor => Number.isNaN(valor))) {
                return voltar(res, idAluno, 'erro', `Exercício ${numero} (${titulo}): confira séries, repetições, carga e descanso.`)
            }

            let idVideo = inteiro(item.id_video, 1, 2147483647)

            if (Number.isNaN(idVideo) || (idVideo !== null && !idsVideoValidos.has(idVideo))) {
                idVideo = null
            }

            exercicios.push([
                ficha.id_ficha,
                titulo,
                dia,
                series,
                repeticoes,
                carga,
                descanso,
                texto(item.observacao, 255) || null,
                idVideo,
                i + 1
            ])
        }

        const conexao = await db.getConnection()

        try {
            await conexao.beginTransaction()

            await conexao.query(
                `UPDATE ficha_treino
                 SET nome_ficha = ?, categoria = ?, nivel = ?, recomendacao = ?, treino_atualizado_em = NOW()
                 WHERE id_ficha = ?`,
                [nomeFicha, categoria || null, nivel, recomendacao || null, ficha.id_ficha]
            )

            await conexao.query('DELETE FROM exercicio WHERE id_ficha = ?', [ficha.id_ficha])

            for (const linha of exercicios) {
                await conexao.query(
                    `INSERT INTO exercicio
                     (id_ficha, titulo, dia_treino, series, repeticoes, carga_kg, descanso_seg, observacao, id_video, ordem)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    linha
                )
            }

            await conexao.commit()
        } catch (err) {
            await conexao.rollback()
            throw err
        } finally {
            conexao.release()
        }

        voltar(res, idAluno, 'sucesso', 'Treino salvo! O aluno já pode ver a sua recomendação.')
    } catch (err) {
        console.error('[montar treino POST]', err)

        voltar(res, idAluno, 'erro', 'Erro ao salvar o treino. Tente novamente.')
    }
}
