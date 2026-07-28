"""Redis Pub/Sub for cross-instance WebSocket broadcast."""
import os
import json
import asyncio
import logging

logger = logging.getLogger("secureflow.redis_pubsub")

REDIS_BROADCAST_CHANNEL = os.getenv("REDIS_BROADCAST_CHANNEL", "secureflow:ws:broadcast")


class RedisPubSubManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._pub = None
        self._sub = None
        self._listener_task = None
        self._connected = False

    async def connect(self):
        try:
            import redis.asyncio as aioredis
            self._pub = aioredis.from_url(self.redis_url, decode_responses=True)
            self._sub = self._pub.pubsub()
            await self._sub.subscribe(REDIS_BROADCAST_CHANNEL)
            self._connected = True
            logger.info("[redis_pubsub] Connected and subscribed to %s", REDIS_BROADCAST_CHANNEL)
        except ImportError:
            logger.info("[redis_pubsub] redis.asyncio not available — running in single-instance mode")
            self._connected = False
        except Exception as e:
            logger.warning("[redis_pubsub] Failed to connect: %s — running in single-instance mode", e)
            self._connected = False

    async def publish(self, message: str):
        if not self._connected or not self._pub:
            return
        try:
            await self._pub.publish(REDIS_BROADCAST_CHANNEL, message)
        except Exception as e:
            logger.warning("[redis_pubsub] Publish failed: %s", e)

    def start_listener(self, callback):
        if not self._connected or not self._sub:
            return
        self._listener_task = asyncio.create_task(self._listen(callback))

    async def _listen(self, callback):
        try:
            async for msg in self._sub.listen():
                if msg["type"] == "message":
                    try:
                        await callback(msg["data"])
                    except Exception as e:
                        logger.warning("[redis_pubsub] Callback error: %s", e)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning("[redis_pubsub] Listener error: %s", e)

    async def disconnect(self):
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._sub:
            await self._sub.unsubscribe(REDIS_BROADCAST_CHANNEL)
            await self._sub.close()
        if self._pub:
            await self._pub.aclose()
        self._connected = False
