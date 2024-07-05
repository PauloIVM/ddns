# myGrok    :computer: :telephone_receiver: :computer:

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/PauloIVM/mygrok/blob/master/README.md)
[![pt-br](https://img.shields.io/badge/lang-pt--br-green.svg)](https://github.com/PauloIVM/mygrok/blob/master/README.pt-br.md)

## Summary

- [Introduction](#introduction)
- [Installation](#installation)
- [Tutorial/Examples](#tutorialexamples)
- [Motivation](#motivation)

## Introduction

This is a tunneling tool to help you reduce infrastructure costs.

Strongly inspired by `nGrok`, `myGrok` is also a tunneling tool, however with the difference of establishing **end-to-end tunnels**. The idea is to run it on the side of the local server(s) and also on the side of a hosted server (with a fixed IP or domain).

`myGrok` tunnels have a more durable nature. That is, if you can maintain a hosted server with tunnels to other servers with dynamic IPs for several days, months or years. This is because `myGrok` has a re-connection system if the availability of local/dynamic servers drops for a short period of time (either due to the internet provider changing the IP, or actually a temporary internet outage).

Tunneling is done with symmetric encryption, providing security against any middle-man attack. In addition to a token (also encrypted), which can be passed to prevent third parties from connecting to your tunnels (which would be undesirable, as even if they were unable to decrypt the data, it would block your connection).

To learn more about the most suitable use cases for the lib, check out [Motivation](#motivation).

## Installation

To use the lib as a CLI, simply run:

```shell
npm i -g mygrok
```

If you want to incorporate the lib into a project, you can also install it in the project without the `-g` flag.

## Tutorial/Examples

`myGrok` has a command to be executed in the hosted application and a second command to be executed in one or more local applications (the applications that you want to expose through the tunnels).

The command to run on the hosted side is `mygrok server <...options>` and the command on the local side is `mygrok client <...options>`.

For the `mygrok server` command, the following parameters can be passed:

| Option | Argument | Description | Example |
|--------|--------|--------|--------|
| `-h` | `<server-hosts>` | Hosts available for clients to connect to via a tunnel. | `-h foo.org,bar.org` |
| `-p` | `<server-port>` | Port on which `mygrok-server` will receive connections. | `-p 3000` |
| `-r` | `<reconnection-timeout>` | Maximum time for a client to reconnect to a `mygrok-server` host in milliseconds. | `-r 8000` |
| `-t` | `<token>` | Token for socket authentication. | `-t my_token` |
| `-s` | `<secret-key>` | SecretKey for encryption of data transmitted through the tunnels. A string of exactly 32 characters must be passed. | `-s T8s9G4j6M1x2D7p0W3q5B8z4L7v1N6k3` |
| `-m` | `<--max-http-buffer-size>` | Defaults = 1e6. If tunneling large files in a single strem-chunk, you may want increase this value. | `-m 100000000` |

For the `mygrok client` command, the following parameters can be passed:

| Option | Argument | Description | Example |
|--------|--------|--------|--------|
| -h | `<server-host>` | One of the available hosts passed on the server to connect to. | `-h foo.org` |
| -u | `<server-url>` | Server connection url. | `-u https://foo.org` |
| -p | `<client-port>` | Port that `mygrok-client` will attempt to expose to `mygrok-server`. | `-p 4000` |
| -l | `<client-hostname>` | Hostname that `mygrok-client` will attempt to expose to `mygrok-server` | `-l 0.0.0.0` |
| -t | `<token>` | Token for socket authentication. | `-t my_token` |
| -s | `<secret-key>` | SecretKey for encryption of data transmitted through the tunnels. A string of exactly 32 characters must be passed. | `-s T8s9G4j6M1x2D7p0W3q5B8z4L7v1N6k3` |

It is worth noting that authentication and encryption are symmetric. That is, you must pass the same `-t` and `-s` in `mygrok client` and `mygrok server`.

One note: it is not strictly necessary for you to pass a `token`, because, given the encryption, the sokects connection will only be established if the `mygrok client` has the secret-key to properly encrypt the token. So, in practice you could not pass a `token` and a hard-coded default `token` would be used. However, it is interesting to pass a unique token to add another layer of security.

As for `secret-key`, it is very important that you enter a unique key, created by yourself and not shared, of 32 characters. This will ensure that the data transmitted through the tunnels is encrypted, and, if there is any intermediate proxy between your `mygrok client` and the `mygrok server`, it will not be aware of the information transmitted.

The `-l` flag of `mygrok client` is optional; by default the value will be `localhost`; but depending on the case you may want to pass another host, such as `0.0.0.0`.

### Hello world

For a first example, create a `test-server.js` file with the following code:

```js
const http = require("http");
const PORT = 4000;
const server = http.createServer((req, res) => {
    req.on("data", () => {}).on("end", () => {
        res.end(`hello from port ${PORT}`);
    });
});
server.listen(PORT, () => {
    console.log(`Client server running on :: ${PORT}`);
});
```

Run the created script:

```shell
node test-server.js
```

This will be a generic server, which we might want to expose on another machine via `myGrok` tunneling.

Open a terminal and type:

```shell
mygrok server -p 3000
```

In another terminal, enter:

```shell
mygrok client -p 4000 -u http://localhost:3000
```

Now, if we do a `curl` to `http://localhost:3000`, we will see the `JS` server that we uploaded on port 4000 responding.

![Alt text](assets/image.png)

Notice that the server is running on port 4000, but we are accessing port 3000 due to `myGrok` doing the tunneling that we configured with the two commands executed.

Of course, until then, we are running everything locally and on the same host, which may not make the purpose of the lib as clear. So let's move on to some more interesting uses.

### Running multiple clients

Let's say you have something like an EC2 and an AWS Route 53 at your disposal. So, let's say you have directed several subdomains to this EC2, and you want each subdomain to connect to a different local process.

In this case, you can use the `-h` flag in `mygrok server` and `mygrok client`. On the server, you can pass multiple hosts, which are the hosts available for clients to connect to. Each host can remain connected to a single client; and if you try to establish a connection from a client to a host already connected to another client, then the handshake will fail.

To simulate this case, but still running everything locally, we can change `/etc/hosts`, adding more local hosts. When you open this file, you will likely find the line `127.0.0.1 localhost` filled in; So, let's add other hosts as follows in this file:

```
127.0.0.1 localhost
127.0.0.1 server-a
127.0.0.1 server-b
127.0.0.1 server-c
```

Having added these hosts, now run three JS servers, similar to what we did in the previous example, each on a different port. Let's assume you booted one on port 4000, another on 4001, and another on 4002.

Now, we can run the `server` as follows:

```shell
mygrok server -h server-a,server-b,server-c -p 3000
```

And we run the tunnels for each of the clients:

```shell
mygrok client -h server-a -p 4000 -u http://localhost:3000
```

```shell
mygrok client -h server-b -p 4001 -u http://localhost:3000
```

```shell
mygrok client -h server-c -p 4002 -u http://localhost:3000
```

And ready. By accessing `http://server-a:3000` in your browser, the proxy will be made to the local server running on port 4000. If you access the url with server-b, to 4001, and so on.

**IMPORTANT**: Remember to provide a valid secret-key to ensure encryption of data sent in the tunnels.

## Motivation

Cloud services have made hosting web services much easier; however, in many cases, the costs can be daunting, especially if your software is not yet monetized and you have no money left over.

In these cases, there are some very interesting free solutions, for example:
- [ngrok](https://ngrok.com/)
- [duckdns](https://www.duckdns.org/)

Services like `ngrok` easily allow you to tunnel directly from your personal computer to the web. `ddns` services, such as `duckdns`, allow you to upload a local server using a dynamic IP, and, whenever your IP changes, this service will notice this and proxy it accordingly, or inform the client of the new IP adress.

### So, what is the use of this project?

Imagine that you want to test an MVP, and leave a website up for a few days. Or you want to upload a portfolio to the air.

Still, it is possible to use `ngrok`, right? In the free mode, eventually your tunnel will die, and the application will stop working; Besides, the url provided is usually in the `ngrok` domain, generating only a specific sub-domain for your application. This could be bad if your case is testing an MVP; for example, what if your website relies minimally on SEO? What if you want to test a project for a while, without spending a lot, and only then decide whether to invest in more expensive infrastructure?

Okay, but then these `ddns` services would certainly work, wouldn't they? The disadvantage of not having your own domain may continue to be a problem. Additionally, depending on your internet provider, you may end up having problems if your provider uses CGNAT strategies. By this I mean that your provider could be using the same public IP for several clients (and each client with a private IP on the provider's network), and this would make it very difficult for the `ddns` server to proxy to your local server. In these CGNAT cases, the ideal is something based on tunneling, like `ngrok`.

Ok. In a case where I cannot resort to either `ngrok` or `duckdns`, it is inevitable that I will have to resort to cloud services or set up my on-premise infrastructure. What would this project be useful for then?

In this scenario, `myGrok` would be useful to **reduce** cloud costs (repair, reduce, not eliminate completely).

Imagine you have a ReactJS/NextJS project, and about two or three apis, plus a database. This is the MVP that wants to move up to the cloud. The EC2 `t2.micro`, which is a free machine offered by AWS, has only 1GB of RAM; It's possible that this won't even run your ReactJS application. If you are going to rent more machines, at the time of writing this readme, the cheapest instances cost around 6 dollars; Your project could easily end up being very expensive for a simple MVP or portfolio.

Still along these lines, my personal computer is an Intel Core I5 ​​with 32GB of RAM. A more or less equivalent AWS machine, the `t3.2xlarge`, 32GB, currently costs USD 0.3328 per hour, which gives us **around 240 dollars per month!!**

So, we arrive at the most suitable use case for `myGrok`. Imagine that you have a powerful local machine, with the possibility of leaving it on 24/7. You want to put a reasonably complex project into production, which requires considerable RAM and processing. You need, or want, to climb into a realm of your own.

Instead of renting a powerful machine like `t3.2xlarge`, you could rent a single `t2.micro` and create several tunnels pointing to apis running on your local server. In other words, `myGrok` allows you to rent **only** network services, but reducing computational costs given the use of your own machines.

In other words, the ideal scenario for `myGrok` is when you only want to rent network resources, but not computational resources, even if the cloud provider wants to sell you everything together in the same package.
