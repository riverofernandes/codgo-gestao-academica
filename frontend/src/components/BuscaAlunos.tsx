interface Props {
  valor: string;
  onChange: (valor: string) => void;
}

export function BuscaAlunos({ valor, onChange }: Props) {
  return (
    <div className="busca">
      <label htmlFor="busca-alunos" className="rotulo">
        Buscar aluno
      </label>
      <div className="busca__campo">
        <input
          id="busca-alunos"
          type="search"
          className="campo"
          placeholder="Nome ou matrícula"
          value={valor}
          maxLength={100}
          autoComplete="off"
          aria-describedby="busca-alunos-dica"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && valor) {
              e.preventDefault();
              onChange('');
            }
          }}
        />
        {valor && (
          <button
            type="button"
            className="busca__limpar"
            aria-label="Limpar busca"
            onClick={() => onChange('')}
          >
            ×
          </button>
        )}
      </div>
      <p id="busca-alunos-dica" className="dica">
        Busca por nome (ignora acentos e maiúsculas) ou número de matrícula.
      </p>
    </div>
  );
}
