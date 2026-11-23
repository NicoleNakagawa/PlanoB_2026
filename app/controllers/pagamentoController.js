const db = require('../config/pool_conexoes')
const { calcularCobranca, ativarPlano } = require('../utils/assinatura')
const { redirecionarPainelAluno } = require('../utils/redirecionamentos')
const mp = require('../utils/mercadopago')

// =======================
// VALIDADORES INTERNOS
// =======================

function cpfValido(cpf) {
    if (!cpf || cpf.length !== 11) return false
    if (/^(\d)\1+$/.test(cpf)) return false

    let soma = 0

    for (let i = 0; i < 9; i++) {
        soma += Number(cpf.charAt(i)) * (10 - i)
    }

    let resto = (soma * 10) % 11

    if (resto === 10 || resto === 11) resto = 0
    if (resto !== Number(cpf.charAt(9))) return false

    soma = 0

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf.charAt(i)) * (11 - i)
    }

    resto = (soma * 10) % 11

    if (resto === 10 || resto === 11) resto = 0

    return resto === Number(cpf.charAt(10))
}

function validadeValida(valor) {
    if (!/^\d{2}\/\d{2}$/.test(valor)) return false

    const partes = valor.split('/')
    const mes = Number(partes[0])
    const ano = Number('20' + partes[1])

    if (!mes || !ano) return false
    if (mes < 1 || mes > 12) return false

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth() + 1

    if (ano < anoAtual) return false
    if (ano === anoAtual && mes < mesAtual) return false

    return true
}

// =======================
// PLANOS COBRÁVEIS
// =======================
// Só Lazuli (2) e Diamante (3) passam pelo checkout.
// O plano gratuito (1) não tem pagamento, e qualquer outro valor é inválido.

const PLANOS_PAGOS = [2, 3]

function planoPadrao(idPlano) {
    return idPlano === 3
        ? { id_plano: 3, nome: 'Diamante', valor_mensal: 149.00 }
        : { id_plano: 2, nome: 'Lazuli', valor_mensal: 59.00 }
}

function voltarParaPlanos(res, mensagem) {
    return res.redirect('/planos?erro=' + encodeURIComponent(mensagem))
}

// Sem ?plano= o checkout abre no Lazuli. Com ?plano= só aceita número inteiro.
function lerIdPlano(valor) {
    if (valor === undefined) return 2
    if (typeof valor !== 'string' || !/^\d+$/.test(valor.trim())) return NaN

    return Number(valor)
}

// =======================
// EXIBIR TELA DE PAGAMENTO
// =======================

exports.exibir = async (req, res) => {
    res.locals.mercadoPagoAtivo = mp.habilitado()
    res.locals.modoDemonstracao = mp.modoDemonstracao()
    const idPlano = lerIdPlano(req.query.plano)

    if (idPlano === 1) {
        return voltarParaPlanos(res, 'O Plano Comum é gratuito e não precisa de pagamento.')
    }

    if (!PLANOS_PAGOS.includes(idPlano)) {
        return voltarParaPlanos(res, 'Plano inválido. Escolha um dos planos disponíveis.')
    }

    try {
        const [rows] = await db.query(
            'SELECT id_plano, nome, valor_mensal, descricao FROM plano WHERE id_plano = ?',
            [idPlano]
        )

        if (rows.length === 0) {
            return voltarParaPlanos(res, 'Plano não encontrado. Escolha um dos planos disponíveis.')
        }

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: rows[0],
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[pagamento GET]', err)

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: planoPadrao(idPlano),
            erro: 'Não foi possível carregar o plano. Tente novamente.'
        })
    }
}

// =======================
// PROCESSAR PAGAMENTO
// =======================

exports.processar = async (req, res) => {
    res.locals.mercadoPagoAtivo = mp.habilitado()
    res.locals.modoDemonstracao = mp.modoDemonstracao()
    const idAluno = req.session.aluno.id
    const idPlano = lerIdPlano(String(req.body['id-plano'] === undefined ? '' : req.body['id-plano']))

    // Plano ausente ou inválido não vira Lazuli em silêncio: volta para a escolha de planos
    if (!PLANOS_PAGOS.includes(idPlano)) {
        return voltarParaPlanos(res, 'Plano inválido. Escolha um dos planos disponíveis.')
    }

    const nomeTitular = req.body['card-name'] || ''
    const numeroRaw = req.body['card-number'] || ''
    const cpfTitular = req.body['card-cpf'] || ''
    const validade = req.body['card-expiry'] || ''
    const cvvRaw = req.body['card-cvv'] || ''

    const numeroLimpo = numeroRaw.replace(/\D/g, '')
    const cpfLimpo = cpfTitular.replace(/\D/g, '')
    const cvvLimpo = cvvRaw.replace(/\D/g, '')
    const ultimos4 = numeroLimpo.slice(-4)

    async function renderizarErroPagamento(mensagem) {
        try {
            const [rows] = await db.query(
                'SELECT id_plano, nome, valor_mensal, descricao FROM plano WHERE id_plano = ?',
                [idPlano]
            )

            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: rows[0] || planoPadrao(idPlano),
                erro: mensagem
            })
        } catch (err) {
            console.error('[pagamento erro render]', err)

            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: planoPadrao(idPlano),
                erro: mensagem
            })
        }
    }

    if (!nomeTitular.trim() || nomeTitular.trim().length < 5 || !nomeTitular.trim().includes(' ')) {
        return renderizarErroPagamento('Informe o nome completo do titular do cartão.')
    }

    if (!cpfValido(cpfLimpo)) {
        return renderizarErroPagamento('CPF inválido.')
    }

    if (numeroLimpo.length < 13 || numeroLimpo.length > 16) {
        return renderizarErroPagamento('Número do cartão inválido.')
    }

    if (!validadeValida(validade)) {
        return renderizarErroPagamento('Validade do cartão inválida ou vencida.')
    }

    if (cvvLimpo.length < 3 || cvvLimpo.length > 4) {
        return renderizarErroPagamento('CVV inválido.')
    }

    const primeiroDigito = numeroLimpo[0]

    const bandeira = primeiroDigito === '4'
        ? 'visa'
        : primeiroDigito === '5'
            ? 'mastercard'
            : 'outro'

    try {
        const cobranca = await calcularCobranca(idAluno, idPlano)

        if (!cobranca) {
            return renderizarErroPagamento('Plano inválido.')
        }

        await ativarPlano({
            idAluno,
            idPlano,
            valorFinal: cobranca.valorFinal,
            idDesconto: cobranca.idDesconto,
            metodo: 'cartao_credito',
            nomeTitular: nomeTitular.trim(),
            ultimos4,
            bandeira,
            cpf: cpfLimpo
        })

        req.session.aluno.id_plano = idPlano

        res.redirect(redirecionarPainelAluno(idPlano))
    } catch (err) {
        console.error('[pagamento]', err)

        return renderizarErroPagamento('Erro ao processar pagamento.')
    }
}
