# SstGrok (StrongSelfTunnels-Grok)

TODO: Documentar direito as motivações:
- Subir uma aplicação local alugando uma máquina muito barata da cloud (apenas para fazer o proxy);
- Possibilidade de um mesmo ip-fixo fazer o proxy pra vários ips dinâmicos (duckdns suport isso?);
- Diferente dos serviçoes padrões de ddns, vc pode configurar para rodar em seu próprio domínio, pode ser útil para testar um MVP, ou para mandar pro ar todo um portifólio antes daquela entrevista;
- Vc está dos dois lados da comunicação... não está trafegando os dados da sua aplicação num servidor ddns terceiro... talvez seja o mais ideal para casos como testar um MVP, dá um mínimo de segurança;
- Grande parte dos códigos de servidores ddns q encontrei, ex.: https://github.com/dstapp/docker-ddns, o servidor ddns apenas responde ao client qual é o ip dinâmico, e o client faz uma nova request para o  dinâmico (ou o server ddns faz um proxy para esse ip dinâmico). Contudo, pode ser o caso do seu provedor local estar usando a técnica CGNAT.
- Diferentemente de um serviço de tunelamento comum (como o ngrok), que normalmente tem esse viés de ser "temporário", a ideia aqui é ter algo mais permanente. Se a conexão do lado do tunnel-client cair por algum motivo (instabilidade da rede, ou o deu provedor trocou seu IP), assim q restabelecida, o tunnel-client tentará retomar a conexão automaticamente. Até uma ideia... posso implementar um notificador que avisa por email se a conexão não for restabelecida.

TODO: Melhorar logs... o mais importante são os logs q são enviados ao client... se possível, deixar aberto para que se possa passar um logger genérico (ex.: aws-cloudwatch.. etc..);

TODO: Refatorar para usar typescript. Criar testes automatizados.

TODO: Melhorar os exemplos... mostrar apenas no readme:
- Exemplo mais simples rodando tudo local, usar o CLI apenas... e servidores genéricos locais em js. Documentar o /etc/hosts e mostrar pra diversos subdomains;
- Se eu chegar a implementar.. mostrar um exemplo de como passar um logger personalizado;
- Exemplo usando ngrok (tunnel dentro do tunnel, acho q só vai confundir);
- Exemplo com um t2.micro e um aws-dns-route com múltiplos subdomains apontando para o mesmo t2.micro.

TODO: Parece q esse cara fez algo bem parecido e tem uma boa documentação.. dar uma lida:
- https://github.com/web-tunnel/lite-http-tunnel
- https://medium.com/@embbnux/building-a-http-tunnel-with-websocket-and-node-js-98068b0225d3

```
node src/index.js tunnel-server -h server-a.localhost -p 3000 -t my_token -s 3000 -o 8000
node src/index.js tunnel-client -h server-a.localhost -p 4000 -t my_token -u http://localhost:3000
```
