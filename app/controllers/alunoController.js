const db = require('../config/pool_conexoes')
const { uploadPerfil } = require('../config/uploads')
const videosFree = require('../data/videosFree')
const { buscarVideosProfessores, descreverFonte } = require('../utils/videos')
const naoEncontrado = require('../utils/naoEncontrado')
const { buscarTreinosDoAluno, montarTreinoDoDia } = require('../utils/treinoAluno')
const { marcarTreinoLido } = require('../utils/notificacaoAluno')
const { redirecionarPainelAluno, redirecionarVideosAluno } = require('../utils/redirecionamentos')

// =======================
// PAINÉIS, DADOS E PERFIL DO ALUNO
// =======================


// Duração do teste gratuito (o plano Comum dura 1 semana)
const DIAS_TESTE_GRATUITO = 7
const DIA_MS = 24 * 60 * 60 * 1000

function calcularDiasTeste(criadoEm) {
    const inicio = criadoEm ? new Date(criadoEm).getTime() : NaN

    // Sem data de cadastro válida, não inventa contagem: mostra o teste inteiro
    if (!Number.isFinite(inicio)) return DIAS_TESTE_GRATUITO

    const diasPassados = Math.max(0, Math.floor((Date.now() - inicio) / DIA_MS))

    return Math.max(0, DIAS_TESTE_GRATUITO - diasPassados)
}

exports.painelFree = async (req, res) => {
    if (Number(req.session.aluno.id_plano) !== 1) {
        return res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    }

    let diasRestantes = DIAS_TESTE_GRATUITO

    try {
        const [rows] = await db.query(
            'SELECT criado_em FROM aluno WHERE id_aluno = ? LIMIT 1',
            [req.session.aluno.id]
        )

        if (rows.length > 0) diasRestantes = calcularDiasTeste(rows[0].criado_em)
    } catch (err) {
        console.error('[painelfree dias do teste]', err)
    }

    res.render('painelfree', {
        aluno: req.session.aluno,
        diasRestantes,
        diasTotais: DIAS_TESTE_GRATUITO,
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

        const [assinaturaRows] = await db.query(
            `SELECT a.id_assinatura, a.valor_cobrado, a.data_inicio, p.nome AS nome_plano
             FROM assinatura a
             JOIN plano p ON p.id_plano = a.id_plano
             WHERE a.id_aluno = ? AND a.status = 'ativa'
             ORDER BY a.id_assinatura DESC
             LIMIT 1`,
            [idAluno]
        )

        res.render('perfilaluno', {
            aluno: req.session.aluno,
            assinatura: assinaturaRows[0] || null,
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

// Cancelar plano: a assinatura fica "cancelada" e o aluno volta para o plano Free
exports.cancelarPlano = async (req, res) => {
    const idAluno = req.session.aluno.id

    if (Number(req.session.aluno.id_plano) < 2) {
        return res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Você não tem um plano pago para cancelar.'))
    }

    try {
        await db.query(
            `UPDATE assinatura
             SET status = 'cancelada', renovacao_auto = 0, data_fim = CURDATE()
             WHERE id_aluno = ? AND status = 'ativa'`,
            [idAluno]
        )

        await db.query('UPDATE aluno SET id_plano = 1 WHERE id_aluno = ?', [idAluno])

        req.session.aluno.id_plano = 1

        res.redirect('/perfilaluno?sucesso=' + encodeURIComponent('Plano cancelado. Sua conta voltou para o plano Free. Você pode assinar de novo quando quiser.'))
    } catch (err) {
        console.error('[cancelar plano]', err)

        res.redirect('/perfilaluno?erroPerfil=' + encodeURIComponent('Não foi possível cancelar o plano agora. Tente novamente.'))
    }
}

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

// Vídeos dos professores (de acordo com o plano do aluno) + vídeos fixos da plataforma.
// Se a consulta falhar, as telas continuam funcionando só com os vídeos fixos.
// Os vídeos fixos (data/videosFree.js) tocam quando têm videoUrl preenchido
function videosFixosComFonte(idPlano) {
    const plano = Number(idPlano) || 1

    // Vídeos com planoMin (intermediário/avançado) só aparecem para quem tem esse plano ou superior
    return videosFree.filter(video => !video.planoMin || plano >= video.planoMin).map(video => {
        const fonte = descreverFonte(video.videoUrl)

        return {
            ...video,
            tipoFonte: fonte.tipo,
            embedUrl: fonte.embedUrl,
            arquivoUrl: fonte.arquivoUrl
        }
    })
}

async function montarCatalogo(idPlano) {
    try {
        const videosProfessores = await buscarVideosProfessores(db, idPlano)
        return [...videosProfessores, ...videosFixosComFonte(idPlano)]
    } catch (err) {
        console.error('[catalogo de videos]', err)
        return videosFixosComFonte(idPlano)
    }
}

exports.videosFreePagina = async (req, res) => {
    if (Number(req.session.aluno.id_plano) >= 2) {
        return res.redirect('/videos')
    }

    const catalogo = await montarCatalogo(req.session.aluno.id_plano)

    res.render('videosfree', {
        aluno: req.session.aluno,
        videosFree: catalogo,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

exports.videosPagina = async (req, res) => {
    if (Number(req.session.aluno.id_plano) < 2) {
        return res.redirect('/videosfree')
    }

    const catalogo = await montarCatalogo(req.session.aluno.id_plano)

    res.render('videos', {
        aluno: req.session.aluno,
        videosFree: catalogo,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
}

// ---------- Treino montado pelo professor, executado exercício por exercício ----------

const CAPA_EXERCICIO_PROFESSOR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">' +
    '<rect width="640" height="360" fill="#0058ba"/>' +
    '<circle cx="320" cy="180" r="64" fill="#ffffff" fill-opacity="0.15"/>' +
    '<rect x="262" y="172" width="116" height="16" rx="8" fill="#ffffff"/>' +
    '<rect x="248" y="150" width="16" height="60" rx="6" fill="#ffffff"/>' +
    '<rect x="376" y="150" width="16" height="60" rx="6" fill="#ffffff"/>' +
    '</svg>'
)

const NIVEIS_TEXTO = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }

function prescricaoCurta(ex) {
    const partes = []

    if (ex.series && ex.repeticoes) partes.push(`${ex.series} × ${ex.repeticoes}`)
    else if (ex.series) partes.push(`${ex.series} série(s)`)
    else if (ex.repeticoes) partes.push(`${ex.repeticoes} repetições`)

    if (ex.carga_kg !== null && ex.carga_kg !== undefined && Number(ex.carga_kg) > 0) partes.push(`${Number(ex.carga_kg)} kg`)
    if (ex.descanso_seg !== null && ex.descanso_seg !== undefined) partes.push(`descanso ${ex.descanso_seg}s`)

    return partes.join(' • ')
}

// Tempo estimado (min) para registrar o treino quando o exercício não tem vídeo
function duracaoEstimadaMin(ex) {
    const series = Number(ex.series) || 3
    const reps = Number(ex.repeticoes) || 10
    const descanso = Number(ex.descanso_seg) || 45

    return Math.max(1, Math.round((series * (reps * 3 + descanso)) / 60))
}

// Converte um exercício da ficha no mesmo formato dos vídeos que a tela de execução já exibe
function exercicioParaExecucao(ex, treino, catalogo) {
    const base = ex.id_video ? catalogo.find(video => video.slug === 'prof-' + ex.id_video) : null
    const prescricao = prescricaoCurta(ex)

    const descricao = [
        prescricao ? 'Prescrição do professor: ' + prescricao + '.' : '',
        ex.observacao ? 'Observação: ' + ex.observacao : '',
        base ? base.descricao : ''
    ].filter(Boolean).join(' ') || 'Faça o exercício conforme a orientação do seu professor.'

    const item = base ? { ...base } : {
        categoria: 'Treino do professor',
        nivel: NIVEIS_TEXTO[treino.nivel] || 'Iniciante',
        duracao: '--:--',
        duracaoMin: 0,
        capa: CAPA_EXERCICIO_PROFESSOR,
        atencao1: 'Mantenha a postura correta durante todo o movimento.',
        atencao2: 'Pare o exercício se sentir dor e procure orientação.',
        tipoFonte: null,
        embedUrl: null,
        arquivoUrl: null
    }

    return {
        ...item,
        slug: 'ex-' + ex.id_exercicio,
        titulo: ex.titulo,
        descricao,
        prescricaoCurta: prescricao,
        duracaoMin: item.duracaoMin || duracaoEstimadaMin(ex),
        idExercicio: ex.id_exercicio,
        feito: !!ex.feito,
        href: `/execucaoexercicios?treino=${treino.id_ficha}&dia=${treino.dia}&ex=${ex.id_exercicio}`
    }
}

async function execucaoDoTreinoProfessor(req, res) {
    const aluno = req.session.aluno
    const idFicha = Number(req.query.treino)
    const diaPedido = typeof req.query.dia === 'string' ? req.query.dia.trim().toUpperCase().slice(0, 1) : ''
    const idExercicioPedido = Number(req.query.ex)

    if (!Number.isInteger(idFicha) || idFicha <= 0) {
        return naoEncontrado(req, res, 'Este treino não existe.')
    }

    let treinoDoDia = null

    try {
        const treinos = await buscarTreinosDoAluno(aluno.id, aluno.id_plano)
        const treino = treinos.find(item => Number(item.id_ficha) === idFicha)

        treinoDoDia = treino ? await montarTreinoDoDia(aluno.id, treino, diaPedido) : null
    } catch (err) {
        console.error('[execucao treino professor]', err)
    }

    if (!treinoDoDia || treinoDoDia.exercicios.length === 0) {
        return naoEncontrado(req, res, 'Este treino não está disponível para você.')
    }

    const catalogo = await montarCatalogo(aluno.id_plano)
    const lista = treinoDoDia.exercicios.map(ex => exercicioParaExecucao(ex, treinoDoDia, catalogo))

    // Sem ?ex= abre o primeiro exercício que ainda não foi feito hoje (ou o primeiro, se tudo já foi feito)
    const escolhido =
        lista.find(item => Number(item.idExercicio) === idExercicioPedido) ||
        lista.find(item => !item.feito) ||
        lista[0]

    // Abriu o treino: a notificação do sino deixa de ficar pendente
    marcarTreinoLido(aluno.id, idFicha).catch(err => console.error('[notificacao lida]', err.message))

    res.render('execucaoexercicios', {
        aluno,
        video: escolhido,
        videosFree: lista,
        modoTreino: {
            id_ficha: treinoDoDia.id_ficha,
            nome_ficha: treinoDoDia.nome_ficha,
            professor_nome: treinoDoDia.professor_nome,
            dia: treinoDoDia.dia,
            total: treinoDoDia.total,
            totalFeitos: treinoDoDia.totalFeitos,
            // Exercício sem vídeo: não dá para medir assistência, então o aluno conclui manualmente
            semVideo: !escolhido.embedUrl && !escolhido.arquivoUrl
        },
        linkPainelAluno: redirecionarPainelAluno(aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(aluno.id_plano)
    })
}

exports.execucaoExercicios = async (req, res) => {
    // ?treino=<id_ficha> abre o treino que o professor montou para o aluno
    if (req.query.treino !== undefined) {
        return execucaoDoTreinoProfessor(req, res)
    }

    const catalogo = await montarCatalogo(req.session.aluno.id_plano)
    const slugPedido = typeof req.query.video === 'string' ? req.query.video.trim() : ''

    // Sem ?video= abre o primeiro vídeo (agachamento, se existir).
    // Com ?video= que não existe, responde 404 em vez de mostrar outro vídeo.
    let videoSelecionado

    if (slugPedido) {
        videoSelecionado = catalogo.find(video => video.slug === slugPedido)

        if (!videoSelecionado) {
            return naoEncontrado(req, res, 'Este vídeo não existe ou não está disponível no seu plano.')
        }
    } else {
        videoSelecionado = catalogo.find(video => video.slug === 'agachamento') || catalogo[0]
    }

    if (!videoSelecionado) {
        return naoEncontrado(req, res, 'Ainda não há vídeos disponíveis.')
    }

    res.render('execucaoexercicios', {
        aluno: req.session.aluno,
        video: videoSelecionado,
        videosFree: catalogo,
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
