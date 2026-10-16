import {
  BaseContract,
  ContractFactory,
  HDNodeWallet,
  JsonRpcProvider,
} from 'ethers';
import { setTimeout as delay } from 'node:timers/promises';
import {
  ChildProcessWithoutNullStreams,
  execSync,
  spawn,
} from 'node:child_process';
import { AddressInfo, createServer } from 'node:net';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export class InfrastructureHelper {
  private redisContainer: StartedTestContainer | undefined;
  // private rmqContainer: StartedTestContainer | undefined;
  private pgContainer: StartedTestContainer | undefined;
  private anvilProcess: ChildProcessWithoutNullStreams | undefined;
  private contract: BaseContract | undefined;

  async startInfrastructure() {
    await Promise.all([
      this.startRedisTestContainer(),
      this.startAnvilJsonRpcServer(),
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

  async startAnvilJsonRpcServer() {
    if (this.anvilProcess) return;

    const port = await this.getAvailablePort();
    let anvilOutput = '';
    this.anvilProcess = spawn(
      'anvil',
      ['--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    ) as any;
    this.anvilProcess!.stdout.on('data', (chunk: Buffer) => {
      anvilOutput += chunk.toString();
    });
    this.anvilProcess!.stderr.on('data', (chunk: Buffer) => {
      anvilOutput += chunk.toString();
    });

    const rpcUrl = `http://127.0.0.1:${port}`;
    const provider = new JsonRpcProvider(rpcUrl);
    await this.waitForAnvil(this.anvilProcess!, anvilOutput, provider);

    const wallet = HDNodeWallet.fromPhrase(
      'test test test test test test test test test test test junk',
    ).connect(provider);

    const artifact = JSON.parse(
      readFileSync(
        path.join(
          __dirname,
          '../../../artifacts/FLRegistry.sol/FLRegistry.json',
        ),
        'utf8',
      ),
    );

    const factory = new ContractFactory(
      artifact.abi,
      artifact.bytecode,
      wallet,
    );

    // Estimate deployment gas before sending the transaction
    const deployTx = await factory.getDeployTransaction('0x0', 0, 0, 0, 0, 0);

    const estimatedGas = await provider.estimateGas({
      ...deployTx,
      from: wallet.address,
    });

    console.log('Estimated gas:', estimatedGas.toString());

    // Deploy the contract
    this.contract = await factory.deploy('0x0', 0, 0, 0, 0, 0);

    const tx = this.contract.deploymentTransaction();
    if (!tx) {
      throw new Error('Deployment transaction not found');
    }
    console.log('Transaction hash:', tx.hash);

    const receipt = await tx.wait();

    console.log('Contract address:', await this.contract.getAddress());
    console.log('Actual gas used:', receipt?.gasUsed.toString());
  }

  async waitForAnvil(
    anvil: ChildProcessWithoutNullStreams,
    anvilOutput: string,
    provider: JsonRpcProvider,
  ) {
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
      if (anvil.exitCode !== null) {
        throw new Error(`Anvil exited before becoming ready:\n${anvilOutput}`);
      }

      try {
        await provider.getNetwork();
        return;
      } catch {
        await delay(100);
      }
    }

    anvil.kill('SIGTERM');
    throw new Error(`Timed out waiting for Anvil:\n${anvilOutput}`);
  }

  async getAvailablePort() {
    const server = createServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    return address.port;
  }

  async stopAnvilJsonRpcServer() {
    if (this.anvilProcess && this.anvilProcess.exitCode === null) {
      this.anvilProcess.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        this.anvilProcess!.once('exit', () => resolve());
      });
    }
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

  getAnvilConnectionStr() {
    return `http://localhost:${(this.anvilProcess?.spawnargs[4] as string) || 8545}`;
  }

  async getFLRegistryAddress() {
    return await this.contract?.getAddress();
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
      this.stopAnvilJsonRpcServer(),
      // this.rmqContainer?.stop(),
      this.pgContainer?.stop(),
    ]);
  }
}
