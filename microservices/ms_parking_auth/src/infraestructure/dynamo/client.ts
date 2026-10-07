import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const getDynamoClient = (): DynamoDBDocumentClient => {
  const isLocal =
    process.env.IS_OFFLINE ||
    process.env.NODE_ENV === 'development' ||
    process.env.DYNAMODB_ENDPOINT;
  const region = process.env.AWS_REGION || 'us-east-1';

  const client = new DynamoDBClient({
    region,
    ...(isLocal && process.env.DYNAMODB_ENDPOINT
      ? { endpoint: process.env.DYNAMODB_ENDPOINT }
      : {}),
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  });
};

export const dynamoDocClient = getDynamoClient();
