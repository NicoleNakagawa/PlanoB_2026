// Utilitários para os vídeos postados pelos professores.
// Um vídeo pode ser um arquivo enviado (/uploads/videos/...) ou um link do YouTube
// (de preferência "não listado"). Vídeo "privado" do YouTube não abre dentro do site.

const CAPA_PADRAO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">' +
    '<rect width="640" height="360" fill="#0b1f3a"/>' +
    '<circle cx="320" cy="180" r="52" fill="#ffffff" fill-opacity="0.15"/>' +
    '<polygon points="302,152 302,208 350,180" fill="#ffffff"/>' +
    '</svg>'
)

const NIVEIS = {
    iniciante: 'Iniciante',
    intermediario: 'Intermediário',
    avancado: 'Avançado'
}

function extrairIdYoutube(url) {
    if (!url) return null

    let endereco

    try {
        endereco = new URL(String(url).trim())
    } catch (err) {
        return null
    }

    if (!['http:', 'https:'].includes(endereco.protocol)) return null

    const host = endereco.hostname.replace(/^(www|m)\./, '')
    let id = null

    if (host === 'youtu.be') {
        id = endereco.pathname.slice(1).split('/')[0]
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        if (endereco.pathname === '/watch') {
            id = endereco.searchParams.get('v')
        } else {
            const partes = endereco.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/)
            if (partes) id = partes[1]
        }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}

// Descobre de que tipo é o vídeo a partir da URL guardada no banco.
function descreverFonte(url) {
    const valor = String(url || '').trim()

    if (!valor) {
        return { tipo: null, embedUrl: null, arquivoUrl: null, miniatura: null }
    }

    const id = extrairIdYoutube(valor)

    if (id) {
        return {
            tipo: 'youtube',
            embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
            arquivoUrl: null,
            miniatura: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
        }
    }

    return { tipo: 'arquivo', embedUrl: null, arquivoUrl: valor, miniatura: null }
}

// Aceita arquivo enviado para o servidor (/uploads/...) ou um endereço http(s).
function urlVideoValida(url) {
    const valor = String(url || '').trim()

    if (!valor) return false
    if (valor.startsWith('/uploads/')) return true

    try {
        const endereco = new URL(valor)
        return ['http:', 'https:'].includes(endereco.protocol)
    } catch (err) {
        return false
    }
}

function formatarDuracao(segundos) {
    const total = Number(segundos)

    if (!total || total < 0) return '--:--'

    const min = Math.floor(total / 60)
    const seg = Math.round(total % 60)

    return String(min).padStart(2, '0') + ':' + String(seg).padStart(2, '0')
}

// Converte uma linha da tabela video para o mesmo formato usado pelos vídeos fixos
// (videosFree), que é o que as telas do aluno já sabem exibir.
function paraVideoDoAluno(linha) {
    const fonte = descreverFonte(linha.link_video)
    const segundos = Number(linha.duracao_seg) || 0

    return {
        slug: 'prof-' + linha.id_video,
        titulo: linha.titulo,
        categoria: linha.categoria || 'Treino',
        nivel: NIVEIS[linha.nivel] || 'Iniciante',
        duracao: formatarDuracao(segundos),
        duracaoMin: segundos ? Math.max(1, Math.round(segundos / 60)) : 0,
        capa: linha.thumbnail || fonte.miniatura || CAPA_PADRAO,
        descricao: linha.descricao || 'Vídeo enviado pelo professor ' + (linha.professor_nome || '') + '.',
        atencao1: 'Mantenha a postura correta durante todo o movimento.',
        atencao2: 'Pare o exercício se sentir dor e procure orientação.',
        tipoFonte: fonte.tipo,
        embedUrl: fonte.embedUrl,
        arquivoUrl: fonte.arquivoUrl,
        professor: linha.professor_nome || null
    }
}

// Vídeos ativos dos professores que o aluno pode ver, de acordo com o plano dele.
// Free (plano 1) só vê vídeos não exclusivos; Lazuli e Diamante veem todos
// (respeitando o plano mínimo, quando o professor definiu um).
async function buscarVideosProfessores(db, idPlano) {
    const plano = Number(idPlano) || 1

    const [linhas] = await db.query(
        `SELECT v.id_video, v.titulo, v.descricao, v.link_video, v.thumbnail,
                v.duracao_seg, v.categoria, v.nivel, v.exclusivo,
                p.nome AS professor_nome
         FROM video v
         JOIN professor p ON p.id_professor = v.id_professor
         WHERE v.ativo = 1
         AND v.link_video IS NOT NULL
         AND v.link_video <> ''
         AND (v.id_plano_min IS NULL OR v.id_plano_min <= ?)
         AND (v.exclusivo = 0 OR ? >= 2)
         ORDER BY v.criado_em DESC`,
        [plano, plano]
    )

    return linhas.map(paraVideoDoAluno)
}

module.exports = {
    extrairIdYoutube,
    descreverFonte,
    urlVideoValida,
    formatarDuracao,
    paraVideoDoAluno,
    buscarVideosProfessores
}
