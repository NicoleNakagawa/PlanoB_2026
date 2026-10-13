// Lista fixa de vídeos gratuitos (plano Free), extraída do router.js

const videosFree = [
    {
        slug: 'agachamento',
        titulo: 'Fundamentos do Agachamento',
        categoria: 'Fundamentos',
        nivel: 'Iniciante',
        duracao: '08:45',
        duracaoMin: 9,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDo-fkwrI2vN175z62Qq2gtPN-gdAd45gJquHcF0ZyrskfDFnSeAOf9qOhdizqb5DBMp13lLNffweE1YO5GUZ3viG9nx3MFst660mShuHltw7_RvBzPduY5hMovRZvbapvnBuzg-XYEdMKaWK9kN3V28Y2an46LQ9E2pTycTtnHgEHfZDIpEX568pGUlfrSTwT46rRNZXGn9VgpeNGF0sq_dR0rO3fExyys5u2-rmWN5MnFUS8r-kbm68aDMtPi_IV3RtycExLYFKWZ',
        descricao: 'Mantenha os pés afastados na largura dos ombros. Desça controladamente empurrando o quadril para trás como se fosse sentar em uma cadeira. Mantenha o peito aberto e o core engajado.',
        atencao1: 'Não deixe os joelhos entrarem durante o movimento.',
        atencao2: 'Evite curvar a região lombar excessivamente durante a descida.'
    },
    {
        slug: 'cardio-10-minutos',
        titulo: 'Cardio de 10 minutos',
        categoria: 'Cardio',
        nivel: 'Iniciante',
        duracao: '10:00',
        duracaoMin: 10,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjgvCFuIJdPrEMcolFmqhwO_PBewj-gbMz37PihA1HWzsWFP_PbNVgEQTi-OeHMr7imOcIebYDzZmlos5ZFu7gEVZT3Buue-qMWf6VjoNywEnrFfQ20PLGYKk5BGVGdoZXdmuIih5JJ2QtUgPlv-u4civPcntZgkgLa9-FRldHUsj0GNPdUsylv_RvoleCGxb3cF1wLrpG25h-zBmU7-tH4g7XcRjP7udlVDOvPOg9HAdXhy56YsgnyQ0sKyrhfUjXrZ09Q9YiKkci',
        descricao: 'Faça movimentos contínuos e controlados, mantendo a respiração constante. Respeite seu ritmo e aumente a intensidade aos poucos.',
        atencao1: 'Não prenda a respiração durante o exercício.',
        atencao2: 'Reduza o ritmo se sentir tontura ou dor.'
    },
    {
        slug: 'mobilidade-basica',
        titulo: 'Mobilidade Básica',
        categoria: 'Flexibilidade',
        nivel: 'Iniciante',
        duracao: '12:30',
        duracaoMin: 13,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBznhSUh7EuakqvmDPkaRGFV73qpdMbNqGjupfUsEPKslvaPKPMxVzKR_aJSFaeMmJ_2d5spIjxtp5u6OmeUgVi0r8nBTmiwTS-deyShfHpHjhV71lKrBcpzjbcUls7bAzawG7bYq2Ny5cObCsJIBmy3FaAdg6ZAEB6_V53u32BKizMc-hpx1CT3d27UQtgZG10Y50ZAGOHXFsnmw77CfTeEA0B52gG80kv8UZ6XLGwFN6NJyiZfTjlCYOxW-Wd42UbAXl_sBOxS3w5',
        descricao: 'Execute os movimentos com calma, buscando amplitude sem forçar demais. O objetivo é preparar o corpo e melhorar a mobilidade.',
        atencao1: 'Não force articulações além do confortável.',
        atencao2: 'Faça os movimentos de forma lenta e consciente.'
    },
    {
        slug: 'flexao-perfeita',
        titulo: 'Flexão Perfeita',
        categoria: 'Braços',
        nivel: 'Iniciante',
        duracao: '06:30',
        duracaoMin: 7,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2Te23qaQIP4sDEyhs5iPl36s9SMamoVzTUfKEV6GeYjwb8AkWCdFbdWUyjaVZEYOVXSz3w5XdWkMrYcX8fYu7_vtBSn2zUq62m9tNxd6QC-hSR-SXvTuewWJNXtE2ghd9-fK_g_A3kl4BNQ7l5HhM-CJjRSewpFwaM3YO_w_egiqP-jubNlDXGOqBokOdD6FDYThpRhuBOU4PqqWu2BEJd23D_NOM3uFVxS2pTQeTpg3QnJmG_0eG3MQScGOQSQNa1Yc86RQ6TVzR',
        descricao: 'Mantenha o corpo alinhado, contraia o abdômen e desça até próximo do chão. Empurre o corpo para cima sem perder o alinhamento.',
        atencao1: 'Não deixe o quadril cair.',
        atencao2: 'Não abra demais os cotovelos.'
    },
    {
        slug: 'afundo-explosivo',
        titulo: 'Afundo Explosivo',
        categoria: 'Pernas',
        nivel: 'Iniciante',
        duracao: '07:15',
        duracaoMin: 8,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNbv4owisX8CeqniNla6_8dRp3ZaqrmlC6ESnV5-hk_skn1D3HE7IsZkf-9wcqV9BLb570D23Oohasvrapm5J42VUEjGGHBBAt4rGsBn9remgGIVrQIXlYZmnpupLuGiRWZMhWH_0Yp2A6ZhSCIT9-6dMG5KWTefqWuF2JqoPbHWC45KBzqMa4QGbiYiX0FbVD_SSiB6VIodeltSt3cygjfVIAYGTLpzM66eSqxz4e1dy-Cn5aZlDTj21yBEt_SsJdSkj5CqZ02pME',
        descricao: 'Dê um passo à frente, flexione os joelhos e mantenha o tronco alinhado. Suba com força, controlando o retorno.',
        atencao1: 'Não deixe o joelho ultrapassar demais a ponta do pé.',
        atencao2: 'Mantenha o equilíbrio durante todo o movimento.'
    },
    {
        slug: 'prancha-isometrica',
        titulo: 'Prancha Isométrica',
        categoria: 'Core',
        nivel: 'Iniciante',
        duracao: '05:40',
        duracaoMin: 6,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5Yw2rBZzu25lDVT60lbXslUxzdUVoYe9Z2NJW76C23iVOmyYbytq8CkMXEcSWqYf0CwINekPUaiNBZYJ5TuM_DSF3ww1jJkmDhH5QDRDqblhocwcfDeARboOYmc3_WEXV8utnL9nWyNjo9xBas7zsNkm2iERXNpXR1VjiXNGSw9PObHr03ce9pB5DEdcE-HT5ucROn8BOlPcFurHxdp8_AQNj4S4r8sbN6kpEaZZX1PQWZUDXxCnn6IfG_Ndvea4aXZF7vpz_uzgl',
        descricao: 'Apoie os antebraços no chão, mantenha o corpo reto e contraia o abdômen. Segure a posição sem deixar o quadril cair.',
        atencao1: 'Não levante demais o quadril.',
        atencao2: 'Não relaxe o abdômen durante a execução.'
    }
]

module.exports = videosFree
