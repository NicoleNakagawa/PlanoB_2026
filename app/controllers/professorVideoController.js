const db = require('../config/pool_conexoes')
const { obterColunasTabela } = require('../utils/professorAluno')

// =======================
// VÍDEOS DO PROFESSOR (listar, criar, editar e excluir)
// =======================

exports.todosVideos = async (req, res) => {
    const idProfessor = req.session.professor.id
    const busca = (req.query.busca || '').trim()
    const categoria = (req.query.categoria || 'todos').trim()

    try {
        const params = [idProfessor]
        let filtroSql = ''

        if (busca) {
            filtroSql += ' AND (titulo LIKE ? OR descricao LIKE ? OR categoria LIKE ?)'
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
        }

        if (categoria !== 'todos') {
            filtroSql += ' AND categoria = ?'
            params.push(categoria)
        }

        const [videos] = await db.query(
            `SELECT 
                id_video,
                titulo,
                descricao,
                video_url,
                thumbnail,
                duracao_seg,
                categoria,
                nivel,
                exclusivo,
                ativo,
                criado_em,
                atualizado_em
             FROM video
             WHERE id_professor = ?
             AND ativo = 1
             ${filtroSql}
             ORDER BY criado_em DESC`,
            params
        )

        const [categorias] = await db.query(
            `SELECT DISTINCT categoria
             FROM video
             WHERE id_professor = ?
             AND ativo = 1
             AND categoria IS NOT NULL
             AND categoria <> ''
             ORDER BY categoria ASC`,
            [idProfessor]
        )

        const [estatisticasRows] = await db.query(
            `SELECT
                COUNT(*) AS total_videos,
                COALESCE(SUM(duracao_seg), 0) AS duracao_total,
                SUM(CASE WHEN exclusivo = 1 THEN 1 ELSE 0 END) AS total_exclusivos
             FROM video
             WHERE id_professor = ?
             AND ativo = 1`,
            [idProfessor]
        )

        res.render('todosvideos', {
            professor: req.session.professor,
            videos,
            categorias,
            estatisticas: estatisticasRows[0] || {
                total_videos: 0,
                duracao_total: 0,
                total_exclusivos: 0
            },
            filtros: {
                busca,
                categoria
            },
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[todosvideos]', err)

        res.render('todosvideos', {
            professor: req.session.professor,
            videos: [],
            categorias: [],
            estatisticas: {
                total_videos: 0,
                duracao_total: 0,
                total_exclusivos: 0
            },
            filtros: {
                busca,
                categoria
            },
            erro: 'Erro ao carregar vídeos: ' + err.message,
            sucesso: null
        })
    }
}

exports.criar = async (req, res) => {
    const idProfessor = req.session.professor.id

    const titulo = (req.body.titulo || '').trim()
    const descricao = (req.body.descricao || '').trim()
    const videoUrlDigitado = (req.body.video_url || '').trim()
    const thumbnail = (req.body.thumbnail || '').trim()
    const categoria = (req.body.categoria || 'Treino').trim()
    const nivel = req.body.nivel || 'iniciante'
    const duracaoSeg = Number(req.body.duracao_seg) || null
    const exclusivo = req.body.exclusivo ? 1 : 0

    const videoUrl = req.file
        ? `/uploads/videos/${req.file.filename}`
        : videoUrlDigitado

    if (!titulo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Informe o título do vídeo.'))
    }

    if (!videoUrl) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Envie um arquivo de vídeo ou informe uma URL do vídeo.'))
    }

    try {
        const colunasVideo = await obterColunasTabela('video')

        const campos = ['id_professor', 'titulo', 'descricao']
        const valores = [idProfessor, titulo, descricao || null]
        const placeholders = ['?', '?', '?']

        if (colunasVideo.includes('video_url')) {
            campos.push('video_url')
            valores.push(videoUrl)
            placeholders.push('?')
        }

        if (colunasVideo.includes('link_video')) {
            campos.push('link_video')
            valores.push(videoUrl)
            placeholders.push('?')
        }

        if (colunasVideo.includes('thumbnail')) {
            campos.push('thumbnail')
            valores.push(thumbnail || null)
            placeholders.push('?')
        }

        if (colunasVideo.includes('duracao_seg')) {
            campos.push('duracao_seg')
            valores.push(duracaoSeg)
            placeholders.push('?')
        }

        if (colunasVideo.includes('categoria')) {
            campos.push('categoria')
            valores.push(categoria || null)
            placeholders.push('?')
        }

        if (colunasVideo.includes('nivel')) {
            campos.push('nivel')
            valores.push(nivel)
            placeholders.push('?')
        }

        if (colunasVideo.includes('exclusivo')) {
            campos.push('exclusivo')
            valores.push(exclusivo)
            placeholders.push('?')
        }

        if (colunasVideo.includes('ativo')) {
            campos.push('ativo')
            valores.push(1)
            placeholders.push('?')
        }

        await db.query(
            `INSERT INTO video (${campos.map(campo => `\`${campo}\``).join(', ')})
             VALUES (${placeholders.join(', ')})`,
            valores
        )

        res.redirect('/todosvideos?sucesso=' + encodeURIComponent('Vídeo adicionado com sucesso.'))
    } catch (err) {
        console.error('[criar video]', err)

        res.redirect('/todosvideos?erro=' + encodeURIComponent('Erro ao adicionar vídeo: ' + err.message))
    }
}

exports.editarForm = async (req, res) => {
    const idProfessor = req.session.professor.id
    const idVideo = Number(req.params.id)

    if (!idVideo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo inválido.'))
    }

    try {
        const [rows] = await db.query(
            `SELECT 
                id_video,
                titulo,
                descricao,
                video_url,
                thumbnail,
                duracao_seg,
                categoria,
                nivel,
                exclusivo,
                ativo,
                criado_em,
                atualizado_em
             FROM video
             WHERE id_video = ?
             AND id_professor = ?
             LIMIT 1`,
            [idVideo, idProfessor]
        )

        if (rows.length === 0) {
            return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo não encontrado.'))
        }

        res.render('editarvideos', {
            professor: req.session.professor,
            video: rows[0],
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[editarvideos GET]', err)

        res.redirect('/todosvideos?erro=' + encodeURIComponent('Erro ao abrir vídeo: ' + err.message))
    }
}

exports.editarSalvar = async (req, res) => {
    const idProfessor = req.session.professor.id
    const idVideo = Number(req.params.id)

    const titulo = (req.body.titulo || '').trim()
    const descricao = (req.body.descricao || '').trim()
    const videoUrl = (req.body.video_url || '').trim()
    const thumbnail = (req.body.thumbnail || '').trim()
    const categoria = (req.body.categoria || '').trim()
    const nivel = req.body.nivel || 'iniciante'
    const duracaoSeg = Number(req.body.duracao_seg) || null
    const exclusivo = req.body.exclusivo ? 1 : 0

    if (!idVideo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo inválido.'))
    }

    if (!titulo) {
        return res.redirect('/editarvideos/' + idVideo + '?erro=' + encodeURIComponent('Informe o título do vídeo.'))
    }

    try {
        const colunasVideo = await obterColunasTabela('video')

        const campos = ['titulo = ?', 'descricao = ?']
        const valores = [titulo, descricao || null]

        if (colunasVideo.includes('video_url')) {
            campos.push('video_url = ?')
            valores.push(videoUrl || null)
        }

        if (colunasVideo.includes('link_video')) {
            campos.push('link_video = ?')
            valores.push(videoUrl || null)
        }

        if (colunasVideo.includes('thumbnail')) {
            campos.push('thumbnail = ?')
            valores.push(thumbnail || null)
        }

        if (colunasVideo.includes('duracao_seg')) {
            campos.push('duracao_seg = ?')
            valores.push(duracaoSeg)
        }

        if (colunasVideo.includes('categoria')) {
            campos.push('categoria = ?')
            valores.push(categoria || null)
        }

        if (colunasVideo.includes('nivel')) {
            campos.push('nivel = ?')
            valores.push(nivel)
        }

        if (colunasVideo.includes('exclusivo')) {
            campos.push('exclusivo = ?')
            valores.push(exclusivo)
        }

        if (colunasVideo.includes('atualizado_em')) {
            campos.push('atualizado_em = NOW()')
        }

        valores.push(idVideo, idProfessor)

        const [result] = await db.query(
            `UPDATE video
             SET ${campos.join(', ')}
             WHERE id_video = ?
             AND id_professor = ?`,
            valores
        )

        if (result.affectedRows === 0) {
            return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo não encontrado ou sem permissão.'))
        }

        res.redirect('/editarvideos/' + idVideo + '?sucesso=' + encodeURIComponent('Alterações salvas com sucesso.'))
    } catch (err) {
        console.error('[editarvideos POST]', err)

        res.redirect('/editarvideos/' + idVideo + '?erro=' + encodeURIComponent('Erro ao salvar vídeo: ' + err.message))
    }
}

exports.excluir = async (req, res) => {
    const idProfessor = req.session.professor.id
    const idVideo = Number(req.params.id)

    if (!idVideo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo inválido.'))
    }

    try {
        const colunasVideo = await obterColunasTabela('video')

        if (colunasVideo.includes('ativo')) {
            await db.query(
                `UPDATE video
                 SET ativo = 0
                 WHERE id_video = ?
                 AND id_professor = ?`,
                [idVideo, idProfessor]
            )
        } else {
            await db.query(
                `DELETE FROM video
                 WHERE id_video = ?
                 AND id_professor = ?`,
                [idVideo, idProfessor]
            )
        }

        res.redirect('/todosvideos?sucesso=' + encodeURIComponent('Vídeo removido com sucesso.'))
    } catch (err) {
        console.error('[excluir video]', err)

        res.redirect('/todosvideos?erro=' + encodeURIComponent('Erro ao remover vídeo: ' + err.message))
    }
}

exports.editarExercicios = (req, res) => {
    res.redirect('/todosvideos')
}
