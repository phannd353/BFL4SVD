import { execSync } from 'node:child_process';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export class InfrastructureHelper {
  private redisContainer: StartedTestContainer | undefined;
  // private rmqContainer: StartedTestContainer | undefined;
  private pgContainer: StartedTestContainer | undefined;

  async startInfrastructure() {
    await Promise.all([
      this.startRedisTestContainer(),
      // this.startRmqTestContainer(),
      this.startPgTestContainer(),
    ]);
  }

  async startRedisTestContainer() {
    if (!this.redisContainer)
      this.redisContainer = await new GenericContainer('redis:alpine')
        .withExposedPorts(6379)
        .start();
  }

  // async startRmqTestContainer() {
  //   if (!this.rmqContainer)
  //     this.rmqContainer = await new GenericContainer(
  //       'rabbitmq:4-management-alpine',
  //     )
  //       .withExposedPorts(5672, 15672)
  //       .start();
  // }

  async startPgTestContainer() {
    if (!this.pgContainer) {
      this.pgContainer = await new GenericContainer('postgres:alpine')
        .withEnvironment({
          POSTGRES_USER: 'testuser',
          POSTGRES_PASSWORD: 'testpassword',
          POSTGRES_DB: 'testdb',
        })
        .withExposedPorts(5432)
        .start();

      execSync('pnpm prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: this.getPgConnectionStr(),
        },
      });

      // const client = new Client({ connectionString: dbUrl });
      // await client.connect();
      // const result = await client.query(`
      //   SELECT tablename, schemaname FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
      // `);
      // await client.end();
    }
  }

  getRedisConnectionStr() {
    return `redis://${this.redisContainer?.getHost()}:${this.redisContainer?.getMappedPort(6379)}`;
  }

  // getRmqConnectionStr() {
  //   return `amqp://guest:guest@${this.rmqContainer?.getHost()}:${this.rmqContainer?.getMappedPort(
  //     5672,
  //   )}`;
  // }

  getPgConnectionStr() {
    return `postgresql://testuser:testpassword@${this.pgContainer?.getHost()}:${this.pgContainer?.getMappedPort(5432)}/testdb`;
  }

  async stopInfrastructure() {
    // skip if services didn't started yet
    if (!this.redisContainer && !this.pgContainer) return;

    await Promise.all([
      this.redisContainer?.stop(),
      // this.rmqContainer?.stop(),
      this.pgContainer?.stop(),
    ]);
  }
}
