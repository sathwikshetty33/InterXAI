import base64
from uuid import uuid4

from app.background.taskiq.taskiq import broker
from app.database import AsyncSessionLocal
from app.logger import get_logger
from app.models.proctoring import ViolationImage
from app.utils.default_providers import default_storage_provider

logger = get_logger(__name__)


@broker.task
async def upload_violation_image_task(session_id: int, image_b64: str, violation_type: str) -> None:
    """Upload one violation frame to storage and record it as evidence.

    Best-effort: a failed upload is logged and dropped so it can never affect
    the live interview. Counting/escalation lives in the heartbeat endpoint,
    which needs the count synchronously for the warn->escalate response.
    """
    try:
        # The client sends a data URL ("data:image/jpeg;base64,..."); strip the
        # prefix before decoding, or the JPEG bytes come out corrupted (black).
        payload = image_b64.split(",", 1)[-1] if image_b64.startswith("data:") else image_b64
        image_bytes = base64.b64decode(payload)
        file_name = f"violations/{session_id}/{uuid4().hex}.jpg"
        provider = default_storage_provider()
        public_url = await provider.upload(image_bytes, file_name, content_type="image/jpeg")

        async with AsyncSessionLocal() as db:
            db.add(
                ViolationImage(
                    session_id=session_id,
                    image_url=public_url,
                    violation_type=violation_type,
                )
            )
            await db.commit()
        logger.info("Stored %s violation evidence for session %d", violation_type, session_id)
    except Exception:
        logger.exception("Failed to record violation evidence for session %d", session_id)
