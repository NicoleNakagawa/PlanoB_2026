/**
 * PlanoB — validacoes.js
 * Validação client-side para: cadastroaluno, cadastroprofessor, loginaluno, loginprofessor
 */

document.addEventListener("DOMContentLoaded", () => {
  /* ─── Botões de mostrar/ocultar senha ─────────────────────────────────── */
  document.querySelectorAll("button[aria-label='Mostrar ou ocultar senha']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrapper = btn.closest("label");
      const input = wrapper?.querySelector("input[type='password'], input[type='text']");
      const icon = btn.querySelector(".material-symbols-outlined");

      if (!input) return;

      const escondendo = input.type === "password";
      input.type = escondendo ? "text" : "password";
      if (icon) icon.textContent = escondendo ? "visibility_off" : "visibility";
    });
  });

  /* ─── Formulário atual ─────────────────────────────────────────────────── */
  const form = document.querySelector("form[data-form]");
  if (!form) return;

  const tipoFormulario = form.dataset.form;

  const regras = {
    cadastroaluno:    ["name", "email", "password", "terms"],
    cadastroprofessor:["name", "email", "cref", "password", "confirm-password", "terms"],
    loginaluno:       ["email", "password"],
    loginprofessor:   ["email", "password"],
  };

  const campos = regras[tipoFormulario];
  if (!campos) return;

  /* ─── Validação ao sair do campo (blur) ────────────────────────────────── */
  campos.forEach((nome) => {
    const input = form.querySelector(`[name="${nome}"]`);
    if (!input || input.type === "checkbox") return;

    input.addEventListener("blur", () => {
      const erro = validarCampo(nome, input);
      if (erro) mostrarErro(input, erro);
      else removerErro(input);
    });

    input.addEventListener("input", () => removerErro(input));
    input.addEventListener("change", () => removerErro(input));
  });

  /* ─── Validação no submit ──────────────────────────────────────────────── */
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    limparErros();

    let valido = true;
    let primeiroErro = null;

    campos.forEach((nome) => {
      const input = form.querySelector(`[name="${nome}"]`);
      if (!input) return;

      const erro = validarCampo(nome, input);
      if (erro) {
        mostrarErro(input, erro);
        valido = false;
        if (!primeiroErro) primeiroErro = input;
      }
    });

    if (!valido) {
      primeiroErro?.scrollIntoView({ behavior: "smooth", block: "center" });
      primeiroErro?.focus();
      return;
    }

    form.submit();
  });

  /* ─── Lógica de validação por campo ───────────────────────────────────── */
  function validarCampo(nome, input) {
    const valor = input.value.trim();

    switch (nome) {
      case "name":
        if (!valor) return "O nome é obrigatório.";
        if (valor.length < 3) return "Digite seu nome completo (mínimo 3 caracteres).";
        if (!/\s/.test(valor)) return "Por favor, informe seu nome e sobrenome.";
        return null;

      case "email":
        if (!valor) return "O e-mail é obrigatório.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor))
          return "Digite um e-mail válido. Exemplo: nome@email.com";
        return null;

      case "cref":
        if (!valor) return "O CREF é obrigatório.";
        // Formato: 000000-G/XX  (6 dígitos, traço, letra, barra, 2 letras de estado)
        if (!/^\d{6}-[A-Za-z]\/[A-Za-z]{2}$/.test(valor))
          return "CREF inválido. Use o formato: 000000-G/SP";
        return null;

      case "password": {
        if (!valor) return "A senha é obrigatória.";
        if (tipoFormulario.includes("cadastro")) {
          return validarForcaSenha(valor);
        }
        return null;
      }

      case "confirm-password": {
        const senha = form.querySelector('[name="password"]')?.value.trim();
        if (!valor) return "Confirme sua senha.";
        if (valor !== senha) return "As senhas não coincidem.";
        return null;
      }

      case "terms":
        if (!input.checked) return "Você precisa aceitar os Termos de Uso.";
        return null;

      default:
        return null;
    }
  }

  /* ─── Força da senha ───────────────────────────────────────────────────── */
  function validarForcaSenha(senha) {
    if (senha.length < 8)          return "A senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Z]/.test(senha))      return "Inclua pelo menos uma letra maiúscula.";
    if (!/[a-z]/.test(senha))      return "Inclua pelo menos uma letra minúscula.";
    if (!/[0-9]/.test(senha))      return "Inclua pelo menos um número.";
    return null;
  }

  /* ─── UI: exibir erro ──────────────────────────────────────────────────── */
  function mostrarErro(input, mensagem) {
    removerErro(input);

    // Destaque visual no input
    input.classList.add("ring-2", "ring-error", "bg-red-50");
    input.classList.remove("focus:ring-primary", "focus:bg-surface-container-lowest");

    // Container onde a mensagem vai ser inserida
    // Para checkboxes, sobe até fieldset; para inputs comuns, usa o fieldset pai
    const container = input.closest("fieldset") ?? input.parentElement;

    const msg = document.createElement("p");
    msg.className = "mensagem-erro flex items-center gap-1 mt-2 ml-1 text-sm font-bold text-error";
    msg.setAttribute("role", "alert");
    msg.innerHTML = `
      <span class="material-symbols-outlined text-base not-italic" aria-hidden="true">error</span>
      ${mensagem}
    `;

    container.appendChild(msg);
  }

  /* ─── UI: remover erro ─────────────────────────────────────────────────── */
  function removerErro(input) {
    input.classList.remove("ring-2", "ring-error", "bg-red-50");
    input.classList.add("focus:ring-primary", "focus:bg-surface-container-lowest");

    const container = input.closest("fieldset") ?? input.parentElement;
    container?.querySelector(".mensagem-erro")?.remove();
  }

  /* ─── UI: limpar todos os erros ────────────────────────────────────────── */
  function limparErros() {
    form.querySelectorAll(".mensagem-erro").forEach((el) => el.remove());
    form.querySelectorAll("input").forEach((input) => {
      input.classList.remove("ring-2", "ring-error", "bg-red-50");
    });
  }
});