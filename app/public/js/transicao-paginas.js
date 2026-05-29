document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('pagina-carregada')

    const links = document.querySelectorAll('a[href]')

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            const href = link.getAttribute('href')

            if (!href) return

            const linkExterno = link.hostname && link.hostname !== window.location.hostname
            const ancora = href.startsWith('#')
            const javascriptLink = href.startsWith('javascript:')
            const novaAba = link.target === '_blank'
            const download = link.hasAttribute('download')
            const logout = href === '/logout'

            if (linkExterno || ancora || javascriptLink || novaAba || download || logout) {
                return
            }

            event.preventDefault()

            document.body.classList.remove('pagina-carregada')
            document.body.classList.add('pagina-saindo')

            setTimeout(() => {
                window.location.href = href
            }, 280)
        })
    })
})