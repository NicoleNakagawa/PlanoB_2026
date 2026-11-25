// Lista fixa de vídeos gratuitos (plano Free), extraída do router.js
//
// Para o vídeo TOCAR no site, preencha o campo videoUrl de cada item com:
//   - um link do YouTube (de preferência "não listado"), ex.: 'https://youtu.be/XXXXXXXXXXX'
//   - ou um arquivo enviado para o servidor, ex.: '/uploads/videos/agachamento.mp4'
// Enquanto estiver vazio, a tela mostra "Vídeo em breve".

const videosFree = [
    {
        slug: 'agachamento',
        videoUrl: 'https://www.youtube.com/watch?v=LnNmVVzykRs&pp=ygUTYWdhY2hhbWVudG8gZW0gY2FzYQ%3D%3D',
        titulo: 'Fundamentos do Agachamento',
        categoria: 'Fundamentos',
        nivel: 'Iniciante',
        duracao: '16:17',
        duracaoMin: 12,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDo-fkwrI2vN175z62Qq2gtPN-gdAd45gJquHcF0ZyrskfDFnSeAOf9qOhdizqb5DBMp13lLNffweE1YO5GUZ3viG9nx3MFst660mShuHltw7_RvBzPduY5hMovRZvbapvnBuzg-XYEdMKaWK9kN3V28Y2an46LQ9E2pTycTtnHgEHfZDIpEX568pGUlfrSTwT46rRNZXGn9VgpeNGF0sq_dR0rO3fExyys5u2-rmWN5MnFUS8r-kbm68aDMtPi_IV3RtycExLYFKWZ',
        descricao: 'Mantenha os pés afastados na largura dos ombros. Desça controladamente empurrando o quadril para trás como se fosse sentar em uma cadeira. Mantenha o peito aberto e o core engajado.',
        atencao1: 'Não deixe os joelhos entrarem durante o movimento.',
        atencao2: 'Evite curvar a região lombar excessivamente durante a descida.'
    },
    {
        slug: 'cardio-10-minutos',
        videoUrl: 'https://www.youtube.com/watch?v=_0vqE0dGdJ4&pp=ygUOY2FyZGlvIGVtIGNhc2E%3D',
        titulo: 'Cardio',
        categoria: 'Cardio',
        nivel: 'Iniciante',
        duracao: '16:05',
        duracaoMin: 10,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjgvCFuIJdPrEMcolFmqhwO_PBewj-gbMz37PihA1HWzsWFP_PbNVgEQTi-OeHMr7imOcIebYDzZmlos5ZFu7gEVZT3Buue-qMWf6VjoNywEnrFfQ20PLGYKk5BGVGdoZXdmuIih5JJ2QtUgPlv-u4civPcntZgkgLa9-FRldHUsj0GNPdUsylv_RvoleCGxb3cF1wLrpG25h-zBmU7-tH4g7XcRjP7udlVDOvPOg9HAdXhy56YsgnyQ0sKyrhfUjXrZ09Q9YiKkci',
        descricao: 'Faça movimentos contínuos e controlados, mantendo a respiração constante. Respeite seu ritmo e aumente a intensidade aos poucos.',
        atencao1: 'Não prenda a respiração durante o exercício.',
        atencao2: 'Reduza o ritmo se sentir tontura ou dor.'
    },
    {
        slug: 'mobilidade-basica',
        videoUrl: 'https://www.youtube.com/watch?v=F1iejoRbRts&pp=ygURbW9iaWxpZGFkZSBiYXNpY2HSBwkJEAgBhyohjO8%3D',
        titulo: 'Mobilidade Básica',
        categoria: 'Flexibilidade',
        nivel: 'Iniciante',
        duracao: '08:51',
        duracaoMin: 5,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBznhSUh7EuakqvmDPkaRGFV73qpdMbNqGjupfUsEPKslvaPKPMxVzKR_aJSFaeMmJ_2d5spIjxtp5u6OmeUgVi0r8nBTmiwTS-deyShfHpHjhV71lKrBcpzjbcUls7bAzawG7bYq2Ny5cObCsJIBmy3FaAdg6ZAEB6_V53u32BKizMc-hpx1CT3d27UQtgZG10Y50ZAGOHXFsnmw77CfTeEA0B52gG80kv8UZ6XLGwFN6NJyiZfTjlCYOxW-Wd42UbAXl_sBOxS3w5',
        descricao: 'Execute os movimentos com calma, buscando amplitude sem forçar demais. O objetivo é preparar o corpo e melhorar a mobilidade.',
        atencao1: 'Não force articulações além do confortável.',
        atencao2: 'Faça os movimentos de forma lenta e consciente.'
    },
    {
        slug: 'flexao-perfeita',
        videoUrl: 'https://www.youtube.com/watch?v=Dt_m7A7i79o&pp=ygUOZmxleGFvIGVtIGNhc2E%3D',
        titulo: 'Flexão do Zero',
        categoria: 'Braços',
        nivel: 'Iniciante',
        duracao: '13:41',
        duracaoMin: 7,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2Te23qaQIP4sDEyhs5iPl36s9SMamoVzTUfKEV6GeYjwb8AkWCdFbdWUyjaVZEYOVXSz3w5XdWkMrYcX8fYu7_vtBSn2zUq62m9tNxd6QC-hSR-SXvTuewWJNXtE2ghd9-fK_g_A3kl4BNQ7l5HhM-CJjRSewpFwaM3YO_w_egiqP-jubNlDXGOqBokOdD6FDYThpRhuBOU4PqqWu2BEJd23D_NOM3uFVxS2pTQeTpg3QnJmG_0eG3MQScGOQSQNa1Yc86RQ6TVzR',
        descricao: 'Mantenha o corpo alinhado, contraia o abdômen e desça até próximo do chão. Empurre o corpo para cima sem perder o alinhamento.',
        atencao1: 'Não deixe o quadril cair.',
        atencao2: 'Não abra demais os cotovelos.'
    },
    {
        slug: 'afundo-explosivo',
        videoUrl: 'https://www.youtube.com/watch?v=-oIl0YJGf9c&pp=ygUYYWZ1bmRvIGV4cGxvc2l2byBlbSBjYXNh',
        titulo: 'Afundo Explosivo',
        categoria: 'Pernas',
        nivel: 'Iniciante',
        duracao: '09:28',
        duracaoMin: 6,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNbv4owisX8CeqniNla6_8dRp3ZaqrmlC6ESnV5-hk_skn1D3HE7IsZkf-9wcqV9BLb570D23Oohasvrapm5J42VUEjGGHBBAt4rGsBn9remgGIVrQIXlYZmnpupLuGiRWZMhWH_0Yp2A6ZhSCIT9-6dMG5KWTefqWuF2JqoPbHWC45KBzqMa4QGbiYiX0FbVD_SSiB6VIodeltSt3cygjfVIAYGTLpzM66eSqxz4e1dy-Cn5aZlDTj21yBEt_SsJdSkj5CqZ02pME',
        descricao: 'Dê um passo à frente, flexione os joelhos e mantenha o tronco alinhado. Suba com força, controlando o retorno.',
        atencao1: 'Não deixe o joelho ultrapassar demais a ponta do pé.',
        atencao2: 'Mantenha o equilíbrio durante todo o movimento.'
    },
    {
        slug: 'prancha-isometrica',
        videoUrl: 'https://www.youtube.com/watch?v=dduZjSypIS8&pp=ygUTcHJhbmNoYSBpc29tw6l0cmljYQ%3D%3D',
        titulo: 'Prancha Isométrica',
        categoria: 'Core',
        nivel: 'Iniciante',
        duracao: '07:45',
        duracaoMin: 5,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5Yw2rBZzu25lDVT60lbXslUxzdUVoYe9Z2NJW76C23iVOmyYbytq8CkMXEcSWqYf0CwINekPUaiNBZYJ5TuM_DSF3ww1jJkmDhH5QDRDqblhocwcfDeARboOYmc3_WEXV8utnL9nWyNjo9xBas7zsNkm2iERXNpXR1VjiXNGSw9PObHr03ce9pB5DEdcE-HT5ucROn8BOlPcFurHxdp8_AQNj4S4r8sbN6kpEaZZX1PQWZUDXxCnn6IfG_Ndvea4aXZF7vpz_uzgl',
        descricao: 'Apoie os antebraços no chão, mantenha o corpo reto e contraia o abdômen. Segure a posição sem deixar o quadril cair.',
        atencao1: 'Não levante demais o quadril.',
        atencao2: 'Não relaxe o abdômen durante a execução.'
    },
    {
        slug: 'treino-corpo-inteiro',
        videoUrl: 'https://www.youtube.com/watch?v=Ylpt0A1sQq4',
        titulo: 'Treino de Força para o Corpo Inteiro',
        categoria: 'Força',
        nivel: 'Iniciante',
        duracao: '16:00',
        duracaoMin: 16,
        capa: 'https://img.youtube.com/vi/Ylpt0A1sQq4/hqdefault.jpg',
        descricao: 'Treino geral em casa, sem equipamentos, combinando movimentos para desenvolver força, mobilidade e resistência. Acompanhe no seu ritmo e respeite as pausas.',
        atencao1: 'Mantenha os movimentos controlados e adapte a amplitude ao seu condicionamento.',
        atencao2: 'Faça pausas quando necessário e interrompa se sentir dor.'
    }
,
    {
        slug: 'agachamento-bulgaro',
        videoUrl: 'https://www.youtube.com/watch?v=qepBcFFMzhM',
        titulo: 'Agachamento Búlgaro',
        categoria: 'Pernas',
        nivel: 'Intermediário',
        duracao: '05:48',
        duracaoMin: 6,
        capa: 'https://img.youtube.com/vi/qepBcFFMzhM/hqdefault.jpg',
        descricao: 'Exercício unilateral para quadríceps e glúteos: apoie o pé de trás em um banco, desça com controle e suba empurrando pelo pé da frente. Treine um lado de cada vez.',
        atencao1: 'Mantenha o tronco firme e o joelho da frente alinhado com o pé.',
        atencao2: 'Se perder o equilíbrio, aproxime o apoio ou segure em um suporte firme.',
        planoMin: 2
    },
    {
        slug: 'agachamento-pistol',
        videoUrl: 'https://www.youtube.com/watch?v=-So3tY7iD-U',
        titulo: 'Agachamento Unilateral (Pistol)',
        categoria: 'Pernas',
        nivel: 'Avançado',
        duracao: '--:--',
        duracaoMin: 0,
        capa: 'https://img.youtube.com/vi/-So3tY7iD-U/hqdefault.jpg',
        descricao: 'Agachamento com uma perna só, que exige força, equilíbrio e mobilidade. O vídeo mostra a progressão para chegar ao movimento completo, um passo de cada vez.',
        atencao1: 'Exercício avançado: domine antes o agachamento e o búlgaro.',
        atencao2: 'Use um apoio ou uma caixa na descida e pare se sentir dor no joelho.',
        planoMin: 2
    },
    {
        slug: 'flexao-diamante',
        videoUrl: 'https://www.youtube.com/watch?v=HUkHqBRymY4',
        titulo: 'Flexão Diamante',
        categoria: 'Braços',
        nivel: 'Intermediário',
        duracao: '--:--',
        duracaoMin: 0,
        capa: 'https://img.youtube.com/vi/HUkHqBRymY4/hqdefault.jpg',
        descricao: 'Variação da flexão com as mãos próximas, formando um diamante, que dá mais ênfase ao tríceps. Mantenha o corpo alinhado e desça com controle.',
        atencao1: 'Cotovelos junto ao corpo e quadril alinhado, sem deixar cair.',
        atencao2: 'Se estiver difícil, apoie os joelhos ou as mãos em um local elevado.',
        planoMin: 2
    },
    {
        slug: 'flexao-arqueiro',
        videoUrl: 'https://www.youtube.com/watch?v=R0jAWMqgjU4',
        titulo: 'Flexão Arqueiro: Progressões',
        categoria: 'Braços',
        nivel: 'Avançado',
        duracao: '--:--',
        duracaoMin: 0,
        capa: 'https://img.youtube.com/vi/R0jAWMqgjU4/hqdefault.jpg',
        descricao: 'Flexão unilateral de calistenia, em que um braço faz a força enquanto o outro se estende para o lado. O vídeo ensina as progressões para aprender do jeito certo.',
        atencao1: 'Exercício avançado: tenha uma boa base de flexões antes de tentar.',
        atencao2: 'Aumente a dificuldade aos poucos e pare se sentir dor nos ombros ou punhos.',
        planoMin: 2
    },
    {
        slug: 'hiit-22-minutos',
        videoUrl: 'https://www.youtube.com/watch?v=M92duuSJf58',
        titulo: 'HIIT de 22 Minutos em Casa',
        categoria: 'Cardio',
        nivel: 'Intermediário',
        duracao: '~22 min',
        duracaoMin: 22,
        capa: 'https://img.youtube.com/vi/M92duuSJf58/hqdefault.jpg',
        descricao: 'Treino intervalado de alta intensidade para fazer em casa, sem equipamentos, alternando esforço e descanso. Acompanhe o ritmo do vídeo.',
        atencao1: 'Aqueça antes e mantenha a respiração constante.',
        atencao2: 'Reduza a intensidade ou faça pausas se sentir tontura ou dor.',
        planoMin: 2
    },
    {
        slug: 'cardio-50-minutos',
        videoUrl: 'https://www.youtube.com/watch?v=cYp_K4BVxec',
        titulo: 'Cardio Intenso de 50 Minutos',
        categoria: 'Cardio',
        nivel: 'Avançado',
        duracao: '~50 min',
        duracaoMin: 50,
        capa: 'https://img.youtube.com/vi/cYp_K4BVxec/hqdefault.jpg',
        descricao: 'Sessão longa de cardio em casa, sem equipamentos, para quem já tem bom condicionamento e quer um desafio de resistência.',
        atencao1: 'Hidrate-se e respeite os intervalos para manter a técnica.',
        atencao2: 'Se for sua primeira vez, faça só parte do treino e aumente aos poucos.',
        planoMin: 2
    },
    {
        slug: 'variacoes-prancha',
        videoUrl: 'https://www.youtube.com/watch?v=BCCgj7GKBlA',
        titulo: 'Variações da Prancha',
        categoria: 'Core',
        nivel: 'Intermediário',
        duracao: '--:--',
        duracaoMin: 0,
        capa: 'https://img.youtube.com/vi/BCCgj7GKBlA/hqdefault.jpg',
        descricao: 'Dez variações de prancha para progredir sem ficar minutos na mesma posição. Escolha as que desafiam você mantendo a postura correta.',
        atencao1: 'Mantenha o abdômen contraído e o corpo em linha reta.',
        atencao2: 'Não deixe a lombar ceder; encerre a série quando a técnica falhar.',
        planoMin: 2
    },
    {
        slug: 'abdomen-15-minutos',
        videoUrl: 'https://www.youtube.com/watch?v=RqFf7AMydMk',
        titulo: 'Treino de Abdômen de 15 Minutos',
        categoria: 'Core',
        nivel: 'Avançado',
        duracao: '~15 min',
        duracaoMin: 15,
        capa: 'https://img.youtube.com/vi/RqFf7AMydMk/hqdefault.jpg',
        descricao: 'Circuito de abdômen em casa com 4 rounds de 30 segundos de execução e 15 de recuperação, combinando prancha e abdominais.',
        atencao1: 'Faça os movimentos controlados, sem puxar o pescoço.',
        atencao2: 'Pare se sentir dor na lombar e reduza o ritmo se necessário.',
        planoMin: 2
    },
    {
        slug: 'mobilidade-quadril',
        videoUrl: 'https://www.youtube.com/watch?v=de368JOUgts',
        titulo: 'Mobilidade e Alongamento de Quadril',
        categoria: 'Flexibilidade',
        nivel: 'Intermediário',
        duracao: '~18 min',
        duracaoMin: 18,
        capa: 'https://img.youtube.com/vi/de368JOUgts/hqdefault.jpg',
        descricao: 'Aula guiada para soltar o quadril e ganhar amplitude, útil para agachar mais fundo e melhorar a postura.',
        atencao1: 'Vá até onde for confortável, sem forçar a articulação.',
        atencao2: 'Respire fundo e evite movimentos bruscos.',
        planoMin: 2
    },
    {
        slug: 'flexibilidade-coluna-avancada',
        videoUrl: 'https://www.youtube.com/watch?v=rUIG7zLbpe4',
        titulo: 'Flexibilidade de Coluna (Avançado)',
        categoria: 'Flexibilidade',
        nivel: 'Avançado',
        duracao: '--:--',
        duracaoMin: 0,
        capa: 'https://img.youtube.com/vi/rUIG7zLbpe4/hqdefault.jpg',
        descricao: 'Alongamentos de flexibilidade avançada para a coluna. Indicado para quem já pratica a rotina básica de alongamento de coluna.',
        atencao1: 'Exercício avançado: aqueça bem antes e progrida com calma.',
        atencao2: 'Nunca force a amplitude; interrompa se sentir dor ou formigamento.',
        planoMin: 2
    }

]

module.exports = videosFree
