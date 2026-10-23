const db = require('../config/pool_conexoes')

// =======================
// FORMATADORES (usados nas telas como "fmt")
// =======================

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function moeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numero(valor) {
    return Number(valor || 0).toLocaleString('pt-BR')
}

function dataCurta(valor) {
    if (!valor) return 'Sem registro'

    const d = new Date(valor)
    if (isNaN(d.getTime())) return 'Sem registro'

    return d.toLocaleDateString('pt-BR')
}

function dataHora(valor) {
    if (!valor) return 'Sem registro'

    const d = new Date(valor)
    if (isNaN(d.getTime())) return 'Sem registro'

    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function tempoRelativo(valor) {
    if (!valor) return 'sem registro'

    const d = new Date(valor)
    if (isNaN(d.getTime())) return 'sem registro'

    const minutos = Math.floor((Date.now() - d.getTime()) / 60000)

    if (minutos < 1) return 'agora'
    if (minutos < 60) return 'há ' + minutos + ' min'

    const horas = Math.floor(minutos / 60)
    if (horas < 24) return 'há ' + horas + ' h'

    const dias = Math.floor(horas / 24)
    if (dias === 1) return 'ontem'
    if (dias < 30) return 'há ' + dias + ' dias'

    return dataCurta(valor)
}

// Mostra só o miolo do CPF (LGPD): ***.456.789-**
function mascararCpf(cpf) {
    const digitos = String(cpf || '').replace(/\D/g, '')

    if (digitos.length !== 11) return 'Não informado'

    return '***.' + digitos.slice(3, 6) + '.' + digitos.slice(6, 9) + '-**'
}

function iniciais(nome) {
    const partes = String(nome || '?').trim().split(/\s+/).filter(Boolean)

    if (partes.length === 0) return '?'
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()

    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// Monta "?busca=ana&pagina=2" ignorando valores vazios
function qs(params) {
    const consulta = new URLSearchParams()

    Object.entries(params || {}).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && valor !== '') {
            consulta.set(chave, valor)
        }
    })

    const texto = consulta.toString()
    return texto ? '?' + texto : ''
}

// Cores dos selos de plano e de status (classes do Tailwind usadas nas telas)
function classePlano(nome) {
    if (nome === 'Diamante') return 'bg-tertiary-fixed text-on-tertiary-fixed'
    if (nome === 'Lazuli') return 'bg-primary text-white'
    if (nome === 'Professor') return 'bg-secondary text-white'
    return 'bg-surface-container-highest text-on-surface-variant'
}

const ROTULOS_STATUS = {
    aprovado: 'Aprovado', recusado: 'Recusado', pendente: 'Pendente', estornado: 'Estornado',
    ativa: 'Ativa', cancelada: 'Cancelada', expirada: 'Expirada',
    aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido', fechado: 'Fechado',
    ativo: 'Ativo', oculto: 'Oculto'
}

function rotuloStatus(status) {
    return ROTULOS_STATUS[status] || String(status || '')
}

function classeStatus(status) {
    if (['aprovado', 'ativa', 'resolvido', 'ativo'].includes(status)) return 'bg-green-100 text-green-800'
    if (['pendente', 'aberto', 'em_atendimento'].includes(status)) return 'bg-amber-100 text-amber-800'
    if (['recusado', 'cancelada', 'oculto'].includes(status)) return 'bg-red-100 text-red-800'
    if (status === 'estornado') return 'bg-purple-100 text-purple-800'
    return 'bg-surface-container-highest text-on-surface-variant'
}

const fmt = {
    moeda, numero, dataCurta, dataHora, tempoRelativo, mascararCpf, iniciais, qs,
    classePlano, classeStatus, rotuloStatus
}

// =======================
// PAGINAÇÃO E SÉRIES
// =======================

function paginar(total, pagina, porPagina = 20) {
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
    const atual = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas)
    const offset = (atual - 1) * porPagina

    return {
        total,
        pagina: atual,
        totalPaginas,
        porPagina,
        offset,
        de: total ? offset + 1 : 0,
        ate: Math.min(total, offset + porPagina)
    }
}

// Lista dos últimos N meses (do mais antigo para o atual): { chave: '2026-10', rotulo: 'out/26' }
function ultimosMeses(quantidade = 6) {
    const hoje = new Date()
    const lista = []

    for (let i = quantidade - 1; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)

        lista.push({
            chave: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
            rotulo: MESES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2)
        })
    }

    return lista
}

// Cruza os meses com o resultado do banco ({ mes: '2026-10', total: 100 }) e calcula a altura da barra
function serieMensal(meses, linhas, campo = 'total') {
    const mapa = new Map(linhas.map(linha => [linha.mes, Number(linha[campo]) || 0]))
    const valores = meses.map(m => mapa.get(m.chave) || 0)
    const maximo = Math.max(...valores, 0)

    return meses.map((m, i) => ({
        ...m,
        valor: valores[i],
        pct: valores[i] ? Math.max(4, Math.round((valores[i] / maximo) * 100)) : 0
    }))
}

function variacaoPct(atual, anterior) {
    const a = Number(atual) || 0
    const b = Number(anterior) || 0

    if (!b) return a ? 100 : 0

    return Math.round(((a - b) / b) * 100)
}

// =======================
// PERMISSÕES
// =======================

// Só moderador "admin" (ou "master") pode excluir cadastros e mudar planos.
// Os demais enxergam tudo, mas não alteram dados sensíveis.
function ehAdmin(moderador) {
    const nivel = String((moderador && moderador.nivel) || '').trim().toLowerCase()
    return ['admin', 'master', 'moderador master'].includes(nivel)
}

// Aceita só caminhos internos do painel (evita redirecionar para sites de fora)
function destinoSeguro(valor, padrao) {
    const texto = String(valor || '')

    if (texto.startsWith('/moderador') && !texto.startsWith('//') && !texto.includes('\\')) {
        return texto
    }

    return padrao
}

// =======================
// BANCO: HELPERS
// =======================

const tabelasConhecidas = new Set()

async function tabelaExiste(nomeTabela, conexao = db) {
    if (tabelasConhecidas.has(nomeTabela)) return true

    const [linhas] = await conexao.query('SHOW TABLES LIKE ?', [nomeTabela])

    if (linhas.length > 0) {
        tabelasConhecidas.add(nomeTabela)
        return true
    }

    return false
}

// Registra a ação do moderador. Se a tabela moderacao_log ainda não existe,
// simplesmente não registra (o painel continua funcionando).
async function registrarLog(moderador, acao, alvoTipo, alvoId, detalhe) {
    try {
        if (!(await tabelaExiste('moderacao_log'))) return

        await db.query(
            `INSERT INTO moderacao_log (id_moderador, moderador_nome, acao, alvo_tipo, alvo_id, detalhe)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                (moderador && moderador.id) || null,
                (moderador && moderador.nome) || 'Moderador',
                acao,
                alvoTipo || null,
                alvoId || null,
                detalhe ? String(detalhe).slice(0, 255) : null
            ]
        )
    } catch (err) {
        console.error('[moderacao log]', err.message)
    }
}

// =======================
// RENDER PADRÃO DO PAINEL
// =======================

// Todas as telas do moderador recebem os mesmos dados básicos (menu, permissões,
// contador de suporte, formatadores e mensagens de sucesso/erro da URL).
async function renderizarModerador(req, res, view, dados = {}, menuAtivo = '') {
    let suporteAberto = 0

    try {
        if (await tabelaExiste('suporte')) {
            const [[linha]] = await db.query(
                `SELECT COUNT(*) AS total FROM suporte WHERE status IN ('aberto', 'em_atendimento')`
            )
            suporteAberto = linha.total
        }
    } catch (err) {
        console.error('[moderador contador suporte]', err.message)
    }

    res.render(view, {
        moderador: req.session.moderador,
        podeGerenciar: ehAdmin(req.session.moderador),
        menuAtivo,
        suporteAberto,
        fmt,
        sucesso: req.query.sucesso || null,
        erro: req.query.erro || null,
        ...dados
    })
}

module.exports = {
    fmt,
    paginar,
    ultimosMeses,
    serieMensal,
    variacaoPct,
    ehAdmin,
    destinoSeguro,
    tabelaExiste,
    registrarLog,
    renderizarModerador
}
