document.addEventListener("DOMContentLoaded", () => {
  console.log("Arquivo validacoes.js carregou!");

  const form = document.querySelector("form[data-form]");

  if (!form) {
    console.log("Nenhum form com data-form foi encontrado.");
    return;
  }

  console.log("Formulário encontrado:", form.dataset.form);

  const tipoFormulario = form.dataset.form;

  const regras = {
    cadastroaluno: ["name", "email", "password", "terms"],
    cadastroprofessor: ["name", "email", "cref", "password", "confirm-password", "terms"],
    loginaluno: ["email", "password"],
    loginprofessor: ["email", "password"]
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    limparErros();

    let valido = true;

    const campos = regras[tipoFormulario];

    if (!campos) {
      console.log("Tipo de formulário inválido:", tipoFormulario);
      return;
    }

    campos.forEach((campo) => {
      const input = form.querySelector(`[name="${campo}"]`);

      if (!input) {
        console.log("Campo não encontrado:", campo);
        valido = false;
        return;
      }

      const valor = input.value.trim();

      if (campo === "name") {
        if (valor.length < 3) {
          mostrarErro(input, "Digite seu nome completo.");
          valido = false;
        }
      }

      if (campo === "email") {
        if (valor === "") {
          mostrarErro(input, "Digite seu e-mail.");
          valido = false;
        } else if (!validarEmail(valor)) {
          mostrarErro(input, "Digite um e-mail válido. Exemplo: nome@email.com");
          valido = false;
        }
      }

      if (campo === "cref") {
        if (valor.length < 6) {
          mostrarErro(input, "Digite um CREF válido.");
          valido = false;
        }
      }

      if (campo === "password") {
        if (valor === "") {
          mostrarErro(input, "Digite sua senha.");
          valido = false;
        } else if (tipoFormulario.includes("cadastro")) {
          const erroSenha = validarSenha(valor);

          if (erroSenha !== "") {
            mostrarErro(input, erroSenha);
            valido = false;
          }
        }
      }

      if (campo === "confirm-password") {
        const senha = form.querySelector(`[name="password"]`);

        if (valor === "") {
          mostrarErro(input, "Confirme sua senha.");
          valido = false;
        } else if (senha && valor !== senha.value.trim()) {
          mostrarErro(input, "As senhas precisam ser iguais.");
          valido = false;
        }
      }

      if (campo === "terms") {
        if (!input.checked) {
          mostrarErro(input, "Você precisa aceitar os termos.");
          valido = false;
        }
      }
    });

    if (valido) {
      form.submit();
    }
  });

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => removerErro(input));
    input.addEventListener("change", () => removerErro(input));
  });

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validarSenha(senha) {
    if (senha.length < 8) {
      return "A senha precisa ter pelo menos 8 caracteres.";
    }

    if (!/[A-Z]/.test(senha)) {
      return "A senha precisa ter pelo menos uma letra maiúscula.";
    }

    if (!/[a-z]/.test(senha)) {
      return "A senha precisa ter pelo menos uma letra minúscula.";
    }

    if (!/[0-9]/.test(senha)) {
      return "A senha precisa ter pelo menos um número.";
    }

    return "";
  }

  function mostrarErro(input, mensagem) {
    removerErro(input);

    input.classList.add("input-erro");
    input.style.border = "2px solid #dc2626";
    input.style.backgroundColor = "#fef2f2";

    const container = input.closest("fieldset") || input.closest("label") || input.parentElement;

    const erro = document.createElement("p");
    erro.className = "mensagem-erro";
    erro.textContent = mensagem;

    erro.style.color = "#dc2626";
    erro.style.fontSize = "14px";
    erro.style.fontWeight = "700";
    erro.style.marginTop = "8px";
    erro.style.marginLeft = "4px";

    container.appendChild(erro);
  }

  function removerErro(input) {
    input.classList.remove("input-erro");
    input.style.border = "";
    input.style.backgroundColor = "";

    const container = input.closest("fieldset") || input.closest("label") || input.parentElement;

    if (!container) return;

    const erro = container.querySelector(".mensagem-erro");

    if (erro) {
      erro.remove();
    }
  }

  function limparErros() {
    form.querySelectorAll(".mensagem-erro").forEach((erro) => erro.remove());

    form.querySelectorAll(".input-erro").forEach((input) => {
      input.classList.remove("input-erro");
      input.style.border = "";
      input.style.backgroundColor = "";
    });
  }
});