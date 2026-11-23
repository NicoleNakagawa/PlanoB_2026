# PlanoB 2026 

Plataforma web de treinamento físico personalizado, conectando alunos e professores com planos de assinatura, vídeos, fichas de treino e acompanhamento de progresso.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Template Engine | EJS |
| Banco de Dados | MySQL 8.x |
| ORM/Driver | mysql2 (pool com Promises) |
| Autenticação | express-session + bcrypt |
| Config | dotenv |

---

## Estrutura do Projeto

```
PlanoB_2026/
├── app/
│   ├── public/
│   │   ├── css/          # Estilos por página
│   │   ├── js/           # Validações front-end
│   │   ├── fonts/        # Fontes locais
│   │   └── img/          # Imagens estáticas
│   ├── routes/
│   │   └── router.js     # Todas as rotas (aluno, professor, admin)
│   └── views/
│       └── pages/        # Templates EJS
├── config/
│   ├── pool_conexoes.js  # Pool de conexões MySQL
│   └── script_bd.sql     # Script de criação do banco
├── app.js                # Entry point
├── package.json
├── .env                  # Variáveis de ambiente (não versionar!)
└── .gitignore
```

---

## Configuração e Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [MySQL](https://dev.mysql.com/downloads/) 8.x

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/PlanoB_2026.git
cd PlanoB_2026
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no exemplo abaixo:

```env
PORT=3000
SESSION_SECRET=sua-chave-secreta-aqui

DB_HOST=localhost
DB_USER=planob_user
DB_PASSWORD=sua_senha_aqui
DB_NAME=planob
DB_PORT=3306
```

### 4. Configure o banco de dados

Acesse o MySQL e execute o script de criação:

```bash
mysql -u root -p < config/script_bd.sql
```

Ou via MySQL Workbench: abra `config/script_bd.sql` e execute.

Crie também o usuário do banco (opcional, mas recomendado):

```sql
CREATE USER 'planob_user'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON planob.* TO 'planob_user'@'localhost';
FLUSH PRIVILEGES;
```

### 5. Inicie o servidor

```bash
# Produção
npm start

# Desenvolvimento
npm run dev
```

Acesse em: [http://localhost:3000](http://localhost:3000)

---

## Banco de Dados

O schema completo está em `config/script_bd.sql`. As principais tabelas são:

| Tabela | Descrição |
|--------|-----------|
| `plano` | Planos disponíveis: Gratuito, Lazuli (R$59), Diamante (R$149) |
| `aluno` | Cadastro de alunos com endereço e plano vinculado |
| `professor` | Cadastro de professores com CREF |
| `assinatura` | Histórico e status de assinaturas dos alunos |
| `video` | Vídeos de treino (free e premium) |
| `exercicio` / `ficha` | Fichas de treino personalizadas |
| `feedback` | Canal de comunicação aluno ↔ professor |
| `progresso_semanal` | Registro semanal de evolução do aluno |

---

## Autenticação

- Senhas armazenadas com hash **bcrypt** (12 rounds)
- Sessões gerenciadas via `express-session`
- Rotas protegidas por middlewares `authAluno` e `authProfessor`

---

## Rotas Principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/home` | Página inicial |
| GET | `/planos` | Listagem de planos |
| GET/POST | `/cadastroaluno` | Cadastro de aluno |
| GET/POST | `/loginaluno` | Login de aluno |
| GET/POST | `/cadastroprofessor` | Cadastro de professor |
| GET/POST | `/loginprofessor` | Login de professor |
| GET | `/painelfree` | Painel do aluno (protegido) |
| GET | `/painelprofessor` | Painel do professor (protegido) |
| GET | `/videos` | Biblioteca de vídeos (protegido) |
| GET | `/progressosemanal` | Progresso semanal (protegido) |
| POST | `/pagamento` | Processamento de assinatura |

---

## Deploy com banco MySQL na nuvem

Para rodar em produção com banco remoto (ex: [Railway](https://railway.app), [PlanetScale](https://planetscale.com), [Clever Cloud](https://www.clever-cloud.com)):

1. Crie um banco MySQL no serviço escolhido
2. Execute o `script_bd.sql` no banco remoto
3. Atualize as variáveis de ambiente com os dados de conexão fornecidos pelo serviço:

```env
DB_HOST=seu-host-remoto.railway.app
DB_USER=root
DB_PASSWORD=senha-gerada
DB_NAME=railway
DB_PORT=3306
```

---

## Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.


/*IGNORE*/
sudo service mysql start

---

## Variáveis de ambiente novas

Veja `.env.example` para a lista completa.

| Variável | Para que serve |
|----------|----------------|
| `APP_URL` | Endereço público do site, usado no link do e-mail de recuperação de senha |
| `WHATSAPP_SUPORTE` | Número do WhatsApp do suporte (só dígitos, com DDI). Vazio = o botão some |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envio de e-mail. Sem `SMTP_HOST`, o link de recuperação aparece só no terminal |

## Sessões e tabelas automáticas

O login fica salvo no MySQL (tabela `sessoes`), então não se perde quando o servidor reinicia.
As tabelas `sessoes` e `redefinicao_senha` são criadas sozinhas ao iniciar o servidor.

Depois de atualizar o código, rode `npm install` (nova dependência: `nodemailer`).

## Vídeos demonstrativos

Para os vídeos do plano gratuito tocarem, preencha o campo `videoUrl` de cada item em
`app/data/videosFree.js` com um link do YouTube (de preferência "não listado") ou com um
arquivo em `/uploads/videos/...`. Enquanto estiver vazio, a tela mostra "Vídeo em breve".

---

## E-mail de recuperação de senha (Gmail)

Sem configurar, o link de recuperação aparece só no terminal. Para enviar de verdade:

1. Na conta Google, ative a verificação em duas etapas e crie uma **senha de app** (Conta Google > Segurança > Senhas de app).
2. No `.env`:
   ```
   APP_URL=https://seu-site.onrender.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=a-senha-de-app-de-16-letras
   SMTP_FROM="PlanoB <seu-email@gmail.com>"
   ```
3. No Render, coloque as mesmas variáveis em Environment. Reinicie o servidor.

`APP_URL` precisa ser o endereço público do site, senão o link do e-mail sai errado (por exemplo `https://localhost:3000`).

## Mercado Pago (modo demonstração, sem cobrança real)

O checkout tem o botão **Pagar com Mercado Pago** quando existe `MP_ACCESS_TOKEN` no `.env`.
Sem a variável, o botão não aparece e só o formulário simulado funciona.

1. Em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers), crie uma aplicação (Checkout Pro).
2. Em **Suas integrações > Contas de teste**, crie duas contas de teste: **vendedor** e **comprador**.
3. Entre com a conta de teste **vendedora**, crie uma aplicação e copie o **Access Token** dela.
4. No `.env`:
   ```
   MP_ACCESS_TOKEN=access-token-da-conta-de-teste-vendedora
   APP_URL=https://seu-site.onrender.com
   MODO_DEMONSTRACAO=true
   ```
5. Na apresentação, use uma janela anônima, entre no Mercado Pago com a conta de teste **compradora** e pague com um cartão de teste (veja **Suas integrações > Cartões de teste**; para aprovar, o nome do titular é `APRO`).

Importante:
- Use **sempre** o token da conta de teste. Com o token da sua conta real, o pagamento é cobrado de verdade.
- O plano só muda depois que o servidor confirma o pagamento na API do Mercado Pago (status aprovado, valor e referência conferem).
- Para o Mercado Pago voltar sozinho ao site depois de pagar, `APP_URL` precisa ser `https://`. Em `http://localhost`, ele mostra um botão "Voltar ao site".
- `MODO_DEMONSTRACAO=false` esconde o aviso "Ambiente de demonstração" do checkout.
