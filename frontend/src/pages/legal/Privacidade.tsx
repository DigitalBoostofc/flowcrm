import LegalLayout from './LegalLayout';

export default function Privacidade() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="25/04/2026">
      <p>
        Esta Política de Privacidade descreve como a <strong>57.842.141 LTDA</strong>, nome fantasia{' '}
        <strong>Digital Boost</strong>, inscrita no CNPJ nº 57.842.141/0001-79, com sede na Rua Marcos
        Albino, 300, Itajaí/SC, CEP 88.318-080 ("Digital Boost", "nós"), coleta, utiliza, armazena,
        compartilha e protege os dados pessoais dos usuários da plataforma <strong>AppexCRM</strong>{' '}
        ("Plataforma"), em conformidade com a <strong>Lei nº 13.709/2018</strong> (Lei Geral de Proteção
        de Dados Pessoais – LGPD).
      </p>
      <p>
        A Digital Boost valoriza a transparência e a segurança no tratamento dos seus dados. Em caso de
        dúvidas sobre esta Política, entre em contato pelo e-mail{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>.
      </p>

      <h2>1. Controlador, Operador e Encarregado (DPO)</h2>
      <p>
        A Digital Boost é a <strong>Controladora</strong> dos dados pessoais coletados diretamente dos
        usuários da Plataforma (cadastro, cobrança, suporte, navegação).
      </p>
      <p>
        Quando o Cliente insere dados de seus próprios clientes, leads ou contatos dentro do workspace, a
        Digital Boost atua como <strong>Operadora</strong> desses dados, seguindo as instruções do Cliente.
        Nesse caso, o Cliente é o Controlador e é responsável por obter as bases legais adequadas para
        coletar e tratar esses dados, e por incluir em suas próprias políticas de privacidade referências
        claras ao uso da Plataforma. A Digital Boost não controla como essas informações são tratadas
        pelo Cliente junto aos seus clientes finais.
      </p>
      <p>
        <strong>Encarregado de Proteção de Dados (DPO):</strong>{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>.
      </p>

      <h2>2. Dados que coletamos</h2>

      <h3>2.1. Dados de cadastro e conta</h3>
      <ul>
        <li>Nome completo, e-mail corporativo, telefone (opcional);</li>
        <li>Senha (armazenada com hash criptográfico, nunca em texto puro);</li>
        <li>Nome do workspace, razão social, CNPJ e cargo (quando informados);</li>
        <li>Dados de login via redes sociais, quando aplicável (nome e e-mail).</li>
      </ul>

      <h3>2.2. Dados de cobrança</h3>
      <p>
        Dados financeiros (cartão de crédito, CPF/CNPJ para nota fiscal, endereço de cobrança) são
        coletados e processados diretamente pela <strong>Stripe Payments Brasil Instituição de Pagamento
        Ltda.</strong>, nossa processadora certificada PCI-DSS. A Digital Boost <strong>não armazena
        dados de cartão</strong>, recebendo da Stripe apenas um identificador de cliente/assinatura.
      </p>

      <h3>2.3. Dados de navegação e técnicos</h3>
      <ul>
        <li>Endereço IP, data e hora de acesso, localização geográfica aproximada;</li>
        <li>Tipo de navegador, sistema operacional e dispositivo utilizado;</li>
        <li>Páginas visitadas, duração da sessão e ações realizadas dentro do produto;</li>
        <li>Logs de acesso (obrigação legal conforme art. 15 do Marco Civil da Internet).</li>
      </ul>

      <h3>2.4. Dados inseridos pelo Cliente no workspace</h3>
      <p>
        Dados de leads, clientes, mensagens, notas, tarefas e anexos adicionados ao workspace pelo Cliente.
        Esses dados são tratados pela Digital Boost exclusivamente como Operadora e não são utilizados para
        finalidades próprias da Digital Boost.
      </p>

      <h2>3. Cookies</h2>
      <p>
        Cookies são pequenos arquivos de texto armazenados no navegador ou dispositivo do usuário.
        Utilizamos três tipos:
      </p>
      <ul>
        <li>
          <strong>Cookies estritamente necessários:</strong> essenciais para o funcionamento do site e
          autenticação de sessão. Não podem ser recusados sem comprometer o acesso à Plataforma.
        </li>
        <li>
          <strong>Cookies analíticos:</strong> coletam informações de uso agregadas para melhorar a
          experiência e o desempenho da Plataforma (ex.: páginas mais visitadas, tempo de sessão).
        </li>
        <li>
          <strong>Cookies de funcionalidade:</strong> armazenam preferências informadas anteriormente
          pelo usuário para personalizar a navegação.
        </li>
      </ul>
      <p>
        O usuário pode recusar ou remover cookies pelas configurações do seu navegador. O bloqueio de
        cookies necessários pode comprometer funcionalidades da Plataforma. A Digital Boost não utiliza
        cookies de publicidade comportamental.
      </p>

      <h2>4. Bases legais</h2>
      <p>Utilizamos as seguintes bases legais (art. 7º da LGPD):</p>
      <ul>
        <li><strong>Execução de contrato:</strong> para criar a conta, operar o serviço e processar cobranças;</li>
        <li><strong>Cumprimento de obrigação legal:</strong> para guardar registros fiscais e logs de acesso (Marco Civil da Internet);</li>
        <li><strong>Legítimo interesse:</strong> para prevenir fraudes, melhorar a Plataforma e realizar comunicações transacionais;</li>
        <li><strong>Consentimento:</strong> para comunicações de marketing opcionais, solicitado de forma específica e revogável a qualquer momento.</li>
      </ul>

      <h2>5. Como utilizamos os dados</h2>
      <ul>
        <li>Criar e manter sua conta e workspace;</li>
        <li>Processar pagamentos e emitir comprovantes fiscais;</li>
        <li>Fornecer suporte técnico e responder solicitações;</li>
        <li>Enviar comunicados transacionais (faturas, alertas de segurança, avisos de serviço);</li>
        <li>Detectar e prevenir fraudes, abusos e violações aos Termos de Uso;</li>
        <li>Aprimorar a Plataforma com base em métricas agregadas de uso;</li>
        <li>Cumprir obrigações legais e regulatórias.</li>
      </ul>

      <h2>6. Compartilhamento com terceiros</h2>
      <p>
        Compartilhamos dados apenas com processadores que auxiliam a operação da Plataforma, nos limites
        necessários e sob contratos que exigem conformidade com a LGPD:
      </p>
      <ul>
        <li><strong>Stripe</strong> — processamento de pagamentos (certificada PCI-DSS);</li>
        <li><strong>Amazon Web Services (AWS)</strong> — hospedagem, banco de dados e infraestrutura em nuvem;</li>
        <li><strong>Provedores de e-mail transacional</strong> — envio de notificações e faturas;</li>
        <li><strong>Ferramentas de analytics</strong> — métricas agregadas de uso da Plataforma;</li>
        <li><strong>WhatsApp / Meta / Google</strong> — quando o Cliente conecta integrações oficiais destes serviços;</li>
        <li><strong>Autoridades públicas</strong> — quando exigido por ordem judicial ou autoridade competente.</li>
      </ul>
      <p>
        A Digital Boost <strong>não vende</strong> dados pessoais a terceiros para fins comerciais ou
        publicitários.
      </p>

      <h2>7. Transferência internacional</h2>
      <p>
        Alguns de nossos processadores (como a Stripe e provedores de infraestrutura em nuvem) podem
        armazenar dados em servidores localizados fora do Brasil. Garantimos que essas transferências
        envolvam apenas empresas que demonstram conformidade com as leis de proteção de dados aplicáveis,
        com padrões equivalentes ou mais rígidos do que a LGPD, conforme art. 33 da LGPD.
      </p>

      <h2>8. Retenção de dados</h2>
      <p>
        Os dados da conta e do workspace são mantidos enquanto a assinatura estiver ativa. Após o
        cancelamento ou expiração, os dados permanecem disponíveis por <strong>30 (trinta) dias</strong>{' '}
        para eventual reativação. Decorrido este prazo, os dados são apagados de forma definitiva de
        nossos sistemas de produção, exceto:
      </p>
      <ul>
        <li>Registros fiscais e contábeis, mantidos pelos prazos exigidos pela legislação (geralmente 5 anos);</li>
        <li>Logs de acesso, mantidos por 6 meses (art. 15 do Marco Civil da Internet);</li>
        <li>Dados anonimizados, que podem ser mantidos para fins estatísticos.</li>
      </ul>
      <p>
        Em planos gratuitos ou testes sem atividade, os dados poderão ser destruídos ou anonimizados
        após 6 (seis) meses de inatividade. Os dados pessoais serão excluídos mediante requisição dos
        titulares, salvo se houver base legal que permita sua manutenção.
      </p>

      <h2>9. Direitos do titular</h2>
      <p>Nos termos do art. 18 da LGPD, você pode solicitar a qualquer momento:</p>
      <ul>
        <li><strong>Confirmação e acesso:</strong> verificar se seus dados são tratados e obter cópia deles;</li>
        <li><strong>Correção:</strong> atualizar dados incompletos, inexatos ou desatualizados;</li>
        <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados de forma irregular;</li>
        <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado para transferência a outro fornecedor;</li>
        <li><strong>Eliminação:</strong> dos dados tratados com base em consentimento;</li>
        <li><strong>Informação sobre compartilhamentos:</strong> saber quais entidades públicas e privadas receberam seus dados;</li>
        <li><strong>Não consentimento:</strong> receber informações claras sobre as consequências de não conceder ou revogar o consentimento;</li>
        <li><strong>Revogação do consentimento:</strong> sem prejuízo do tratamento realizado anteriormente com base legal válida;</li>
        <li><strong>Oposição:</strong> se discordar de tratamento realizado com base em legítimo interesse.</li>
      </ul>
      <p>
        Para exercer qualquer desses direitos, envie um e-mail para{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>. A Digital Boost poderá solicitar
        informações adicionais para verificar sua identidade e prevenir fraudes. Responderemos em até
        15 (quinze) dias, conforme prazo legal.
      </p>
      <p>
        Caso não obtenha resposta satisfatória, você pode apresentar reclamação à{' '}
        <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>.
      </p>

      <h2>10. Segurança</h2>
      <p>
        A Digital Boost adota medidas técnicas e administrativas para proteger os dados contra acessos
        não autorizados, destruição, perda, alteração ou divulgação indevida, incluindo: criptografia
        em trânsito (HTTPS/TLS), criptografia de senhas com hash, controles de acesso por perfil,
        isolamento multi-tenant por workspace e backups periódicos.
      </p>
      <p>
        Reconhecemos que segurança total não pode ser garantida em razão de riscos de acesso não
        autorizado, falhas de hardware/software e fatores externos fora do nosso controle. Recomendamos
        que os usuários adotem boas práticas de segurança, como não compartilhar senhas.
      </p>
      <p>
        Em caso de incidente de segurança que possa acarretar risco relevante aos titulares, comunicaremos
        os afetados e a ANPD nos prazos exigidos pela LGPD. Suspeitas de incidentes devem ser reportadas
        ao nosso DPO pelo e-mail <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>.
      </p>

      <h2>11. Dados sensíveis</h2>
      <p>
        A Plataforma não foi projetada para armazenar dados sensíveis, conforme definido pela LGPD —
        como dados sobre origem racial ou étnica, convicções religiosas, opiniões políticas, dados de
        saúde, vida sexual ou dados biométricos. O Cliente não deve inserir esse tipo de dado no workspace.
      </p>

      <h2>12. Alterações desta Política</h2>
      <p>
        Esta Política pode ser atualizada. A data da "Última atualização" é informada no topo deste
        documento. Alterações relevantes serão comunicadas por e-mail ou dentro da Plataforma. Recomendamos
        visitar esta página periodicamente para verificar eventuais mudanças.
      </p>

      <h2>13. Contato</h2>
      <p>
        Para qualquer solicitação relacionada a dados pessoais, entre em contato com nosso Encarregado:{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>.
      </p>
    </LegalLayout>
  );
}
