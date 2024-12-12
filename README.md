# NATS Transporter - The [NATS](http://nats.io) client for [NestJS](https://nestjs.com/)

[![License](https://img.shields.io/badge/Licence-Apache%202.0-blue.svg)](./LICENSE)
[![JSDoc](https://img.shields.io/badge/JSDoc-reference-blue)](https://nats-io.github.io/nats.js/)
![example workflow](https://github.com/nats-io/nats.js/actions/workflows/test.yml/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/nats-io/nats.js/badge.svg?branch=main)](https://coveralls.io/github/nats-io/nats.js?branch=main)

> [!IMPORTANT]
>
> This project reorganizes the NATS Base Client library (originally part of
> nats.deno), into multiple modules, and on-boards the supported transports
> (Deno, Node/Bun, and WebSocket).

Welcome to the new NATS.js repository! Beginning with the v3 release of the
JavaScript clients, the NATS.js repository reorganizes the NATS JavaScript
client libraries into a formal mono-repo.

# Overview
NATS is a simple, secure and high performance open source messaging system for cloud native applications, IoT messaging, and microservices architectures. The NATS server is written in the Go programming language, but client libraries to interact with the server are available for dozens of major programming languages. NATS supports both At Most Once and At Least Once delivery. It can run anywhere, from large servers and cloud instances, through edge gateways and even Internet of Things devices.

# Installation

To start building microservice with nats transporter, first install required packages:
```bash
$ npm i --save nestjs-nats-transporter nats
```

# Getting started
To instantiate a microservice, use the ```createMicroservice()``` method of the ```NestFactory``` class:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { NatsTransporter } from 'nestjs-nats-transporter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    strategy: new NatsTransporter({
      servers: ['nats://0.0.0.0:4222'],
      user: 'nats_user',
      pass: 'nats_password',
    }),
  });
  await app.listen();
}
bootstrap();
```

# Patterns

Microservices recognize both messages and events by patterns. A pattern is a plain value, for example, a literal object or a string. Patterns are automatically serialized and sent over the network along with the data portion of a message. In this way, message senders and consumers can coordinate which requests are consumed by which handlers.

# Client Proxy
```ts
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NatsClientProxy } from 'nestjs-nats-transporter';
import { ConnectionOptions } from 'nats';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NATS_CLIENT',
        customClass: NatsClientProxy,
        options: {
          servers: ['nats://0.0.0.0:4222'],
          user: 'nats_user',
          pass: 'nats_password',
        },
      },
    ]),
  ],
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
```

# Injection
```ts
import { Inject, Injectable } from '@nestjs/common';
import { NatsClientProxy } from 'nestjs-nats-transporter';

@Injectable()
export class ExampleService {
  
  @Inject('NATS_CLIENT')
  private client: NatsClientProxy
}
```

# Sending messages

## RxJs
```ts
@Injectable()
export class ExampleService {

  getHelloWorld(): Observable<number> {
    const payload = [1, 2, 3];
    return this.client.send<number>('subject', payload); 
  }
}
```

## Promise
```ts
@Injectable()
export class ExampleService {

  async getHelloWorld(): Promise<string> {
    const payload = [1, 2, 3];
    const result = await lastValueFrom(
      this.client.send<string>('subject', payload)
    );
    console.log(result) //should be "Hello World!"
    return result;
  }
}
```
# Publishing events
