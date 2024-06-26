# ddns

TODO: Documentar direito as motivações:
    - Subir uma aplicação local alugando uma máquina muito barata da cloud (apenas para fazer o proxy);
    - Possibilidade de um mesmo ip-fixo fazer o proxy pra vários ips dinâmicos (duckdns suport isso?);
    - Diferente dos serviçoes padrões de ddns, vc pode configurar para rodar em seu próprio domínio, pode ser útil para testar um MVP, ou para mandar pro ar todo um portifólio antes daquela entrevista;
    - Vc está dos dois lados da comunicação... não está trafegando os dados da sua aplicação num servidor ddns terceiro... talvez seja o mais ideal para casos como testar um MVP, dá um mínimo de segurança;
    - Grande parte dos códigos de servidores ddns q encontrei, ex.: https://github.com/dstapp/docker-ddns,o servidor ddns apenas responde ao client qual é o ip dinâmico, e o client faz uma nova request para o  dinâmico (ou o server ddns faz um proxy para esse ip dinâmico). Contudo, pode ser o caso do seu provedor local estar usando a técnica CGNAT.

TODO: Mudar nome do projeto... acabou n sendo um ddns, mas sim um serviço de tunelamento, mais ou menos como o ngrok (TunnelConnect ??).
