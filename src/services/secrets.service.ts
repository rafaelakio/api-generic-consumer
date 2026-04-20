import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import type { AzureAdSecret, ApiCredentialsSecret } from '@/types';

// Singleton client – reused across lambda warm starts / SSR requests
let client: SecretsManagerClient | null = null;

function getClient(): SecretsManagerClient {
  if (client) return client;

  const config: ConstructorParameters<typeof SecretsManagerClient>[0] = {
    region: process.env.AWS_REGION ?? 'us-east-1',
  };

  // In local dev we point at LocalStack; in production this must be omitted
  // so the SDK resolves the real AWS endpoint via the standard resolver.
  if (process.env.LOCALSTACK_ENDPOINT) {
    config.endpoint = process.env.LOCALSTACK_ENDPOINT;
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
    };
  }

  client = new SecretsManagerClient(config);
  return client;
}

async function getSecret<T>(secretName: string): Promise<T> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await getClient().send(command);

  if (!response.SecretString) {
    throw new Error(`Secret "${secretName}" has no string value`);
  }

  return JSON.parse(response.SecretString) as T;
}

export async function getAzureAdSecret(): Promise<AzureAdSecret> {
  const secretName =
    process.env.AWS_SECRET_NAME_AZURE ?? 'api-consumer/azure-ad';
  return getSecret<AzureAdSecret>(secretName);
}

export async function getApiCredentials(
  secretName?: string,
): Promise<ApiCredentialsSecret> {
  const name =
    secretName ??
    process.env.AWS_SECRET_NAME_API_CREDENTIALS ??
    'api-consumer/api-credentials';
  return getSecret<ApiCredentialsSecret>(name);
}
