const db = require('../config/pool_conexoes')

// Funções compartilhadas entre as rotas de professor, aluno e feedback,
// extraídas do router.js.

async function obterColunasTabela(nomeTabela) {
    const [colunas] = await db.query(`SHOW COLUMNS FROM \`${nomeTabela}\``)
    return colunas.map(coluna => coluna.Field)
}

async function criarFichaParaProfessor(idProfessor, dados = {}) {
    const colunasFicha = await obterColunasTabela('ficha_treino')

    const campos = []
    const valores = []
    const params = []

    function adicionar(campo, valor) {
        if (colunasFicha.includes(campo)) {
            campos.push(`\`${campo}\``)
            valores.push('?')
            params.push(valor)
        }
    }

    adicionar('id_professor', idProfessor)
    adicionar('nome_ficha', dados.nomeFicha || 'Ficha principal')
    adicionar('nome', dados.nomeFicha || 'Ficha principal')
    adicionar('titulo', dados.nomeFicha || 'Ficha principal')
    adicionar('categoria', dados.categoria || 'Treino personalizado')
    adicionar('nivel', dados.nivel || 'iniciante')
    adicionar('descricao', 'Ficha criada automaticamente ao vincular aluno ao professor.')
    adicionar('objetivo', 'Acompanhamento personalizado')
    adicionar('ativo', 1)

    if (!campos.includes('`id_professor`')) {
        throw new Error('A tabela ficha_treino precisa ter a coluna id_professor.')
    }

    if (
        !campos.includes('`nome_ficha`') &&
        !campos.includes('`nome`') &&
        !campos.includes('`titulo`')
    ) {
        throw new Error('A tabela ficha_treino precisa ter uma coluna de nome da ficha: nome_ficha, nome ou titulo.')
    }

    const [resultado] = await db.query(
        `INSERT INTO ficha_treino (${campos.join(', ')})
         VALUES (${valores.join(', ')})`,
        params
    )

    return resultado.insertId
}

async function vincularAlunoAoProfessor(idProfessor, idAluno, dados = {}) {
    const colunasAlunoFicha = await obterColunasTabela('aluno_ficha')
    const temAtivo = colunasAlunoFicha.includes('ativo')
    const filtroAtivo = temAtivo ? 'AND af.ativo = 1' : ''

    const [vinculoExistente] = await db.query(
        `SELECT af.id_aluno, af.id_ficha
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         WHERE af.id_aluno = ?
         AND ft.id_professor = ?
         ${filtroAtivo}
         LIMIT 1`,
        [idAluno, idProfessor]
    )

    if (vinculoExistente.length > 0) {
        return {
            jaExistia: true,
            idFicha: vinculoExistente[0].id_ficha
        }
    }

    const idFicha = await criarFichaParaProfessor(idProfessor, dados)

    const campos = []
    const valores = []
    const params = []

    function adicionar(campo, valor) {
        if (colunasAlunoFicha.includes(campo)) {
            campos.push(`\`${campo}\``)
            valores.push('?')
            params.push(valor)
        }
    }

    adicionar('id_aluno', idAluno)
    adicionar('id_ficha', idFicha)
    adicionar('ativo', 1)

    if (colunasAlunoFicha.includes('data_inicio')) {
        campos.push('`data_inicio`')
        valores.push('CURDATE()')
    }

    if (colunasAlunoFicha.includes('criado_em')) {
        campos.push('`criado_em`')
        valores.push('NOW()')
    }

    if (colunasAlunoFicha.includes('atualizado_em')) {
        campos.push('`atualizado_em`')
        valores.push('NOW()')
    }

    if (colunasAlunoFicha.includes('status')) {
        campos.push('`status`')
        valores.push('?')
        params.push('ativo')
    }

    if (!campos.includes('`id_aluno`') || !campos.includes('`id_ficha`')) {
        throw new Error('A tabela aluno_ficha precisa ter as colunas id_aluno e id_ficha.')
    }

    await db.query(
        `INSERT INTO aluno_ficha (${campos.join(', ')})
         VALUES (${valores.join(', ')})`,
        params
    )

    return {
        jaExistia: false,
        idFicha
    }
}

async function buscarProfessorResponsavelDoAluno(idAluno) {
    const colunasAlunoFicha = await obterColunasTabela('aluno_ficha')
    const temAtivo = colunasAlunoFicha.includes('ativo')
    const filtroAtivo = temAtivo ? 'AND af.ativo = 1' : ''

    const [professorRows] = await db.query(
        `SELECT 
            p.id_professor,
            p.nome,
            p.email,
            p.cref,
            p.foto_perfil
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         JOIN professor p ON p.id_professor = ft.id_professor
         WHERE af.id_aluno = ?
         ${filtroAtivo}
         ORDER BY ft.id_ficha DESC
         LIMIT 1`,
        [idAluno]
    )

    return professorRows[0] || null
}

module.exports = {
    obterColunasTabela,
    criarFichaParaProfessor,
    vincularAlunoAoProfessor,
    buscarProfessorResponsavelDoAluno
}
