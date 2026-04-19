import OptionsListTab from './OptionsListTab';
import {
  listCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  type CustomerCategory,
} from '@/api/customer-categories';

export default function CategoriasClientesTab() {
  return (
    <OptionsListTab<CustomerCategory>
      title="Categorias de clientes"
      subtitle="Configure as categorias para organizar melhor os contatos de sua empresa."
      queryKey={['customer-categories']}
      list={listCustomerCategories}
      create={createCustomerCategory}
      update={updateCustomerCategory}
      remove={deleteCustomerCategory}
      nameOf={(x) => x.name}
      addModalTitle="Adicionar categorias"
      addModalHint="Insira os nomes separados por vírgula, como no exemplo: Cliente efetivo, Cliente em potencial, Fornecedor."
      confirmDeleteMessage={(n) => `Excluir a categoria "${n}"?`}
    />
  );
}
