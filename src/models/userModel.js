export const createUser = ({ nome, email, senha }) => ({
  id: Date.now(),
  nome,
  email,
  senha,
  dataCadastro: new Date().toISOString(),
});
