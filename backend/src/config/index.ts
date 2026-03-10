export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  redisUrl: process.env.REDIS_URL,
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  },
  ami: {
    host: process.env.AMI_HOST,
    port: parseInt(process.env.AMI_PORT ?? '5038', 10),
    username: process.env.AMI_USERNAME,
    password: process.env.AMI_PASSWORD,
  },
} as const;
