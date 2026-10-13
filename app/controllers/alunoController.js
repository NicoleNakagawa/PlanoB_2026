const db = require('../config/pool_conexoes')
const { uploadPerfil } = require('../config/uploads')
const videosFree = require('../data/videosFree')
const { redirecionarPainelAluno, redirecionarVideosAluno } = require('../utils/redirecionamentos')

// =======================
// PAINÉIS, DADOS E PERFIL DO ALUNO
// =======================


exports.painelFree = (req, res) => {
    if (Number(req.session.aluno.id_plano) !== 1) {
        return res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    }

    res.render('painelfree', {
        aluno: req.session.aluno,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

exports.painelLazuli = async (req, res) => {
    if (Number(req.session.aluno.id_plano) < 2) {
        return res.redirect('/painelfree')
    }

    const idAluno = req.session.aluno.id

    try {
        const [resumoSemanaRows] = await db.query(
            `SELECT 
                COUNT(*) AS total_treinos,
                COUNT(DISTINCT data_treino) AS dias_treinados,
                COALESCE(SUM(duracao_min), 0) AS tempo_total_min,
                COALESCE(SUM(calorias), 0) AS calorias_total,
                COALESCE(MAX(bpm_maximo), 0) AS bpm_maximo
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`,
            [idAluno]
        )

        const [resumoSemanaAnteriorRows] = await db.query(
            `SELECT COALESCE(SUM(duracao_min), 0) AS tempo_total_min
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
                AND DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 1 DAY)`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const [descontosRows] = await db.query(
            `SELECT codigo, percentual, dias_streak, usado, validade
             FROM desconto
             WHERE id_aluno = ?
             ORDER BY dias_streak ASC
             LIMIT 4`,
            [idAluno]
        )

        const resumoSemana = resumoSemanaRows[0] || {
            total_treinos: 0,
            dias_treinados: 0,
            tempo_total_min: 0,
            calorias_total: 0,
            bpm_maximo: 0
        }

        const tempoAtual = Number(resumoSemana.tempo_total_min) || 0
        const tempoAnterior = Number(resumoSemanaAnteriorRows[0]?.tempo_total_min) || 0

        let variacaoPct = 0

        if (tempoAnterior > 0) {
            variacaoPct = Math.round(((tempoAtual - tempoAnterior) / tempoAnterior) * 100)
        } else if (tempoAtual > 0) {
            variacaoPct = 100
        }

        const metaDias = 5
        const porcentagemMeta = Math.min(Math.round((Number(resumoSemana.dias_treinados) / metaDias) * 100), 100)
        const treinosRestantes = Math.max(metaDias - Number(resumoSemana.dias_treinados), 0)

        res.render('painellazuli', {
            aluno: req.session.aluno,
            videosFree,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana,
                streak: streakRows[0] || {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: descontosRows,
                variacaoPct,
                metaDias,
                porcentagemMeta,
                treinosRestantes,
                tempoSemanaAnterior: tempoAnterior
            }
        })
    } catch (err) {
        console.error('[painellazuli]', err)

        res.render('painellazuli', {
            aluno: req.session.aluno,
            videosFree,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana: {
                    total_treinos: 0,
                    dias_treinados: 0,
                    tempo_total_min: 0,
                    calorias_total: 0,
                    bpm_maximo: 0
                },
                streak: {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: [],
                variacaoPct: 0,
                metaDias: 5,
                porcentagemMeta: 0,
                treinosRestantes: 5,
                tempoSemanaAnterior: 0
            },
            erro: 'Erro ao carregar painel Lazuli.'
        })
    }
}

exports.painelDiamante = async (req, res) => {
    if (Number(req.session.aluno.id_plano) < 3) {
        return res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    }

    const idAluno = req.session.aluno.id

    try {
        const [resumoSemanaRows] = await db.query(
            `SELECT 
                COUNT(*) AS total_treinos,
                COUNT(DISTINCT data_treino) AS dias_treinados,
                COALESCE(SUM(duracao_min), 0) AS tempo_total_min,
                COALESCE(SUM(calorias), 0) AS calorias_total,
                COALESCE(MAX(bpm_maximo), 0) AS bpm_maximo
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`,
            [idAluno]
        )

        const [resumoSemanaAnteriorRows] = await db.query(
            `SELECT COALESCE(SUM(duracao_min), 0) AS tempo_total_min
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
                AND DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 1 DAY)`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const [descontosRows] = await db.query(
            `SELECT codigo, percentual, dias_streak, usado, validade
             FROM desconto
             WHERE id_aluno = ?
             ORDER BY dias_streak ASC
             LIMIT 4`,
            [idAluno]
        )

        const resumoSemana = resumoSemanaRows[0] || {
            total_treinos: 0,
            dias_treinados: 0,
            tempo_total_min: 0,
            calorias_total: 0,
            bpm_maximo: 0
        }

        const tempoAtual = Number(resumoSemana.tempo_total_min) || 0
        const tempoAnterior = Number(resumoSemanaAnteriorRows[0]?.tempo_total_min) || 0

        let variacaoPct = 0

        if (tempoAnterior > 0) {
            variacaoPct = Math.round(((tempoAtual - tempoAnterior) / tempoAnterior) * 100)
        } else if (tempoAtual > 0) {
            variacaoPct = 100
        }

        const metaDias = 5
        const porcentagemMeta = Math.min(Math.round((Number(resumoSemana.dias_treinados) / metaDias) * 100), 100)
        const treinosRestantes = Math.max(metaDias - Number(resumoSemana.dias_treinados), 0)

        res.render('paineldiamante', {
            aluno: req.session.aluno,
            videosFree,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana,
                streak: streakRows[0] || {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: descontosRows,
                variacaoPct,
                metaDias,
                porcentagemMeta,
                treinosRestantes,
                tempoSemanaAnterior: tempoAnterior
            }
        })
    } catch (err) {
        console.error('[paineldiamante]', err)

        res.render('paineldiamante', {
            aluno: req.session.aluno,
            videosFree,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana: {
                    total_treinos: 0,
                    dias_treinados: 0,
                    tempo_total_min: 0,
                    calorias_total: 0,
                    bpm_maximo: 0
                },
                streak: {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: [],
                variacaoPct: 0,
                metaDias: 5,
                porcentagemMeta: 0,
                treinosRestantes: 5,
                tempoSemanaAnterior: 0
            },
            erro: 'Erro ao carregar painel Diamante.'
        })
    }
}

exports.dadosAlunoForm = async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [rows] = await db.query(
            `SELECT 
                objetivo,
                tipo_treino,
                nivel_treino,
                local_treino,
                equipamentos,
                dias_semana,
                limitacoes,
                dados_completos
             FROM aluno
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: rows[0] || null
        })
    } catch (err) {
        console.error('[dadosaluno GET]', err)

        res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: null,
            erro: 'Erro ao carregar seus dados.'
        })
    }
}

exports.dadosAlunoSalvar = async (req, res) => {
    const idAluno = req.session.aluno.id

    const objetivo = req.body.objetivo
    const tipoTreino = req.body.tipo_treino
    const nivelTreino = req.body.nivel_treino
    const localTreino = req.body.local_treino
    const diasSemana = Number(req.body.dias_semana)
    const limitacoes = req.body.limitacoes || null

    let equipamentos = req.body.equipamentos || []

    if (!Array.isArray(equipamentos)) {
        equipamentos = [equipamentos]
    }

    const equipamentosTexto = equipamentos.join(',')

    if (!objetivo || !tipoTreino || !nivelTreino || !localTreino || !diasSemana || equipamentos.length === 0) {
        return res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: {
                objetivo,
                tipo_treino: tipoTreino,
                nivel_treino: nivelTreino,
                local_treino: localTreino,
                equipamentos: equipamentosTexto,
                dias_semana: diasSemana,
                limitacoes
            },
            erro: 'Preencha todos os campos obrigatórios antes de continuar.'
        })
    }

    try {
        await db.query(
            `UPDATE aluno
             SET objetivo = ?,
                 tipo_treino = ?,
                 nivel_treino = ?,
                 local_treino = ?,
                 equipamentos = ?,
                 dias_semana = ?,
                 limitacoes = ?,
                 dados_completos = 1
             WHERE id_aluno = ?`,
            [
                objetivo,
                tipoTreino,
                nivelTreino,
                localTreino,
                equipamentosTexto,
                diasSemana,
                limitacoes,
                idAluno
            ]
        )

        req.session.aluno.dados_completos = 1

        res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    } catch (err) {
        console.error('[dadosaluno POST]', err)

        res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: {
                objetivo,
                tipo_treino: tipoTreino,
                nivel_treino: nivelTreino,
                local_treino: localTreino,
                equipamentos: equipamentosTexto,
                dias_semana: diasSemana,
                limitacoes
            },
            erro: 'Erro ao salvar seus dados. Tente novamente.'
        })
    }
}

exports.perfilAluno = async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [historicoTreinos] = await db.query(
            `SELECT 
                st.id_sessao,
                st.data_treino,
                st.duracao_min,
                st.calorias,
                st.bpm_maximo,
                st.observacao,
                ft.nome_ficha,
                ft.categoria,
                ft.nivel
             FROM sessao_treino st
             LEFT JOIN ficha_treino ft ON ft.id_ficha = st.id_ficha
             WHERE st.id_aluno = ?
             ORDER BY st.data_treino DESC, st.id_sessao DESC
             LIMIT 8`,
            [idAluno]
        )

        const [resumoRows] = await db.query(
            `SELECT 
                COUNT(*) AS total_treinos,
                COALESCE(SUM(duracao_min), 0) AS tempo_total,
                COALESCE(ROUND(AVG(duracao_min)), 0) AS tempo_medio
             FROM sessao_treino
             WHERE id_aluno = ?`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const [dadosAlunoRows] = await db.query(
            `SELECT 
                objetivo,
                tipo_treino,
                nivel_treino,
                local_treino,
                equipamentos,
                dias_semana,
                limitacoes,
                dados_completos
             FROM aluno
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        res.render('perfilaluno', {
            aluno: req.session.aluno,
            historicoTreinos,
            resumoTreinos: resumoRows[0] || {
                total_treinos: 0,
                tempo_total: 0,
                tempo_medio: 0
            },
            streak: streakRows[0] || {
                streak_atual: 0,
                streak_maximo: 0
            },
            dadosAluno: dadosAlunoRows[0] || null,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            sucesso: req.query.sucesso || null,
            erroPerfil: req.query.erroPerfil || null
        })
    } catch (err) {
        console.error('[perfilaluno]', err)

        res.render('perfilaluno', {
            aluno: req.session.aluno,
            historicoTreinos: [],
            resumoTreinos: {
                total_treinos: 0,
                tempo_total: 0,
                tempo_medio: 0
            },
            streak: {
                streak_atual: 0,
                streak_maximo: 0
            },
            dadosAluno: null,
            erro: 'Erro ao carregar o perfil.',
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            sucesso: null,
            erroPerfil: req.query.erroPerfil || null
        })
    }
}

// =======================
// ALTERAR PERFIL, VÍDEOS E PROGRESSO DO ALUNO
// =======================

exports.atualizarDados = async (req, res) => {
    const idAluno = req.session.aluno.id

    const nome = (req.body.nome || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()

    if (!nome || !email) {
        return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Preencha nome e e-mail.'))
    }

    if (!email.includes('@') || !email.includes('.')) {
        return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Informe um e-mail válido.'))
    }

    try {
        const [emailAlunoRows] = await db.query(
            `SELECT id_aluno
             FROM aluno
             WHERE email = ?
             AND id_aluno <> ?
             LIMIT 1`,
            [email, idAluno]
        )

        if (emailAlunoRows.length > 0) {
            return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Este e-mail já está sendo usado por outro aluno.'))
        }

        const [emailProfessorRows] = await db.query(
            `SELECT id_professor
             FROM professor
             WHERE email = ?
             LIMIT 1`,
            [email]
        )

        if (emailProfessorRows.length > 0) {
            return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Este e-mail já está sendo usado por um professor.'))
        }

        await db.query(
            `UPDATE aluno
             SET nome = ?,
                 email = ?
             WHERE id_aluno = ?`,
            [nome, email, idAluno]
        )

        req.session.aluno.nome = nome
        req.session.aluno.email = email

        res.redirect('/perfilaluno?sucesso=' + encodeURIComponent('Dados do perfil atualizados com sucesso.'))
    } catch (err) {
        console.error('[perfilaluno dados]', err)

        res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Erro ao atualizar os dados do perfil.'))
    }
}


exports.atualizarFoto = (req, res) => {
    uploadPerfil.single('foto_perfil')(req, res, async (err) => {
        const idAluno = req.session.aluno.id

        if (err) {
            return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent(err.message))
        }

        if (!req.file) {
            return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Selecione uma imagem para alterar a foto.'))
        }

        const fotoPerfil = `/uploads/perfis/${req.file.filename}`

        try {
            await db.query(
                `UPDATE aluno
                 SET foto_perfil = ?
                 WHERE id_aluno = ?`,
                [fotoPerfil, idAluno]
            )

            req.session.aluno.foto = fotoPerfil

            res.redirect('/perfilaluno?sucesso=' + encodeURIComponent('Foto de perfil atualizada com sucesso.'))
        } catch (err) {
            console.error('[perfilaluno foto]', err)

            res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Erro ao atualizar a foto de perfil.'))
        }
    })
}

exports.perfilProfParaAluno = (req, res) => {
    res.render('perfilprofparaaluno', {
        aluno: req.session.aluno,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

exports.videosFreePagina = (req, res) => {
    if (Number(req.session.aluno.id_plano) >= 2) {
        return res.redirect('/videos')
    }

    res.render('videosfree', {
        aluno: req.session.aluno,
        videosFree,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

exports.videosPagina = (req, res) => {
    if (Number(req.session.aluno.id_plano) < 2) {
        return res.redirect('/videosfree')
    }

    res.render('videos', {
        aluno: req.session.aluno,
        videosFree,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

exports.execucaoExercicios = (req, res) => {
    const slug = req.query.video || 'agachamento'
    const videoSelecionado = videosFree.find(video => video.slug === slug) || videosFree[0]

    res.render('execucaoexercicios', {
        aluno: req.session.aluno,
        video: videoSelecionado,
        videosFree,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

exports.progressoSemanal = async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [resumoSemanaRows] = await db.query(
            `SELECT 
                COUNT(*) AS total_treinos,
                COUNT(DISTINCT data_treino) AS dias_treinados,
                COALESCE(SUM(duracao_min), 0) AS tempo_total_min,
                COALESCE(SUM(calorias), 0) AS calorias_total,
                COALESCE(MAX(bpm_maximo), 0) AS bpm_maximo
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`,
            [idAluno]
        )

        const [resumoSemanaAnteriorRows] = await db.query(
            `SELECT COALESCE(SUM(duracao_min), 0) AS tempo_total_min
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
                AND DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 1 DAY)`,
            [idAluno]
        )

        const [treinosPorDiaRows] = await db.query(
            `SELECT 
                data_treino,
                WEEKDAY(data_treino) AS dia_semana,
                COUNT(*) AS total_treinos,
                COALESCE(SUM(duracao_min), 0) AS total_minutos
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)
             GROUP BY data_treino, WEEKDAY(data_treino)
             ORDER BY data_treino`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const [descontosRows] = await db.query(
            `SELECT codigo, percentual, dias_streak, usado, validade
             FROM desconto
             WHERE id_aluno = ?
             ORDER BY dias_streak ASC
             LIMIT 4`,
            [idAluno]
        )

        const resumoSemana = resumoSemanaRows[0] || {
            total_treinos: 0,
            dias_treinados: 0,
            tempo_total_min: 0,
            calorias_total: 0,
            bpm_maximo: 0
        }

        const tempoAtual = Number(resumoSemana.tempo_total_min) || 0
        const tempoAnterior = Number(resumoSemanaAnteriorRows[0]?.tempo_total_min) || 0

        let variacaoPct = 0

        if (tempoAnterior > 0) {
            variacaoPct = Math.round(((tempoAtual - tempoAnterior) / tempoAnterior) * 100)
        } else if (tempoAtual > 0) {
            variacaoPct = 100
        }

        const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

        const graficoSemana = diasSemana.map((dia, index) => {
            const encontrado = treinosPorDiaRows.find(item => Number(item.dia_semana) === index)

            return {
                dia,
                minutos: encontrado ? Number(encontrado.total_minutos) : 0,
                treinos: encontrado ? Number(encontrado.total_treinos) : 0
            }
        })

        const maiorMinuto = Math.max(...graficoSemana.map(item => item.minutos), 100)

        const graficoSemanaNormalizado = graficoSemana.map(item => {
            return {
                ...item,
                porcentagem: maiorMinuto > 0 ? Math.round((item.minutos / maiorMinuto) * 100) : 0
            }
        })

        const metaDias = 5
        const porcentagemMeta = Math.min(Math.round((Number(resumoSemana.dias_treinados) / metaDias) * 100), 100)
        const treinosRestantes = Math.max(metaDias - Number(resumoSemana.dias_treinados), 0)

        res.render('progressosemanal', {
            aluno: req.session.aluno,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana,
                graficoSemana: graficoSemanaNormalizado,
                streak: streakRows[0] || {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: descontosRows,
                variacaoPct,
                metaDias,
                porcentagemMeta,
                treinosRestantes,
                tempoSemanaAnterior: tempoAnterior
            }
        })
    } catch (err) {
        console.error('[progressosemanal]', err)

        res.render('progressosemanal', {
            aluno: req.session.aluno,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana: {
                    total_treinos: 0,
                    dias_treinados: 0,
                    tempo_total_min: 0,
                    calorias_total: 0,
                    bpm_maximo: 0
                },
                graficoSemana: [
                    { dia: 'Seg', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Ter', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Qua', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Qui', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Sex', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Sáb', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Dom', minutos: 0, treinos: 0, porcentagem: 0 }
                ],
                streak: {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: [],
                variacaoPct: 0,
                metaDias: 5,
                porcentagemMeta: 0,
                treinosRestantes: 5,
                tempoSemanaAnterior: 0
            },
            erro: 'Erro ao carregar progresso semanal.'
        })
    }
}

exports.streakProgress = async (req, res) => {
    const idAluno = req.session.aluno.id

    const recompensasPadrao = [
        { dias: 10, percentual: 5, codigo: 'OFENSIVA10' },
        { dias: 40, percentual: 20, codigo: 'OFENSIVA40' },
        { dias: 50, percentual: 35, codigo: 'OFENSIVA50' },
        { dias: 90, percentual: 50, codigo: 'OFENSIVA90' }
    ]

    try {
        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const streak = streakRows[0] || {
            streak_atual: 0,
            streak_maximo: 0,
            ultima_atividade: null
        }

        for (const recompensa of recompensasPadrao) {
            if (Number(streak.streak_atual) >= recompensa.dias) {
                const [existe] = await db.query(
                    `SELECT id_desconto
                     FROM desconto
                     WHERE id_aluno = ?
                     AND codigo = ?
                     LIMIT 1`,
                    [idAluno, recompensa.codigo]
                )

                if (existe.length === 0) {
                    await db.query(
                        `INSERT INTO desconto
                         (id_aluno, codigo, percentual, dias_streak, usado, validade)
                         VALUES (?, ?, ?, ?, 0, DATE_ADD(CURDATE(), INTERVAL 30 DAY))`,
                        [
                            idAluno,
                            recompensa.codigo,
                            recompensa.percentual,
                            recompensa.dias
                        ]
                    )
                }
            }
        }

        const [descontosRows] = await db.query(
            `SELECT id_desconto, codigo, percentual, dias_streak, usado, validade
             FROM desconto
             WHERE id_aluno = ?
             ORDER BY dias_streak ASC`,
            [idAluno]
        )

        res.render('streakprogress', {
            aluno: req.session.aluno,
            streak,
            descontos: descontosRows,
            recompensas: recompensasPadrao,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    } catch (err) {
        console.error('[streakprogress]', err)

        res.render('streakprogress', {
            aluno: req.session.aluno,
            streak: {
                streak_atual: 0,
                streak_maximo: 0,
                ultima_atividade: null
            },
            descontos: [],
            recompensas: recompensasPadrao,
            erro: 'Erro ao carregar sua ofensiva.',
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    }
}
