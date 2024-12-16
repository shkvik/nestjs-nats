import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NatsClientProxy } from 'src/index';

@Global()
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
  exports: [ClientsModule],
})
export class NatsClientModule { }