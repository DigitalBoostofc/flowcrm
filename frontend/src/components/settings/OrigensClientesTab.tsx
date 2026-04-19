import OptionsListTab from './OptionsListTab';
import {
  listCustomerOrigins,
  createCustomerOrigin,
  updateCustomerOrigin,
  deleteCustomerOrigin,
  type CustomerOrigin,
} from '@/api/customer-origins';

export default function OrigensClientesTab() {
  return (
    <OptionsListTab<CustomerOrigin>
      title="Origens de clientes"
      subtitle="Configure as origens para identificar como seus contatos chegaram até você."
      queryKey={['customer-origins']}
      list={listCustomerOrigins}
      create={createCustomerOrigin}
      update={updateCustomerOrigin}
      remove={deleteCustomerOrigin}
      nameOf={(x) => x.name}
      addModalTitle="Adicionar origens de clientes"
      addModalHint="Insira os nomes separados por vírgula, como no exemplo: Indicação, Evento, Site."
      confirmDeleteMessage={(n) => `Excluir a origem "${n}"?`}
    />
  );
}
