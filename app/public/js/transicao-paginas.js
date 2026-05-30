document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('pagina-carregada')

    const links = document.querySelectorAll('a[href]')

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                return
            }

            const href = link.getAttribute('href')

            if (!href) return

            const url = new URL(href, window.location.href)

            const linkExterno = url.hostname !== window.location.hostname
            const mesmaPaginaComAncora = url.pathname === window.location.pathname && url.hash
            const ancora = href.startsWith('#')
            const javascriptLink = href.startsWith('javascript:')
            const mailOuTelefone = href.startsWith('mailto:') || href.startsWith('tel:')
            const novaAba = link.target === '_blank'
            const download = link.hasAttribute('download')
            const semTransicao = link.closest('[data-no-transition]')

            if (
                linkExterno ||
                mesmaPaginaComAncora ||
                ancora ||
                javascriptLink ||
                mailOuTelefone ||
                novaAba ||
                download ||
                semTransicao
            ) {
                return
            }

            event.preventDefault()

            document.body.classList.remove('pagina-carregada')
            document.body.classList.add('pagina-saindo')

            setTimeout(() => {
                window.location.href = url.href
            }, 280)
        })
    })
})