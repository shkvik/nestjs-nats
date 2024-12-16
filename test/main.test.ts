import { INestApplication } from '@nestjs/common';
import { AppBuilder } from './app.builder';
import { ExampleCase } from './example/example.case';

describe("package name", function () {
  let builder: AppBuilder;
  let app: INestApplication;
  let exampleCase: ExampleCase;

  beforeAll(async () => {
    builder = new AppBuilder();
    app = await builder.create();
    exampleCase = new ExampleCase(app);
  })
  afterAll(async () => {
    await builder.dispose();
  })
  it("queue", async () => {
    await exampleCase.handleQueue()
  });
});
