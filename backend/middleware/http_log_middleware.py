import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from utils.logger import get_logger

logger = get_logger("access")


class HTTPLogMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[16:]
        request.request_id = request_id
        start_time = time.time()

        # 记录请求信息
        logger.info(f"请求开始：request_id:{request_id}, {request.method} {request.url}")

        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000  # ms
        logger.info(
            f"请求结束: request_id:{request_id}, {request.method} {request.url} "
            f"状态码: {response.status_code} 处理时间: {process_time:.2f}ms"
        )
        return response
