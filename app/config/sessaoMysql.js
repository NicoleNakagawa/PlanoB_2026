// =====================================================================
// Armazenamento de sessões no MySQL
//
// Por padrão o express-session guarda as sessões na memória do servidor.
// Em hospedagem que "dorme" e acorda (como o plano gratuito do Render),
// a memória é apagada e todo mundo perde o login. Guardando no banco,
// a sessão sobrevive a reinícios e deploys.
//
// A tabela `sessoes` é criada sozinha na primeira execução.
// =====================================================================

const session = require('express-session')

const UM_DIA_MS = 24 * 60 * 60 * 1000

class SessaoMysql extends session.Store {
    constructor(db, opcoes = {}) {
        super()

        this.db = db
        this.tabela = opcoes.tabela || 'sessoes'
        this.pronta = this.criarTabela()

        // Limpa sessões vencidas a cada 15 minutos
        const intervalo = opcoes.limpezaMs || 15 * 60 * 1000
        this.timer = setInterval(() => this.limparVencidas(), intervalo)
        this.timer.unref()
    }

    async criarTabela() {
        try {
            await this.db.query(
                `CREATE TABLE IF NOT EXISTS \`${this.tabela}\` (
                    sid VARCHAR(128) NOT NULL,
                    expira_em BIGINT NOT NULL,
                    dados MEDIUMTEXT NOT NULL,
                    PRIMARY KEY (sid),
                    KEY idx_sessoes_expira (expira_em)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
            )
        } catch (err) {
            console.error('[sessoes] não foi possível criar a tabela:', err.message)
        }
    }

    calcularExpiracao(sessao) {
        const expires = sessao && sessao.cookie && sessao.cookie.expires
        const data = expires ? new Date(expires).getTime() : NaN

        return Number.isFinite(data) ? data : Date.now() + UM_DIA_MS
    }

    get(sid, callback) {
        this.pronta
            .then(() => this.db.query(
                `SELECT dados FROM \`${this.tabela}\` WHERE sid = ? AND expira_em > ? LIMIT 1`,
                [sid, Date.now()]
            ))
            .then(([linhas]) => {
                let sessao = null

                if (linhas.length) {
                    try {
                        sessao = JSON.parse(linhas[0].dados)
                    } catch (err) {
                        sessao = null
                    }
                }

                callback(null, sessao)
            }, err => callback(err))
    }

    set(sid, sessao, callback = () => {}) {
        const dados = JSON.stringify(sessao)
        const expiraEm = this.calcularExpiracao(sessao)

        this.pronta
            .then(() => this.db.query(
                `INSERT INTO \`${this.tabela}\` (sid, expira_em, dados)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE expira_em = VALUES(expira_em), dados = VALUES(dados)`,
                [sid, expiraEm, dados]
            ))
            .then(() => callback(null), err => callback(err))
    }

    touch(sid, sessao, callback = () => {}) {
        this.pronta
            .then(() => this.db.query(
                `UPDATE \`${this.tabela}\` SET expira_em = ? WHERE sid = ?`,
                [this.calcularExpiracao(sessao), sid]
            ))
            .then(() => callback(null), err => callback(err))
    }

    destroy(sid, callback = () => {}) {
        this.pronta
            .then(() => this.db.query(`DELETE FROM \`${this.tabela}\` WHERE sid = ?`, [sid]))
            .then(() => callback(null), err => callback(err))
    }

    limparVencidas() {
        this.db
            .query(`DELETE FROM \`${this.tabela}\` WHERE expira_em <= ?`, [Date.now()])
            .catch(err => console.error('[sessoes] erro ao limpar vencidas:', err.message))
    }
}

module.exports = SessaoMysql
