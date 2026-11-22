const crypto = require('crypto')
const bcrypt = require('bcrypt')
const db = require('../config/pool_conexoes')
const { enviarEmail } = require('../utils/email')

const SALT_ROUNDS = 12
const VALIDADE_TOKEN_MIN = 60

// Tabelas onde a conta pode estar, na mesma ordem do login
const TIPOS = [
    { tipo: 'aluno', tabela: 'aluno', id: 'id_aluno' },
    { tipo: 'professor', tabela: 'professor', id: 'id_professor' },
    { tipo: 'moderador', tabela: 'moderador', id: 'id_moderador' }
]

const MENSAGEM_ENVIO = 'Se esse e-mail estiver cadastrado, enviamos um link para criar uma nova senha. O link vale por 1 hora.'

// =======================
// LIMITE DE PEDIDOS (evita spam de e-mails)
// =======================
// Fica na memória: simples e suficiente para um servidor só.

const pedidos = new Map()
const MAX_PEDIDOS = 5
const JANELA_MS = 60 * 60 * 1000

function passouDoLimite(chave) {
    const agora = Date.now()
    const recentes = (pedidos.get(chave) || []).filter(hora => agora - hora < JANELA_MS)

    if (recentes.length >= MAX_PEDIDOS) {
        pedidos.set(chave, recentes)
        return true
    }

    recentes.push(agora)
    pedidos.set(chave, recentes)
    return false
}

setInterval(() => {
    const agora = Date.now()

    for (const [chave, horas] of pedidos) {
        if (horas.every(hora => agora - hora >= JANELA_MS)) pedidos.delete(chave)
    }
}, JANELA_MS).unref()

// =======================
// FUNÇÕES AUXILIARES
// =======================

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

function validarForcaSenha(senha) {
    // Mesmas regras do cadastro (validacoes.js)
    if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
    if (!/[A-Z]/.test(senha)) return 'Inclua pelo menos uma letra maiúscula.'
    if (!/[a-z]/.test(senha)) return 'Inclua pelo menos uma letra minúscula.'
    if (!/[0-9]/.test(senha)) return 'Inclua pelo menos um número.'
    return null
}

function urlBase(req) {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '')

    return `${req.protocol}://${req.get('host')}`
}

async function buscarConta(email) {
    for (const item of TIPOS) {
        const extra = item.tipo === 'moderador' ? ' AND ativo = 1' : ''

        const [rows] = await db.query(
            `SELECT ${item.id} AS id_usuario, nome FROM ${item.tabela} WHERE email = ?${extra} LIMIT 1`,
            [email]
        )

        if (rows.length > 0) {
            return { tipo: item.tipo, id: rows[0].id_usuario, nome: rows[0].nome }
        }
    }

    return null
}

async function buscarTokenValido(token) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) return null

    const [rows] = await db.query(
        `SELECT id_redefinicao, tipo_usuario, id_usuario
         FROM redefinicao_senha
         WHERE token_hash = ? AND usado_em IS NULL AND expira_em > NOW()
         LIMIT 1`,
        [hashToken(token)]
    )

    return rows[0] || null
}

// =======================
// TELA "ESQUECI A SENHA"
// =======================

exports.exibirEsqueci = (req, res) => {
    res.render('esqueci-senha', { sucesso: null, erro: null })
}

exports.enviarEsqueci = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
        return res.render('esqueci-senha', { sucesso: null, erro: 'Informe um e-mail válido.' })
    }

    if (passouDoLimite('ip:' + req.ip) || passouDoLimite('email:' + email)) {
        return res.render('esqueci-senha', {
            sucesso: null,
            erro: 'Muitos pedidos seguidos. Aguarde um pouco e tente de novo.'
        })
    }

    try {
        const conta = await buscarConta(email)

        if (conta) {
            const token = crypto.randomBytes(32).toString('hex')

            // Só o hash vai para o banco; o token de verdade só existe no link do e-mail
            await db.query(
                'DELETE FROM redefinicao_senha WHERE tipo_usuario = ? AND id_usuario = ?',
                [conta.tipo, conta.id]
            )

            await db.query(
                `INSERT INTO redefinicao_senha (tipo_usuario, id_usuario, token_hash, expira_em)
                 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
                [conta.tipo, conta.id, hashToken(token), VALIDADE_TOKEN_MIN]
            )

            const link = `${urlBase(req)}/redefinir-senha?token=${token}`
            const primeiroNome = String(conta.nome || '').split(' ')[0] || 'tudo bem'

            const texto = [
                `Olá, ${primeiroNome}!`,
                '',
                'Recebemos um pedido para criar uma nova senha no PlanoB.',
                'Use o link abaixo (vale por 1 hora):',
                '',
                link,
                '',
                'Se não foi você, ignore este e-mail: sua senha continua a mesma.'
            ].join('\n')

            try {
                await enviarEmail({
                    para: email,
                    assunto: 'PlanoB - Redefinição de senha',
                    texto
                })
            } catch (err) {
                // Não revela ao visitante se o envio falhou, para não expor quais e-mails existem
                console.error('[esqueci-senha] falha ao enviar e-mail:', err.message)
            }
        }

        // Mesma resposta exista a conta ou não
        return res.render('esqueci-senha', { sucesso: MENSAGEM_ENVIO, erro: null })
    } catch (err) {
        console.error('[esqueci-senha]', err)

        return res.render('esqueci-senha', {
            sucesso: null,
            erro: 'Erro interno. Tente novamente em instantes.'
        })
    }
}

// =======================
// TELA "NOVA SENHA"
// =======================

exports.exibirRedefinir = async (req, res) => {
    const token = String(req.query.token || '')

    try {
        const registro = await buscarTokenValido(token)

        res.render('redefinir-senha', {
            token: registro ? token : '',
            tokenInvalido: !registro,
            erro: null
        })
    } catch (err) {
        console.error('[redefinir-senha GET]', err)

        res.render('redefinir-senha', {
            token: '',
            tokenInvalido: true,
            erro: null
        })
    }
}

exports.processarRedefinir = async (req, res) => {
    const token = String(req.body.token || '')
    const senha = String(req.body.password || '')
    const confirmacao = String(req.body['confirm-password'] || '')

    function mostrarErro(mensagem) {
        return res.render('redefinir-senha', { token, tokenInvalido: false, erro: mensagem })
    }

    try {
        const registro = await buscarTokenValido(token)

        if (!registro) {
            return res.render('redefinir-senha', { token: '', tokenInvalido: true, erro: null })
        }

        const erroSenha = validarForcaSenha(senha)
        if (erroSenha) return mostrarErro(erroSenha)

        if (senha !== confirmacao) return mostrarErro('As senhas não coincidem.')

        const item = TIPOS.find(t => t.tipo === registro.tipo_usuario)
        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS)

        const conexao = await db.getConnection()

        try {
            await conexao.beginTransaction()

            // O "usado_em IS NULL" garante que dois cliques não usem o mesmo link duas vezes
            const [marcado] = await conexao.query(
                'UPDATE redefinicao_senha SET usado_em = NOW() WHERE id_redefinicao = ? AND usado_em IS NULL',
                [registro.id_redefinicao]
            )

            if (marcado.affectedRows !== 1) {
                await conexao.rollback()
                return res.render('redefinir-senha', { token: '', tokenInvalido: true, erro: null })
            }

            await conexao.query(
                `UPDATE ${item.tabela} SET senha_hash = ? WHERE ${item.id} = ?`,
                [senhaHash, registro.id_usuario]
            )

            await conexao.query(
                'DELETE FROM redefinicao_senha WHERE tipo_usuario = ? AND id_usuario = ?',
                [registro.tipo_usuario, registro.id_usuario]
            )

            await conexao.commit()
        } catch (err) {
            await conexao.rollback()
            throw err
        } finally {
            conexao.release()
        }

        res.redirect('/login?sucesso=senha-redefinida')
    } catch (err) {
        console.error('[redefinir-senha POST]', err)

        mostrarErro('Erro interno. Tente novamente em instantes.')
    }
}
