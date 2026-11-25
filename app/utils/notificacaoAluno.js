const db = require('../config/pool_conexoes')

// Notificações do aluno (sino do cabeçalho).
// Hoje existe um tipo: "treino" — o professor montou ou atualizou o treino do aluno.

async function criarNotificacaoTreino(idAluno, { idFicha, nomeFicha, professorNome, totalExercicios }) {
    // Se o professor salvar o treino de novo e o aluno ainda não viu, troca a notificação
    // antiga pela nova em vez de empilhar várias iguais.
    await db.query(
        `DELETE FROM notificacao_aluno
         WHERE id_aluno = ? AND tipo = 'treino' AND id_ficha = ? AND lida = 0`,
        [idAluno, idFicha]
    )

    const titulo = `Novo treino do Prof. ${professorNome || 'seu professor'}`.slice(0, 120)
    const mensagem = `${nomeFicha} · ${totalExercicios} exercício(s). Toque para fazer o treino do dia.`.slice(0, 255)

    await db.query(
        `INSERT INTO notificacao_aluno (id_aluno, tipo, id_ficha, titulo, mensagem, link)
         VALUES (?, 'treino', ?, ?, ?, ?)`,
        [idAluno, idFicha, titulo, mensagem, `/execucaoexercicios?treino=${idFicha}`]
    )
}

async function listarNotificacoes(idAluno, limite = 15) {
    const [itens] = await db.query(
        `SELECT id_notificacao AS id, tipo, titulo, mensagem, link, lida, criada_em
         FROM notificacao_aluno
         WHERE id_aluno = ?
         ORDER BY criada_em DESC, id_notificacao DESC
         LIMIT ?`,
        [idAluno, limite]
    )

    const [contagem] = await db.query(
        `SELECT COUNT(*) AS total FROM notificacao_aluno WHERE id_aluno = ? AND lida = 0`,
        [idAluno]
    )

    return { itens, naoLidas: Number(contagem[0].total) || 0 }
}

async function marcarLida(idAluno, idNotificacao) {
    await db.query(
        `UPDATE notificacao_aluno SET lida = 1 WHERE id_aluno = ? AND id_notificacao = ?`,
        [idAluno, idNotificacao]
    )
}

async function marcarTodasLidas(idAluno) {
    await db.query(`UPDATE notificacao_aluno SET lida = 1 WHERE id_aluno = ? AND lida = 0`, [idAluno])
}

// Quando o aluno abre o treino, a notificação dele some do sino
async function marcarTreinoLido(idAluno, idFicha) {
    await db.query(
        `UPDATE notificacao_aluno SET lida = 1
         WHERE id_aluno = ? AND tipo = 'treino' AND id_ficha = ? AND lida = 0`,
        [idAluno, idFicha]
    )
}

module.exports = { criarNotificacaoTreino, listarNotificacoes, marcarLida, marcarTodasLidas, marcarTreinoLido }
