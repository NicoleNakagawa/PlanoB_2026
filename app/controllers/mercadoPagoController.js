const crypto = require('crypto')
const db = require('../config/pool_conexoes')
const mp = require('../utils/mercadopago')
const { calcularCobranca, ativarPlano } = require('../utils/assinatura')
const { redirecionarPainelAluno } = require('../utils/redirecionamentos')

const PLANOS_PAGOS = [2, 3]
const VALIDADE_PEDIDO_MS = 2 * 60 * 60 * 1000

const METODOS = {
    credit_card: 'cartao_credito',
    debit_card: 'cartao_debito',
    bank_transfer: 'pix',
    account_money: 'cartao_credito',
    ticket: 'boleto'
}

function urlBase(req) {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '')

    return `${req.protocol}://${req.get('host')}`
}

function paraPlanos(res, mensagem) {
    return res.redirect('/planos?erro=' + encodeURIComponent(mensagem))
}

function paraCheckout(res, idPlano, mensagem) {
    return res.redirect(`/pagamento?plano=${idPlano}&erro=` + encodeURIComponent(mensagem))
}

// =======================
// INICIAR: cria o pedido no Mercado Pago e manda o aluno pagar lá
// =======================

exports.iniciar = async (req, res) => {
    const idAluno = req.session.aluno.id
    const idPlano = Number(req.body['id-plano'])

    if (!mp.habilitado()) {
        return paraPlanos(res, 'O pagamento pelo Mercado Pago não está configurado.')
    }

    if (!PLANOS_PAGOS.includes(idPlano)) {
        return paraPlanos(res, 'Plano inválido. Escolha um dos planos disponíveis.')
    }

    try {
        const cobranca = await calcularCobranca(idAluno, idPlano)

        if (!cobranca) return paraPlanos(res, 'Plano não encontrado.')

        const referencia = `planob-${idAluno}-${idPlano}-${crypto.randomBytes(8).toString('hex')}`

        const preferencia = await mp.criarPreferencia({
            titulo: `PlanoB - Plano ${cobranca.plano.nome}`,
            valor: cobranca.valorFinal,
            referencia,
            urlBase: urlBase(req)
        })

        // Guarda o que esperamos receber de volta; é isso que será conferido no retorno
        req.session.mpPendente = {
            referencia,
            idPlano,
            valor: cobranca.valorFinal,
            idDesconto: cobranca.idDesconto,
            criadoEm: Date.now()
        }

        req.session.save(() => res.redirect(preferencia.endereco))
    } catch (err) {
        console.error('[mercadopago iniciar]', err.message)

        paraCheckout(res, idPlano, 'Não foi possível abrir o Mercado Pago agora. Tente novamente.')
    }
}

// =======================
// RETORNO: o aluno voltou do Mercado Pago
// =======================

exports.retorno = async (req, res) => {
    const aluno = req.session.aluno
    const pendente = req.session.mpPendente
    const status = String(req.query.status || req.query.collection_status || '')
    const idPagamentoMp = String(req.query.payment_id || req.query.collection_id || '')
    const referencia = String(req.query.external_reference || '')

    if (!pendente || Date.now() - pendente.criadoEm > VALIDADE_PEDIDO_MS) {
        delete req.session.mpPendente
        return paraPlanos(res, 'Nenhum pagamento em andamento. Escolha um plano para começar.')
    }

    if (referencia && referencia !== pendente.referencia) {
        return paraPlanos(res, 'Pagamento não reconhecido.')
    }

    if (status === 'failure' || status === 'rejected' || status === 'null' || !idPagamentoMp || idPagamentoMp === 'null') {
        return paraCheckout(res, pendente.idPlano, 'O pagamento não foi concluído. Nada foi cobrado. Você pode tentar de novo.')
    }

    if (status === 'pending' || status === 'in_process') {
        return paraCheckout(res, pendente.idPlano, 'Seu pagamento está pendente. Assim que for aprovado, tente abrir o painel de novo ou fale com o suporte.')
    }

    try {
        // Nunca confiamos só no endereço de retorno: confirmamos na API do Mercado Pago
        const pagamento = await mp.buscarPagamento(idPagamentoMp)

        const valorConfere = Math.abs(Number(pagamento.transaction_amount) - Number(pendente.valor)) < 0.01

        if (
            pagamento.status !== 'approved' ||
            pagamento.external_reference !== pendente.referencia ||
            pagamento.currency_id !== 'BRL' ||
            !valorConfere
        ) {
            return paraCheckout(res, pendente.idPlano, 'O pagamento não foi aprovado. Nada foi cobrado.')
        }

        const [jaUsado] = await db.query(
            'SELECT id_pagamento FROM pagamento WHERE token_gateway = ? LIMIT 1',
            [String(pagamento.id)]
        )

        if (jaUsado.length === 0) {
            const cartao = pagamento.card || {}
            const titular = (cartao.cardholder && cartao.cardholder.name) || aluno.nome || 'Aluno PlanoB'

            await ativarPlano({
                idAluno: aluno.id,
                idPlano: pendente.idPlano,
                valorFinal: Number(pendente.valor),
                idDesconto: pendente.idDesconto,
                metodo: METODOS[pagamento.payment_type_id] || 'cartao_credito',
                nomeTitular: String(titular).slice(0, 100),
                ultimos4: cartao.last_four_digits || null,
                bandeira: pagamento.payment_method_id ? String(pagamento.payment_method_id).slice(0, 20) : null,
                tokenGateway: String(pagamento.id).slice(0, 255)
            })
        }

        aluno.id_plano = pendente.idPlano
        delete req.session.mpPendente

        req.session.save(() => res.redirect(redirecionarPainelAluno(pendente.idPlano)))
    } catch (err) {
        console.error('[mercadopago retorno]', err.message)

        paraCheckout(res, pendente.idPlano, 'Não conseguimos confirmar o pagamento agora. Se foi cobrado, fale com o suporte informando o número ' + idPagamentoMp + '.')
    }
}
