const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Configurações do multer (upload de vídeo, foto do aluno e foto do professor),
// extraídas do router.js. Os caminhos continuam apontando para app/public/uploads.

// =======================
// UPLOAD DE VÍDEOS
// =======================

const storageVideos = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'videos'))
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname)
        const nomeSeguro = file.originalname
            .replace(extensao, '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        cb(null, `${Date.now()}-${nomeSeguro}${extensao}`)
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
    uploadPerfil,
    uploadPerfilProfessor
}
