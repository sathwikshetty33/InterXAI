import ssl

from taskiq_redis import ListQueueBroker, RedisAsyncResultBackend

from app.config import settings

if settings.REDIS_URL.startswith("rediss://"):
    _ssl_ctx: ssl.SSLContext | None = ssl.create_default_context()
    assert _ssl_ctx is not None
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
else:
    _ssl_ctx = None

# socket_timeout=None is load-bearing: redis-py >= 8 defaults it to 5s, and
# the broker's listener is a blocking BRPOP that legitimately idles far longer
# than that — with a read timeout, every quiet stretch kills the worker.
broker = ListQueueBroker(url=settings.REDIS_URL, socket_timeout=None).with_result_backend(
    RedisAsyncResultBackend(redis_url=settings.REDIS_URL)
)
