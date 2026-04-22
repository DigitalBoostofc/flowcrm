import OptionsListTab from './OptionsListTab';
import {
  listLossReasons,
  createLossReason,
  updateLossReason,
  deleteLossReason,
  type LossReason,
} from '@/api/loss-reasons';

export default function MotivosPerdaTab() {
  return (
    <OptionsListTab<LossReason>
      title="Motivos de perda"
      subtitle="Configure os motivos de perda para classificar negócios não fechados e entender melhor onde seu processo comercial pode ser aprimorado."
      queryKey={['loss-reasons']}
      list={listLossReasons}
      create={createLossReason}
      update={updateLossReason}
      remove={deleteLossReason}
      nameOf={(r) => r.label}
      addModalTitle="Adicionar motivos de perda"
      addModalHint="Insira os nomes separados por vírgula, como no exemplo: Preço, Concorrente, Sem interesse."
      confirmDeleteMessage={(n) => `Excluir o motivo "${n}"?`}
    />
  );
}
