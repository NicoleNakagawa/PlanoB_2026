const bcrypt = require('bcrypt')
const db = require('../config/pool_conexoes')

// =======================
// HELPERS INTERNOS
// (usados só dentro deste controller, por isso não estão em um
// arquivo separado — se algum outro controller precisar deles no
// futuro, aí sim vale mover para app/utils/db.js)
// =======================

async function tabelaExiste(nomeTabela) {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [nomeTabela])
    return rows.length > 0
}

async function executarSeTabelaExiste(nomeTabela, sql, params = []) {
    const existe = await tabelaExiste(nomeTabela)

    if (existe) {
        await db.query(sql, params)
    }
}

async function contarSeTabelaExiste(nomeTabela, sql, params = []) {
    const existe = await tabelaExiste(nomeTabela)

    if (!existe) {
        return 0
    }

    const [rows] = await db.query(sql, params)
    return rows[0]?.total || 0
}

// =======================
// LOGIN DO MODERADOR
// =======================

exports.loginForm = (req, res) => {
    res.render('loginmoderador', {
        erro: null,
        sucesso: null
    })
}

exports.login = async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase()
    const senha = req.body.password || req.body.senha || ''

    if (!email || !senha) {
        return res.render('loginmoderador', {
            erro: 'Informe e-mail e senha.',
            sucesso: null
        })
    }

    try {
        const [rows] = await db.query(
            `SELECT id_moderador, nome, email, senha_hash, nivel, foto_perfil, ativo
             FROM moderador
             WHERE email = ?
             LIMIT 1`,
            [email]
        )

        if (rows.length === 0) {
            return res.render('loginmoderador', {
                erro: 'E-mail ou senha inválidos.',
                sucesso: null
            })
        }

        const moderador = rows[0]

        if (Number(moderador.ativo) !== 1) {
            return res.render('loginmoderador', {
                erro: 'Este moderador está desativado.',
                sucesso: null
            })
        }

        const senhaCorreta = await bcrypt.compare(senha, moderador.senha_hash)

        if (!senhaCorreta) {
            return res.render('loginmoderador', {
                erro: 'E-mail ou senha inválidos.',
                sucesso: null
            })
        }

        req.session.moderador = {
            id: moderador.id_moderador,
            nome: moderador.nome,
            email: moderador.email,
            nivel: moderador.nivel,
            foto: moderador.foto_perfil
        }

        res.redirect('/moderador')
    } catch (err) {
        console.error('[loginmoderador]', err)

        res.render('loginmoderador', {
            erro: 'Erro interno ao fazer login de moderador.',
            sucesso: null
        })
    }
}

// =======================
// PAINEL DO MODERADOR
// =======================

exports.painel = async (req, res) => {
    const busca = (req.query.busca || '').trim()
    const tipo = (req.query.tipo || 'todos').trim()

    try {
        const [totalAlunosRows] = await db.query(
            `SELECT COUNT(*) AS total FROM aluno`
        )

        const [totalProfessoresRows] = await db.query(
            `SELECT COUNT(*) AS total FROM professor`
        )

        const [totalDiamanteRows] = await db.query(
            `SELECT COUNT(*) AS total
             FROM aluno
             WHERE id_plano = 3`
        )

        const receitaMensal = await contarSeTabelaExiste(
            'pagamento',
            `SELECT COALESCE(SUM(valor), 0) AS total
            FROM pagamento
            WHERE status = 'aprovado'`
        )

        const usuarios = []

        if (tipo === 'todos' || tipo === 'alunos') {
            const params = []
            let filtro = ''

            if (busca) {
                filtro = `WHERE a.nome LIKE ? OR a.email LIKE ?`
                params.push(`%${busca}%`, `%${busca}%`)
            }

            const [alunosRows] = await db.query(
                `SELECT
                    'aluno' AS tipo_usuario,
                    a.id_aluno AS id,
                    a.nome,
                    a.email,
                    a.foto_perfil,
                    a.id_plano,
                    COALESCE(p.nome, 'Free') AS plano,
                    a.criado_em,
                    (
                        SELECT COUNT(*)
                        FROM sessao_treino st
                        WHERE st.id_aluno = a.id_aluno
                    ) AS total_atividades,
                    (
                        SELECT MAX(st.data_treino)
                        FROM sessao_treino st
                        WHERE st.id_aluno = a.id_aluno
                    ) AS ultima_atividade
                 FROM aluno a
                 LEFT JOIN plano p ON p.id_plano = a.id_plano
                 ${filtro}
                 ORDER BY a.id_aluno DESC
                 LIMIT 150`,
                params
            )

            usuarios.push(...alunosRows)
        }

        if (tipo === 'todos' || tipo === 'professores') {
            const params = []
            let filtro = ''

            if (busca) {
                filtro = `WHERE p.nome LIKE ? OR p.email LIKE ? OR p.cref LIKE ?`
                params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
            }

            const [professoresRows] = await db.query(
                `SELECT
                    'professor' AS tipo_usuario,
                    p.id_professor AS id,
                    p.nome,
                    p.email,
                    p.foto_perfil,
                    NULL AS id_plano,
                    'Professor' AS plano,
                    NULL AS criado_em,
                    (
                        SELECT COUNT(*)
                        FROM video v
                        WHERE v.id_professor = p.id_professor
                        AND v.ativo = 1
                    ) AS total_atividades,
                    NULL AS ultima_atividade
                 FROM professor p
                 ${filtro}
                 ORDER BY p.id_professor DESC
                 LIMIT 150`,
                params
            )

            usuarios.push(...professoresRows)
        }

        const [atividadesAlunos] = await db.query(
            `SELECT
                'cadastro_aluno' AS tipo,
                a.nome,
                a.email,
                COALESCE(p.nome, 'Free') AS detalhe,
                a.criado_em AS data_evento
             FROM aluno a
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             ORDER BY a.id_aluno DESC
             LIMIT 8`
        )

        const [atividadesProfessores] = await db.query(
            `SELECT
                'cadastro_professor' AS tipo,
                p.nome,
                p.email,
                COALESCE(p.cref, 'Sem CREF') AS detalhe,
                NULL AS data_evento
             FROM professor p
             ORDER BY p.id_professor DESC
             LIMIT 8`
        )

        const atividadesRecentes = atividadesAlunos
            .concat(atividadesProfessores)
            .slice(0, 10)

        res.render('moderador', {
            moderador: req.session.moderador,
            usuarios,
            atividadesRecentes,
            estatisticas: {
                totalAlunos: totalAlunosRows[0]?.total || 0,
                totalProfessores: totalProfessoresRows[0]?.total || 0,
                totalDiamante: totalDiamanteRows[0]?.total || 0,
                receitaMensal
            },
            filtros: {
                busca,
                tipo
            },
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[moderador]', err)

        res.render('moderador', {
            moderador: req.session.moderador,
            usuarios: [],
            atividadesRecentes: [],
            estatisticas: {
                totalAlunos: 0,
                totalProfessores: 0,
                totalDiamante: 0,
                receitaMensal: 0
            },
            filtros: {
                busca,
                tipo
            },
            sucesso: null,
            erro: 'Erro ao carregar painel do moderador: ' + err.message
        })
    }
}

// =======================
// EXCLUIR CADASTRO
// =======================

exports.excluir = async (req, res) => {
    const tipo = req.params.tipo
    const id = Number(req.params.id)

    if (!id || !['aluno', 'professor'].includes(tipo)) {
        return res.redirect('/moderador?erro=' + encodeURIComponent('Cadastro inválido.'))
    }

    try {
        await db.query('START TRANSACTION')

        if (tipo === 'aluno') {
            await executarSeTabelaExiste(
                'mensagem_feedback',
                `DELETE mf FROM mensagem_feedback mf
                 JOIN chat_feedback cf ON cf.id_chat = mf.id_chat
                 WHERE cf.id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'chat_feedback',
                `DELETE FROM chat_feedback WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'aluno_ficha',
                `DELETE FROM aluno_ficha WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'sessao_treino',
                `DELETE FROM sessao_treino WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'progresso_semanal',
                `DELETE FROM progresso_semanal WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'streak',
                `DELETE FROM streak WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'desconto',
                `DELETE FROM desconto WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'pagamento',
                `DELETE FROM pagamento WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'assinatura',
                `DELETE FROM assinatura WHERE id_aluno = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'suporte',
                `DELETE FROM suporte WHERE id_aluno = ?`,
                [id]
            )

            await db.query(
                `DELETE FROM aluno WHERE id_aluno = ?`,
                [id]
            )
        }

        if (tipo === 'professor') {
            await executarSeTabelaExiste(
                'mensagem_feedback',
                `DELETE mf FROM mensagem_feedback mf
                 JOIN chat_feedback cf ON cf.id_chat = mf.id_chat
                 WHERE cf.id_professor = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'chat_feedback',
                `DELETE FROM chat_feedback WHERE id_professor = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'aluno_ficha',
                `DELETE af FROM aluno_ficha af
                 JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                 WHERE ft.id_professor = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'video',
                `DELETE FROM video WHERE id_professor = ?`,
                [id]
            )

            await executarSeTabelaExiste(
                'ficha_treino',
                `DELETE FROM ficha_treino WHERE id_professor = ?`,
                [id]
            )

            await db.query(
                `DELETE FROM professor WHERE id_professor = ?`,
                [id]
            )
        }

        await db.query('COMMIT')

        res.redirect('/moderador?sucesso=' + encodeURIComponent('Cadastro excluído definitivamente do banco.'))
    } catch (err) {
        await db.query('ROLLBACK')

        console.error('[moderador excluir]', err)

        res.redirect('/moderador?erro=' + encodeURIComponent('Erro ao excluir cadastro: ' + err.message))
    }
}

// =======================
// EXPORTAR CSV
// =======================

exports.exportar = async (req, res) => {
    try {
        const [alunos] = await db.query(
            `SELECT
                'Aluno' AS tipo,
                a.nome,
                a.email,
                COALESCE(p.nome, 'Free') AS plano,
                a.criado_em
             FROM aluno a
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             ORDER BY a.nome ASC`
        )

        const [professores] = await db.query(
            `SELECT
                'Professor' AS tipo,
                p.nome,
                p.email,
                COALESCE(p.cref, '') AS plano,
                NULL AS criado_em
             FROM professor p
             ORDER BY p.nome ASC`
        )

        const linhas = alunos.concat(professores)

        const cabecalho = 'tipo,nome,email,plano_ou_cref,criado_em\n'

        const corpo = linhas.map((item) => {
            return [
                item.tipo,
                item.nome,
                item.email,
                item.plano,
                item.criado_em || ''
            ].map((valor) => `"${String(valor || '').replace(/"/g, '""')}"`).join(',')
        }).join('\n')

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="usuarios-planob.csv"')
        res.send(cabecalho + corpo)
    } catch (err) {
        console.error('[moderador exportar]', err)

        res.redirect('/moderador?erro=' + encodeURIComponent('Erro ao exportar CSV.'))
    }
}
