const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Configurações do multer (upload de vídeo, foto do aluno e foto do professor),
// extraídas do router.js. Os caminhos continuam apontando para app/public/uploads.

// =======================
// UPLOAD DE VÍDEOS
// =======================

const pastaVideos = path.join(__dirname, '..', 'public', 'uploads', 'videos')

// A pasta de vídeos não existe no GitHub (pasta vazia não é versionada): cria na inicialização
if (!fs.existsSync(pastaVideos)) {
    fs.mkdirSync(pastaVideos, { recursive: true })
}

const storageVideos = multer.diskStorage({
    destination: (req, file, cb) => {
        // Garante a pasta também na hora do envio (ex.: se ela for apagada com o servidor ligado)
        fs.mkdir(pastaVideos, { recursive: true }, (err) => cb(err, pastaVideos))
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname).toLowerCase()
        const nomeSeguro = path.basename(file.originalname, path.extname(file.originalname))
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 60)

        // O caminho vai para a coluna link_video (255 caracteres): o nome é limitado a 60
        cb(null, `${Date.now()}-${nomeSeguro || 'video'}${extensao}`)
    }
})

const uploadVideo = multer({
    storage: storageVideos,
    limits: {
        fileSize: 300 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/quicktime'
        ]

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Envie um vídeo nos formatos MP4, WEBM, OGG ou MOV.'))
        }

        cb(null, true)
    }
})

// Recebe o arquivo do formulário e, se algo der errado (formato, tamanho, disco),
// volta para a biblioteca de vídeos com uma mensagem em vez de abrir uma tela de erro.
function receberVideo(req, res, next) {
    uploadVideo.single('arquivo_video')(req, res, (err) => {
        if (!err) return next()

        console.error('[upload de video]', err)

        let mensagem = 'Não foi possível enviar o vídeo. Tente novamente.'

        if (err.code === 'LIMIT_FILE_SIZE') {
            mensagem = 'O vídeo é maior que 300MB. Envie um arquivo menor ou use o link do YouTube.'
        } else if (String(err.message || '').startsWith('Envie um vídeo')) {
            mensagem = err.message
        } else if (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'ENOSPC') {
            mensagem = 'O servidor não conseguiu salvar o arquivo. Tente novamente ou use o link do YouTube.'
        }

        res.redirect('/todosvideos?erro=' + encodeURIComponent(mensagem))
    })
}

// =======================
// UPLOAD DE FOTO DE PERFIL
// =======================

const pastaPerfis = path.join(__dirname, '..', 'public', 'uploads', 'perfis')

if (!fs.existsSync(pastaPerfis)) {
    fs.mkdirSync(pastaPerfis, { recursive: true })
}

const storagePerfil = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaPerfis)
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname).toLowerCase()

        cb(null, `perfil-${req.session.aluno.id}-${Date.now()}${extensao}`)
    }
})

const uploadPerfil = multer({
    storage: storagePerfil,
    limits: {
        fileSize: 3 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ]

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Envie uma imagem nos formatos JPG, PNG ou WEBP.'))
        }

        cb(null, true)
    }
})

// =======================
// UPLOAD DE FOTO DE PERFIL DO PROFESSOR
// =======================

const pastaPerfisProfessores = path.join(__dirname, '..', 'public', 'uploads', 'professores')

if (!fs.existsSync(pastaPerfisProfessores)) {
    fs.mkdirSync(pastaPerfisProfessores, { recursive: true })
}

const storagePerfilProfessor = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaPerfisProfessores)
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname).toLowerCase()
        cb(null, `professor-${req.session.professor.id}-${Date.now()}${extensao}`)
    }
})

const uploadPerfilProfessor = multer({
    storage: storagePerfilProfessor,
    limits: {
        fileSize: 3 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ]

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Envie uma imagem nos formatos JPG, PNG ou WEBP.'))
        }

        cb(null, true)
    }
})

module.exports = {
    uploadVideo,
    receberVideo,
    uploadPerfil,
    uploadPerfilProfessor
}
