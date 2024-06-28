# SstGrok (strong self tunnels - grok)

## Sumário

- [Introdução](#introdução)
- [Instalação](#instalação)
- [Exemplos](#exemplos)
- [Motivação](#motivação)

## Introdução

Esta é uma ferramenta de tunelamento para ajudá-lo a reduzir custos de infraestrutura.

O `sstGrok` é uma lib de tunelamento ponta a ponta. Ou seja, você deverá executá-la do lado do(s) servidor(es) local(ais) e também do lado do servidor hospedado (com um ip fixo ou um domínio).

Um diferencial do `sstGrok` é proporcionar um tunelamento de caráter mais duradouro. Ou seja, se você tem um servidor hospedado e deseja criar nele túneis para outros servidores com IPs dinâmicos e manter esses túneis por vários dias, meses ou anos, o `sstGrok` será a ferramenta ideal. Isto pois a lib conta com um sistema de re-conexão caso a disponibilidade dos servidores locais/dinâmicos caiam por um curto período de tempo (seja devido ao provedor de internet trocar o IP, ou realmente uma queda temporária de internet).

Para saber mais sobre os casos de uso mais indicados para a lib, confira em [Motivação](#motivação).

## Instalação

TODO: ...

## Exemplos

TODO: ...

```
node src/index.js tunnel-server -h server-a.localhost -p 3000 -t my_token -s 3000 -o 8000
node src/index.js tunnel-client -h server-a.localhost -p 4000 -t my_token -u http://localhost:3000
```

### Múltiplos clientes

TODO: ...

## Motivação

Os serviços cloud facilitaram muito a hospedagem de serviços web; contudo, em muitos casos, os custos podem ser desanimadores, em especial se o seu software ainda não for monetizado e você não tiver dinheiro sobrando.

Nestes casos, existem algumas soluções gratuitas bastante interessantes, por exemplo:
- [ngrok](https://ngrok.com/)
- [duckdns](https://www.duckdns.org/)

Serviços como o `ngrok` permitem facilmente você criar um tunnel diretamente do seu computador pessoal para a web. Serviços de `ddns`, como o `duckdns`, permitem que você suba um servidor local utilizado um ip dinâmico, e, sempre que o seu ip mudar, este serviço irá perceber isso e fazer um proxy devidamente.

### Então, qual a utilidade deste projeto?

Imagine que você queira testar um MVP, e deixar um site no ar por alguns dias. Ou que você queira subir um portifólio pro ar.

Ainda assim, é possível usar o `ngrok`, não? Na modalidade gratuita, uma hora o seu túnel irá morrer, e a aplicação irá parar de funcionar; fora que a url fornecida costuma ser no domínio `ngrok`, gerando apenas um sub-domínio específico para a sua aplicação. Isso pode ser ruim se o seu caso for testar um MVP; por exemplo, e se o seu site depender minimamente de SEO? E se você quiser testar um projeto por algum tempo, sem gastar muito, e só depois decidir se vai investir em uma infra mais cara?

Certo, mas então esses serviços de ddns certamente funcionariam, não? A desvantagem de você não ter um domínio seu pode continuar sendo um problema. Além disso, dependendo do seu provedor de internet, você pode acabar tendo problemas se o seu provedor usar estratégias de CGNAT. Com isso quero dizer que o seu provedor pode estar usando um mesmo IP público para vários clientes (e cada cliente com um IP privado na rede do provedor), e isso dificultaria muito o servidor `ddns` fazer o proxy para o seu servidor local. Nestes casos de CGNAT, o ideal é algo baseado em tunelamento, como o `ngrok`. 

Ok. Num caso onde eu não posso recorrer a nem um `ngrok` e nem a um `duckdns`, é inevitável que eu tenha que recorrer à serviços cloud ou montar minha infra on-premise. No que este projeto seria útil então?

Consideremos que estamos nesse cenário, onde não nos serve nem mesmo `ngrok` e nem o `duckdns`. Agora imaginemos que tenhamos uma aplicação ReactJS/NextJS, e cerca de duas ou três apis, mais um banco de dados. Este é o MVP que desejo testar, e quero subir tudo isso para a nuvem.

Percebeu onde quero chegar? O EC2 `t2.micro`, que é uma máquina gratuita oferecida pela AWS, possui apenas 1GB de memória RAM; é possível que isso não rode nem mesmo sua aplicação ReactJS. Se você for alugar mais máquinas, no momento em que eu escrevo esse readme, as instâncias mais baratas custam cerca de 6 dólares; facilmente seu projeto pode acabar saindo bem caro para um simples MVP ou portifólio.

Ainda nessa linha, o meu computador pessoal é um Intel Core I5 de 32GB de RAM. Uma máquina AWS mais ou menos equivalente, o `t3.2xlarge`, de 32GB, neste momento custa USD 0,3328 a hora, que nos dá **cerca de 240 dólares por mês!!**

Então, chegamos no caso de uso mais indicado para o `sstGrok`. Imagine que você tenha uma máquina local potente, com a possibilidade de deixá-la ligada 24/7. Você deseja subir para produção um projeto razoavelmente complexo, que demande um consumo considerável de RAM e processamento. Você precisa, ou deseja, subir em um domínio próprio. Neste caso, então, o `sstGrok` pode lhe ser muito útil.

Ao invés de alugar uma máquina potente como o `t3.2xlarge`, você poderá alugar um único `t2.micro` e criar vários túneis apontando para apis rodando no seu servidor local. Em outras palavras, o `sstGrok` te permite alugar **apenas** os serviços de conectividade com a web, mas reduzindo custos computacionais dado o uso de máquinas próprias.

Ou seja, o cenário ideal para o `sstGrok` é quando se deseja alugar apenas recursos de rede, mas não recursos computacionais, ainda que o provedor cloud queira te vender tudo junto em um mesmo pacote.

## TODOs

- [ ] Refatorar para usar typescript;
- [ ] Criar testes automatizados;
- [ ] Criar exemplo rodando tudo local, usando o CLI e servers em js genéricos;
- [ ] Criar exemplo rodando tudo local com múltiplos clientes (/etc/hosts/);
- [ ] Criar exemplo com um t2.micro e aws route 53 com múltiplos subdomains;
- [ ] Gravar um vídeo com estes exemplos, e mostrando tbm a perda de conectividade, em especial usando uma máquina virtual para os servidores locais e cortando a conexão por algum tempo;
- [ ] Publicar imagem no docker-hub e atualizar aqui no readme.
- [ ] Tentar importar em um projeto typescript e tentar usar o CLI de forma global.
