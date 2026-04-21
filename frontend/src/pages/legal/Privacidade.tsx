import LegalLayout from './LegalLayout';

export default function Privacidade() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="21/04/2026">
      <p>
        Esta Política de Privacidade descreve como a <strong>57.842.141 LTDA</strong>, nome fantasia
        <strong> Digital Boost</strong>, inscrita no CNPJ nº 57.842.141/0001-79, com sede na Rua Marcos Albino, 300,
        Itajaí/SC, CEP 88.318-080 ("Digital Boost", "nós"), coleta, utiliza, armazena, compartilha e protege os dados
        pessoais dos usuários da plataforma <strong>AppexCRM</strong> ("Plataforma"), em conformidade com a
        <strong> Lei nº 13.709/2018</strong> (Lei Geral de Proteção de Dados Pessoais – LGPD).
      </p>

      <h2>1. Controlador e Encarregado (DPO)</h2>
      <p>
        A Digital Boost é a <strong>Controladora</strong> dos dados pessoais coletados diretamente dos usuários da
        Plataforma (cadastro, cobrança, suporte). Quando o Cliente insere dados de seus próprios clientes ou contatos
        dentro do workspace, a Digital Boost atua como <strong>Operadora</strong> desses dados, seguindo as instruções
        do Cliente, que é o Controlador daqueles dados.
      </p>
      <p>
        <strong>Encarregado de Proteção de Dados (DPO):</strong>{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>.
      </p>

      <h2>2. Dados que coletamos</h2>

      <h3>2.1. Dados de cadastro e conta</h3>
      <ul>
        <li>Nome completo, e-mail, telefone (opcional);</li>
        <li>Senha (armazenada com hash criptográfico, nunca em texto puro);</li>
        <li>Nome do workspace, razão social e CNPJ (quando informados).</li>
      </ul>

      <h3>2.2. Dados de cobrança</h3>
      <p>
        Dados financeiros (cartão de crédito, CPF/CNPJ para nota fiscal, endereço de cobrança) são coletados e
        processados diretamente pela <strong>Stripe Payments Brasil Instituição de Pagamento Ltda.</strong>, nossa
        processadora certificada PCI-DSS. A Digital Boost <strong>não armazena dados de cartão</strong>, apenas
        recebe da Stripe um identificador de cliente/assinatura.
      </p>

      <h3>2.3. Dados de uso e técnicos</h3>
      <ul>
        <li>Logs de acesso (IP, data/hora, user agent);</li>
        <li>Páginas visitadas, ações realizadas dentro do produto (para métricas internas e suporte);</li>
        <li>Cookies essenciais de sessão.</li>
      </ul>

      <h3>2.4. Dados inseridos pelo Cliente no workspace</h3>
      <p>
        Dados de leads, clientes, mensagens, notas, tarefas e anexos adicionados ao workspace pelo Cliente. Esses
        dados são tratados pela Digital Boost como Operadora, e o Cliente é responsável por obter as bases legais
        adequadas para coletá-los e processá-los.
      </p>

      <h2>3. Bases legais</h2>
      <p>Utilizamos as seguintes bases legais (art. 7º da LGPD):</p>
      <ul>
        <li><strong>Execução de contrato:</strong> para criar a conta, operar o serviço e processar cobranças;</li>
        <li><strong>Cumprimento de obrigação legal:</strong> para guardar registros fiscais e logs de acesso (Marco Civil da Internet);</li>
        <li><strong>Legítimo interesse:</strong> para prevenir fraudes, melhorar a Plataforma e realizar comunicações transacionais;</li>
        <li><strong>Consentimento:</strong> para comunicações de marketing opcionais, solicitado de forma específica.</li>
      </ul>

      <h2>4. Como utilizamos os dados</h2>
      <ul>
        <li>Criar e manter sua conta e workspace;</li>
        <li>Processar pagamentos e emitir comprovantes;</li>
        <li>Fornecer suporte técnico e responder solicitações;</li>
        <li>Enviar comunicados transacionais (faturas, alertas de segurança, avisos de serviço);</li>
        <li>Detectar e prevenir fraudes, abusos e violações aos Termos de Uso;</li>
        <li>Aprimorar a Plataforma com base em métricas agregadas de uso.</li>
      </ul>

      <h2>5. Compartilhamento com terceiros</h2>
      <p>
        Compartilhamos dados apenas com processadores que auxiliam a operação da Plataforma, nos limites necessários
        e sob contratos que exigem conformidade com a LGPD:
      </p>
      <ul>
        <li><strong>Stripe</strong> — processamento de pagamentos;</li>
        <li><strong>Provedores de infraestrutura em nuvem</strong> — hospedagem, banco de dados e e-mail transacional;</li>
        <li><strong>WhatsApp / Meta / Google</strong> — quando o Cliente conecta integrações oficiais destes serviços.</li>
      </ul>
      <p>
        A Digital Boost <strong>não vende</strong> dados pessoais a terceiros. Pode haver compartilhamento mediante
        ordem judicial ou exigência de autoridade competente.
      </p>

      <h2>6. Transferência internacional</h2>
      <p>
        Alguns de nossos processadores (como a Stripe e provedores de nuvem) podem armazenar dados em servidores
        localizados fora do Brasil. Garantimos que essas transferências sejam feitas para países com nível adequado
        de proteção ou mediante cláusulas contratuais específicas, conforme art. 33 da LGPD.
      </p>

      <h2>7. Retenção de dados</h2>
      <p>
        Os dados da conta e do workspace são mantidos enquanto a assinatura estiver ativa. Após o cancelamento
        ou expiração, os dados permanecem disponíveis por <strong>30 (trinta) dias</strong> para reativação.
        Decorrido este prazo, os dados são apagados de forma definitiva de nossos sistemas de produção, exceto:
      </p>
      <ul>
        <li>Registros fiscais e contábeis, mantidos pelos prazos exigidos pela legislação (geralmente 5 anos);</li>
        <li>Logs de acesso, mantidos por 6 meses (art. 15 do Marco Civil da Internet);</li>
        <li>Dados anonimizados, que podem ser mantidos para fins estatísticos.</li>
      </ul>

      <h2>8. Direitos do titular</h2>
      <p>Nos termos do art. 18 da LGPD, você pode solicitar a qualquer momento:</p>
      <ul>
        <li>Confirmação da existência de tratamento e acesso aos dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade dos dados para outro fornecedor;</li>
        <li>Eliminação dos dados tratados com base em consentimento;</li>
        <li>Informação sobre os compartilhamentos realizados;</li>
        <li>Revogação do consentimento.</li>
      </ul>
      <p>
        Para exercer qualquer desses direitos, envie um e-mail para{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>. Responderemos em até 15 (quinze) dias.
      </p>

      <h2>9. Segurança</h2>
      <p>
        Adotamos medidas técnicas e administrativas razoáveis para proteger os dados contra acessos não autorizados,
        destruição, perda, alteração ou divulgação indevida, incluindo: criptografia em trânsito (HTTPS/TLS),
        criptografia de senhas com hash, controles de acesso, isolamento multi-tenant por workspace e backups
        periódicos.
      </p>
      <p>
        Em caso de incidente de segurança que possa acarretar risco relevante aos titulares, comunicaremos os
        afetados e a ANPD nos prazos exigidos pela LGPD.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Utilizamos cookies estritamente necessários para autenticação e funcionamento da sessão. Não utilizamos
        cookies de publicidade comportamental. O Cliente pode bloquear cookies nas configurações de seu navegador,
        o que pode comprometer funcionalidades da Plataforma.
      </p>

      <h2>11. Alterações desta Política</h2>
      <p>
        Esta Política pode ser atualizada. A data da "Última atualização" é informada no topo deste documento.
        Alterações relevantes serão comunicadas por e-mail ou dentro da Plataforma.
      </p>

      <h2>12. Contato</h2>
      <p>
        Para qualquer solicitação relacionada a dados pessoais, entre em contato com nosso Encarregado:{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>.
      </p>
      <p>
        Caso não obtenha resposta satisfatória, você pode apresentar reclamação à{' '}
        <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>.
      </p>
    </LegalLayout>
  );
}
