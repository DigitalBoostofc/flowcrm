export default function LossReasonsTab() {
  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-slate-400 text-sm">
        Quando um lead é marcado como <strong className="text-red-400">Perdido</strong>, o sistema pede
        um motivo em texto livre. Defina abaixo os motivos mais comuns da sua operação para
        ter consistência nos relatórios.
      </p>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-200 mb-3">Motivos sugeridos</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'Preço alto',
            'Escolheu concorrente',
            'Sem interesse',
            'Sem orçamento',
            'Prazo incompatível',
            'Não respondeu',
            'Comprou em outra loja',
          ].map((r) => (
            <span key={r} className="px-2.5 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
              {r}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Estes são exemplos. Você pode digitar qualquer motivo ao marcar um lead como perdido.
        </p>
      </div>
    </div>
  );
}
