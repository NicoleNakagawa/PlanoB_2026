// =====================================================================
// Mercado Pago - Checkout Pro (modo demonstração)
//
// Como funciona: o servidor cria uma "preferência" de pagamento, o aluno
// paga na página do Mercado Pago e volta para /pagamento/retorno, onde o
// servidor CONFIRMA o pagamento direto na API antes de trocar o plano.
//
// Para a apresentação use as credenciais de TESTE (conta de vendedor de
// teste). Assim nada é cobrado de verdade. Veja o README.
//
//   MP_ACCESS_TOKEN=...   (access token da conta de teste)
//   APP_URL=https://seu-site   (endereço público; o MP volta para ele)
// =====================================================================

const BASE_API = (process.env.MP_API_BASE || 'https://api.mercadopago.com').replace(/\/+$/, '')

function habilitado() {
    return Boolean(process.env.MP_ACCESS_TOKEN)
}

function modoDemonstracao() {
    return process.env.MODO_DEMONSTRACAO !== 'false'
}

async function chamar(caminho, opcoes = {}) {
    const resposta = await fetch(BASE_API + caminho, {
        ...opcoes,
        headers: {
            Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN,
            'Content-Type': 'application/json',
            ...(opcoes.headers || {})
        },
        signal: AbortSignal.timeout(15000)
    })

    const texto = await resposta.text()
    let corpo = null

    try {
        corpo = texto ? JSON.parse(texto) : null
    } catch (err) {
        corpo = null
    }

    if (!resposta.ok) {
        const detalhe = corpo && (corpo.message || corpo.error) ? (corpo.message || corpo.error) : texto.slice(0, 200)
        const erro = new Error(`Mercado Pago respondeu ${resposta.status}: ${detalhe}`)
        erro.status = resposta.status
        throw erro
    }

    return corpo
}

// Cria a preferência e devolve o endereço para onde o aluno deve ser enviado.
async function criarPreferencia({ titulo, valor, referencia, urlBase }) {
    const retorno = `${urlBase}/pagamento/retorno`

    const corpo = {
        items: [{
            id: referencia,
            title: titulo,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(valor)
        }],
        external_reference: referencia,
        back_urls: { success: retorno, failure: retorno, pending: retorno },
        statement_descriptor: 'PLANOB',
        // aprovado ou recusado na hora (sem "pendente"), melhor para demonstrar
        binary_mode: true
    }

    // O Mercado Pago só aceita voltar automaticamente para endereços https públicos
    if (urlBase.startsWith('https://')) corpo.auto_return = 'approved'

    const preferencia = await chamar('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(corpo)
    })

    const usarSandbox = process.env.MP_USAR_SANDBOX === 'true'
    const endereco = usarSandbox && preferencia.sandbox_init_point ? preferencia.sandbox_init_point : preferencia.init_point

    if (!endereco) throw new Error('Mercado Pago não devolveu o endereço de pagamento.')

    return { id: preferencia.id, endereco }
}

async function buscarPagamento(idPagamento) {
    return chamar('/v1/payments/' + encodeURIComponent(idPagamento))
}

module.exports = { habilitado, modoDemonstracao, criarPreferencia, buscarPagamento }
