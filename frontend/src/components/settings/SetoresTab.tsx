import OptionsListTab from './OptionsListTab';
import {
  listSectors,
  createSector,
  updateSector,
  deleteSector,
  type Sector,
} from '@/api/sectors';

export default function SetoresTab() {
  return (
    <OptionsListTab<Sector>
      title="Setores"
      subtitle="Configure os setores para categorizar suas empresas."
      queryKey={['sectors']}
      list={listSectors}
      create={createSector}
      update={updateSector}
      remove={deleteSector}
      nameOf={(x) => x.name}
      addModalTitle="Adicionar setores"
      addModalHint="Insira os nomes separados por vírgula, como no exemplo: Comércio Atacadista, Indústria, Prestadora de serviços."
      confirmDeleteMessage={(n) => `Excluir o setor "${n}"?`}
    />
  );
}
