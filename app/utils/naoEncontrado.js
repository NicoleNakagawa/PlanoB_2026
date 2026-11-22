// Página 404 única do site (usada pelo router e pelos controllers).

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caractere]))
}

function naoEncontrado(req, res, mensagem) {
    const detalhe = mensagem
        ? escapar(mensagem)
        : `A página <strong>${escapar(req.originalUrl)}</strong> não existe.`

    res.status(404).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlanoB - Página não encontrada</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <style>
        body {
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f7f5ff;
            color: #232c51;
            gap: 16px;
            margin: 0;
            padding: 0 24px;
            text-align: center;
        }

        h1 {
            font-size: 4rem;
            margin: 0;
        }

        p {
            margin: 0;
            max-width: 32rem;
            overflow-wrap: anywhere;
        }

        a {
            background: #0058ba;
            color: #fff;
            padding: 12px 28px;
            border-radius: 999px;
            font-weight: 700;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <main>
        <h1>404</h1>
        <p>${detalhe}</p>
    </main>
    <a href="/home">Voltar para Home</a>
</body>
</html>`)
}

module.exports = naoEncontrado
