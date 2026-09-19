from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "moip",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    pass


from celery.signals import worker_process_init


@worker_process_init.connect
def init_celery_worker_process(**kwargs):
    """
    Dispose of connection pool inherited from parent process so that each
    Celery prefork worker process creates its own independent PostgreSQL connections.
    Prevents 'error with status PGRES_TUPLES_OK' and column collision errors.
    """
    from app.core.database import engine
    engine.dispose(close=False)