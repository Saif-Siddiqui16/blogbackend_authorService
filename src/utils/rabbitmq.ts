import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      console.error("❌ RABBITMQ_URL not defined in .env");
      return;
    }
    const connection = await amqp.connect(url);
    channel = await connection.createChannel();
    console.log("✅ Connected to Rabbitmq");
  } catch (error) {
    console.error("❌ Failed to connect to Rabbitmq", error);
  }
};

export const publishToQueue = async (queueName: string, message: any) => {
  if (!channel) {
    console.error("Rabbitmq channel is not intialized");
    return;
  }
  await channel.assertQueue(queueName, { durable: true });
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
};

export const invalidateChacheJob = async (cacheKey: string[]) => {
  try {
    const message = {
      action: "invalidateCache",
      keys: cacheKey,
    };
    await publishToQueue("cache-invalidation", message);
    console.log("✅ Cache invalidation job published to Rabbitmq");
  } catch (error) {
    console.error("❌ Failed to Publish cache on Rabbitmq", error);
  }
};
