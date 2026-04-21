import LegalLayout from './LegalLayout';

export default function Reembolso() {
  return (
    <LegalLayout title="Política de Reembolso e Cancelamento" updatedAt="21/04/2026">
      <p>
        Esta Política detalha as regras de reembolso e cancelamento das assinaturas da plataforma{' '}
        <strong>AppexCRM</strong>, operada pela <strong>57.842.141 LTDA</strong> (Digital Boost),
        CNPJ 57.842.141/0001-79, e complementa os <a href="/termos">Termos de Uso</a>.
      </p>

      <h2>1. Período de teste gratuito</h2>
      <p>
        Novos workspaces têm acesso a <strong>7 (sete) dias corridos</strong> de avaliação gratuita, sem cobrança e
        sem cadastro de cartão. Se ao término do trial o Cliente não assinar um plano pago, o acesso é bloqueado,
        mas os dados ficam preservados por 30 dias para reativação.
      </p>

      <h2>2. Direito de arrependimento (art. 49 do CDC)</h2>
      <p>
        Nos termos do <strong>art. 49 do Código de Defesa do Consumidor</strong>, o Cliente pessoa física pode
        desistir da contratação no prazo de <strong>7 (sete) dias corridos</strong> contados da data do pagamento,
        recebendo reembolso integral do valor pago, sem necessidade de justificativa.
      </p>
      <p>
        O prazo de 7 dias aplica-se a <strong>cada pagamento inicial</strong> de nova assinatura ou a alteração
        de plano que represente aquisição nova. <strong>Não se aplica a renovações automáticas</strong> de
        assinaturas já em curso, pois nestas o Cliente já conhece o serviço.
      </p>

      <h3>Como solicitar</h3>
      <p>
        Envie um e-mail para <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a> com:
      </p>
      <ul>
        <li>Assunto: <em>"Solicitação de arrependimento — AppexCRM"</em>;</li>
        <li>E-mail cadastrado na conta;</li>
        <li>Nome completo / Razão social;</li>
        <li>Data do pagamento.</li>
      </ul>
      <p>
        Após validação, o reembolso é processado em até <strong>10 (dez) dias úteis</strong> pelo mesmo método de
        pagamento utilizado na compra. O prazo de efetivação no extrato do Cliente depende do emissor do cartão
        e pode levar até <strong>2 (duas) faturas</strong>.
      </p>

      <h2>3. Cancelamento após o período de arrependimento</h2>
      <p>
        Após os 7 dias iniciais, o Cliente pode cancelar a assinatura a qualquer momento. O cancelamento interrompe
        a <strong>renovação automática</strong> no próximo ciclo, e o acesso permanece disponível até o final do
        período já pago.
      </p>
      <p>
        Como padrão de mercado em serviços SaaS, <strong>não realizamos reembolso proporcional</strong> de ciclos
        já iniciados (mensalidade em curso ou anualidade em curso) fora do prazo de arrependimento, salvo em casos
        de comprovada falha grave do serviço por parte da Digital Boost.
      </p>

      <h3>Como cancelar</h3>
      <ul>
        <li>Acesse o AppexCRM com a conta do <strong>Proprietário</strong> do workspace;</li>
        <li>Vá em <strong>Configurações → Sistema → Gerenciar assinatura</strong> (ou equivalente);</li>
        <li>Você será redirecionado ao portal de cobrança seguro da Stripe, onde pode cancelar a assinatura com um clique;</li>
        <li>Alternativamente, envie e-mail para <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a> solicitando o cancelamento.</li>
      </ul>

      <h2>4. Falha de serviço e reembolso extraordinário</h2>
      <p>
        Em caso de indisponibilidade prolongada do serviço por falha atribuível à Digital Boost, o Cliente pode
        solicitar análise de crédito ou reembolso proporcional, a ser avaliado caso a caso pela equipe de suporte.
      </p>
      <p>
        Não se consideram falha da Digital Boost: interrupções de serviços integrados de terceiros (WhatsApp, Meta,
        Google, Stripe), falhas na conexão do próprio Cliente, uso indevido da Plataforma, ou manutenções
        programadas comunicadas previamente.
      </p>

      <h2>5. Retenção de dados após cancelamento</h2>
      <p>
        Após o cancelamento, os dados do workspace permanecem disponíveis por <strong>30 (trinta) dias</strong>,
        permitindo reativação. Decorrido este prazo, os dados são apagados em definitivo, conforme a{' '}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>
      <p>
        O Cliente pode solicitar exportação de seus dados em formato legível antes do encerramento definitivo,
        conforme art. 18 da LGPD.
      </p>

      <h2>6. Contato</h2>
      <p>
        Para qualquer dúvida sobre reembolso ou cancelamento, entre em contato com nossa equipe pelo e-mail{' '}
        <a href="mailto:contato@appexcrm.com">contato@appexcrm.com</a>. Responderemos em até 2 (dois) dias úteis.
      </p>
    </LegalLayout>
  );
}
