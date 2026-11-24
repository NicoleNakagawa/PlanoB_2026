// =====================================================================
// Envio de e-mail (usado na recuperação de senha)
//
// Configure no .env para enviar de verdade:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_SECURE=false        (true só para porta 465)
//   SMTP_USER=seu-email@gmail.com
//   SMTP_PASS=senha-de-app
//   SMTP_FROM="PlanoB <seu-email@gmail.com>"
//
// Sem SMTP_HOST configurado, o e-mail NÃO é enviado: o conteúdo (com o link)
// aparece no terminal do servidor. Assim dá para testar em desenvolvimento.
// =====================================================================

let transporte = null
let tentouCriar = false

function obterTransporte() {
    if (tentouCriar) return transporte
    tentouCriar = true

    if (!process.env.SMTP_HOST) return null

    try {
        const nodemailer = require('nodemailer')

        transporte = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined
        })
    } catch (err) {
        console.error('[email] nodemailer não está instalado. Rode: npm install', err.message)
        transporte = null
    }

    return transporte
}

async function enviarEmail({ para, assunto, texto, html }) {
    const envio = obterTransporte()

    if (!envio) {
        console.log('\n[email - SMTP não configurado, mensagem não enviada]')
        console.log('Para:', para)
        console.log('Assunto:', assunto)
        console.log(texto)
        console.log('')
        return false
    }

    const info = await envio.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: para,
        subject: assunto,
        text: texto,
        html
    })

    console.log('[email] enviado para', para, '| aceito:', JSON.stringify(info.accepted), '| rejeitado:', JSON.stringify(info.rejected), '| resposta:', info.response)

    return true
}

module.exports = { enviarEmail }
