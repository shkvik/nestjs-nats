import { Test } from "@nestjs/testing";
import { ExampleModule } from "./example/example.module";
import { NatsTransporter } from "src/index";
import { INestApplication } from "@nestjs/common";
import { NatsClientModule } from "./nast-client/nats-client.module";

export class AppBuilder {
  private app: INestApplication<unknown>;

  public async create(): Promise<INestApplication<unknown>> {
    const moduleRef = await Test.createTestingModule({
      imports: [NatsClientModule, ExampleModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.connectMicroservice({
      strategy: new NatsTransporter({
        servers: ['nats://0.0.0.0:4222'],
        user: 'nats_user',
        pass: 'nats_password',
        test: true
      })
    });
    await app.startAllMicroservices();
    this.app = app;
    return app.init();
  }

  public async dispose() {
    await this.app.close();
  }
}