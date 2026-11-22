// =====================================================================
// Mensagens de sucesso/erro fora da URL
//
// Vários controllers redirecionam com a mensagem na URL, por exemplo:
//   /perfilaluno?sucesso=Dados%20salvos
// Isso faz a mensagem reaparecer ao recarregar a página e vazar quando
// alguém compartilha o link.
//
// Este middleware intercepta esses redirecionamentos:
//   1. vê ?sucesso= / ?erro= / ?erroPerfil= na URL, guarda a mensagem
//      na sessão e redireciona para a mesma URL sem esses parâmetros;
//   2. na requisição seguinte, devolve a mensagem em req.query uma única
//      vez, então os controllers continuam funcionando sem mudança.
// =====================================================================

const CHAVES = ['sucesso', 'erro', 'erroPerfil']
const VALIDADE_MS = 2 * 60 * 1000

function pedidoDePagina(req) {
    const destino = req.headers['sec-fetch-dest']
    if (destino && destino !== 'document') return false

    return Boolean(req.headers.accept && req.headers.accept.includes('text/html'))
}

function substituirQuery(req, novaQuery) {
    Object.defineProperty(req, 'query', {
        value: novaQuery,
        writable: true,
        configurable: true,
        enumerable: true
    })
}

module.exports = function mensagens(req, res, next) {
    if (req.method !== 'GET' || !req.session) return next()

    const caminho = req.originalUrl.split('?')[0]
    const caminhoSeguro = caminho.startsWith('/') && !caminho.startsWith('//') && !caminho.includes('\\')

    // 1) Mensagem veio na URL: guarda e limpa o endereço
    const chavesNaUrl = CHAVES.filter(chave => typeof req.query[chave] === 'string' && req.query[chave] !== '')

    if (chavesNaUrl.length > 0 && caminhoSeguro && pedidoDePagina(req)) {
        const flash = { criadoEm: Date.now() }

        chavesNaUrl.forEach(chave => {
            flash[chave] = req.query[chave]
        })

        const restante = new URLSearchParams(req.originalUrl.split('?')[1] || '')
        CHAVES.forEach(chave => restante.delete(chave))

        const texto = restante.toString()
        req.session.flash = flash

        return req.session.save(() => {
            res.redirect(caminho + (texto ? '?' + texto : ''))
        })
    }

    // 2) Há mensagem guardada: entrega uma vez, só para páginas
    if (req.session.flash && pedidoDePagina(req)) {
        const flash = req.session.flash
        delete req.session.flash

        if (Date.now() - flash.criadoEm <= VALIDADE_MS) {
            const query = { ...req.query }

            CHAVES.forEach(chave => {
                if (flash[chave] !== undefined) query[chave] = flash[chave]
            })

            substituirQuery(req, query)
        }
    }

    next()
}
