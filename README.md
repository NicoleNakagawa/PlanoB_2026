# PlanoB 2026 🏋️

Plataforma web de treinamento físico personalizado, conectando alunos e professores com planos de assinatura, vídeos, fichas de treino e acompanhamento de progresso.

---

## 🚀 Tecnologias

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

## 📁 Estrutura do Projeto

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

## ⚙️ Configuração e Instalação

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

> ⚠️ **Nunca suba o arquivo `.env` para o GitHub.** Ele já está listado no `.gitignore`.

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

## 🗄️ Banco de Dados

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

## 🔐 Autenticação

- Senhas armazenadas com hash **bcrypt** (12 rounds)
- Sessões gerenciadas via `express-session`
- Rotas protegidas por middlewares `authAluno` e `authProfessor`

---

## 🌐 Rotas Principais

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

## ☁️ Deploy com banco MySQL na nuvem

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

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
