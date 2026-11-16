// Detecta automaticamente se está no servidor Node (porta 3000 / Render)
// ou em preview local (Live Server em qualquer porta ou file://)
const isLocalPreview =
  window.location.protocol === 'file:' ||
  ((window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3000');

const API_URL = isLocalPreview
  ? 'http://localhost:3000/usuarios'
  : '/usuarios';

const TIKTOK_PERFIL = 'https://www.tiktok.com/@kailtern?_r=1&_t=ZS-9BLgYPKRw1Q';
const STORAGE_USUARIOS_FALLBACK = 'terFanbaseUsuariosBackup';

// Usuários padrão garantidos mesmo se o servidor Node estiver desligado
const USUARIOS_PADRAO = [
  {
    id: '1',
    nome: 'Administrador',
    sobrenome: 'Sistema',
    cpf: '000.000.000-00',
    email: 'admin@Kailtern.com',
    senha: 'TER',
    rua: 'Av. Central, 1000',
    cep: '01000-000',
    cidade: 'São Paulo',
    estado: 'SP',
    telefone: '(11) 99999-9999',
    perfil: 'admin',
    categoria: 'admin'
  },
  {
    id: '2',
    nome: 'Maria',
    sobrenome: 'Silva',
    cpf: '123.456.789-00',
    email: 'maria@email.com',
    senha: '123',
    rua: 'Rua das Flores, 123',
    cep: '02000-000',
    cidade: 'Campinas',
    estado: 'SP',
    telefone: '(19) 98888-7777',
    perfil: 'user',
    categoria: 'usuario'
  }
];

function ehAdmin(usuario) {
  if (!usuario) return false;
  const email = (usuario.email || '').trim().toLowerCase();
  return (
    email === 'admin@kailtern.com' ||
    usuario.categoria === 'admin' ||
    usuario.perfil === 'admin'
  );
}

function obterUsuariosBackup() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USUARIOS_FALLBACK) || '[]');
  } catch {
    return [];
  }
}

function salvarUsuariosBackup(lista) {
  localStorage.setItem(STORAGE_USUARIOS_FALLBACK, JSON.stringify(lista));
}

async function obterTodosUsuarios() {
  let listaApi = [];
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      listaApi = await response.json();
    }
  } catch (error) {
    console.warn('API offline, usando lista local + usuários padrão.');
  }

  const combinados = [...listaApi];

  // Garante que os usuários padrão (incluindo o Admin) sempre existam
  USUARIOS_PADRAO.forEach((padrao) => {
    const jaExiste = combinados.some(
      (u) => (u.email || '').trim().toLowerCase() === padrao.email.toLowerCase()
    );
    if (!jaExiste) combinados.push(padrao);
  });

  // Mescla cadastros feitos localmente quando o servidor estava offline
  obterUsuariosBackup().forEach((localUser) => {
    const jaExiste = combinados.some(
      (u) => (u.email || '').trim().toLowerCase() === (localUser.email || '').trim().toLowerCase()
    );
    if (!jaExiste) combinados.push(localUser);
  });

  return combinados;
}

// ==========================================================================
// 1. PÁGINA DE LOGIN (GET)
// ==========================================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();

    const usuarios = await obterTodosUsuarios();

    const usuarioEncontrado = usuarios.find(
      (u) =>
        (u.email || '').trim().toLowerCase() === email.toLowerCase() &&
        (u.senha || '').trim() === senha
    );

    if (usuarioEncontrado) {
      localStorage.setItem('usuarioLogado', JSON.stringify(usuarioEncontrado));
      alert(`Login efetuado com sucesso! Bem-vindo(a) à Ter Fanbase, ${usuarioEncontrado.nome}.`);
      window.location.href = ehAdmin(usuarioEncontrado) ? 'admin.html' : 'boas_vindas.html';
    } else {
      alert('E-mail ou senha incorretos.');
    }
  });
}

// ==========================================================================
// 2. PÁGINA DE CADASTRO (POST)
// ==========================================================================
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
  cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = cadastroForm.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn ? submitBtn.textContent : 'Finalizar Cadastro';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Cadastrando...';
    }

    const novoUsuario = {
      nome: document.getElementById('nome').value.trim(),
      sobrenome: document.getElementById('sobrenome').value.trim(),
      cpf: document.getElementById('cpf').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      email: document.getElementById('email').value.trim(),
      senha: document.getElementById('senha').value.trim(),
      cep: document.getElementById('cep').value.trim(),
      rua: document.getElementById('rua').value.trim(),
      cidade: document.getElementById('cidade').value.trim(),
      estado: document.getElementById('estado').value.trim().toUpperCase(),
      perfil: 'user',
      categoria: document.getElementById('categoria')?.value.trim() || 'usuario'
    };

    try {
      const existentes = await obterTodosUsuarios();
      const jaExiste = existentes.some(
        (u) => (u.email || '').trim().toLowerCase() === novoUsuario.email.toLowerCase()
      );
      if (jaExiste) {
        alert('Este e-mail já está cadastrado! Tente fazer login.');
        return;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoUsuario)
      });

      if (response.ok) {
        alert('Cadastro realizado com sucesso! Faça login para entrar na Ter Fanbase.');
        window.location.href = 'index.html';
        return;
      }
      throw new Error(`Erro HTTP ${response.status}`);
    } catch (error) {
      console.warn('Falha ao salvar na API, salvando localmente:', error);
      const backups = obterUsuariosBackup();
      novoUsuario.id = 'local_' + Date.now();
      backups.push(novoUsuario);
      salvarUsuariosBackup(backups);

      alert('Cadastro realizado com sucesso! Faça login para entrar na Ter Fanbase.');
      window.location.href = 'index.html';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = textoOriginal;
      }
    }
  });
}

// ==========================================================================
// 3. PÁGINA ADMIN (GET, PUT, DELETE, BUSCA CPF)
// ==========================================================================
function verificarAcessoAdmin() {
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!usuarioLogado) {
    alert('Você precisa fazer login para acessar esta página!');
    window.location.href = 'index.html';
    return;
  }
  if (!ehAdmin(usuarioLogado)) {
    alert('Acesso restrito para administradores da Ter Fanbase.');
    window.location.href = 'boas_vindas.html';
  }
}

async function carregarUsuarios() {
  const tabela = document.getElementById('tabelaUsuarios');
  if (!tabela) return;
  const usuarios = await obterTodosUsuarios();
  renderizarTabela(usuarios);
}

function renderizarTabela(usuarios) {
  const tabela = document.getElementById('tabelaUsuarios');
  if (!tabela) return;
  tabela.innerHTML = '';

  if (usuarios.length === 0) {
    tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum fã encontrado.</td></tr>';
    return;
  }

  usuarios.forEach((user) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.nome} ${user.sobrenome}</td>
      <td>${user.cpf}</td>
      <td>${user.email}</td>
      <td>${user.cidade}/${user.estado}</td>
      <td>${user.telefone}</td>
      <td class="actions-cell">
        <button class="btn-warning" onclick="abrirEdicao('${user.id}')">Editar</button>
        <button class="btn-danger" onclick="deletarUsuario('${user.id}')">Excluir</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

async function buscarPorCpf() {
  const cpfBusca = document.getElementById('searchCpf').value.trim();
  if (!cpfBusca) return carregarUsuarios();
  const todos = await obterTodosUsuarios();
  const filtrados = todos.filter((u) => (u.cpf || '').includes(cpfBusca));
  renderizarTabela(filtrados);
}

async function abrirEdicao(id) {
  try {
    const todos = await obterTodosUsuarios();
    const user = todos.find((u) => String(u.id) === String(id));
    if (!user) throw new Error('Usuário não encontrado');

    document.getElementById('editId').value = user.id;
    document.getElementById('editNome').value = user.nome;
    document.getElementById('editSobrenome').value = user.sobrenome;
    document.getElementById('editCpf').value = user.cpf;
    document.getElementById('editTelefone').value = user.telefone;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editSenha').value = user.senha;
    document.getElementById('editCep').value = user.cep;
    document.getElementById('editRua').value = user.rua;
    document.getElementById('editCidade').value = user.cidade;
    document.getElementById('editEstado').value = user.estado;

    const form = document.getElementById('editForm');
    if (form) {
      form.dataset.categoria = user.categoria || 'usuario';
      form.dataset.perfil = user.perfil || 'user';
    }

    const editCard = document.getElementById('editCard');
    editCard.style.display = 'block';
    editCard.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    alert('Erro ao carregar dados do usuário.');
  }
}

function fecharEdicao() {
  const editCard = document.getElementById('editCard');
  if (editCard) editCard.style.display = 'none';
}

const editForm = document.getElementById('editForm');
if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const usuarioAtualizado = {
      nome: document.getElementById('editNome').value.trim(),
      sobrenome: document.getElementById('editSobrenome').value.trim(),
      cpf: document.getElementById('editCpf').value.trim(),
      telefone: document.getElementById('editTelefone').value.trim(),
      email: document.getElementById('editEmail').value.trim(),
      senha: document.getElementById('editSenha').value.trim(),
      cep: document.getElementById('editCep').value.trim(),
      rua: document.getElementById('editRua').value.trim(),
      cidade: document.getElementById('editCidade').value.trim(),
      estado: document.getElementById('editEstado').value.trim().toUpperCase(),
      perfil: editForm.dataset.perfil || 'user',
      categoria: document.getElementById('editCategoria')?.value.trim() || editForm.dataset.categoria || 'usuario'
    };

    try {
      if (String(id).startsWith('local_')) {
        const backups = obterUsuariosBackup().map((u) =>
          String(u.id) === String(id) ? { ...usuarioAtualizado, id } : u
        );
        salvarUsuariosBackup(backups);
        alert('Dados atualizados com sucesso!');
        fecharEdicao();
        carregarUsuarios();
        return;
      }

      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioAtualizado)
      });
      if (response.ok) {
        alert('Dados atualizados com sucesso!');
        fecharEdicao();
        carregarUsuarios();
      }
    } catch (error) {
      alert('Erro ao atualizar usuário.');
    }
  });
}

async function deletarUsuario(id) {
  if (confirm('Tem certeza que deseja excluir este cadastro?')) {
    try {
      if (String(id).startsWith('local_')) {
        const backups = obterUsuariosBackup().filter((u) => String(u.id) !== String(id));
        salvarUsuariosBackup(backups);
        alert('Cadastro excluído!');
        carregarUsuarios();
        return;
      }

      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Cadastro excluído!');
        carregarUsuarios();
      }
    } catch (error) {
      alert('Erro ao excluir usuário.');
    }
  }
}

// ==========================================================================
// 4. FUNÇÕES DA FANBASE (VÍDEOS, NAV & LOGOUT)
// ==========================================================================
function assistirVideo(titulo, url = TIKTOK_PERFIL) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function fazerLogout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  const navAdminLink = document.getElementById('navAdminLink');
  if (navAdminLink && !ehAdmin(user)) {
    navAdminLink.style.display = 'none';
  }
});