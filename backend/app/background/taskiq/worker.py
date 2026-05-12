from app.background.taskiq.taskiq import broker
from app.background.taskiq.tasks import resume_processing
from app.interfaces.background_worker import BackgroundWorkerInterface


class TaskiqWorker(BackgroundWorkerInterface):

    async def startup(self) -> None:
        await broker.startup()

    async def shutdown(self) -> None:
        await broker.shutdown()

    async def process_resume_task(
        self, file_bytes_b64: str, file_name: str, application_id: int
    ) -> None:
        await resume_processing.process_resume_task.kiq(file_bytes_b64, file_name, application_id)


worker = TaskiqWorker()
