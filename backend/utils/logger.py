import os
import sys
from loguru import logger
_logger_cache = {}


handler_dict = {}


def get_logger(module: str = ""):
    # 如果module为空或者None，直接使用全局的logger
    if not module:
        return logger
    global handler_dict
    if module in handler_dict:
        return handler_dict.get(module)
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    log_path = os.path.join(logs_dir, f'{module}.log')
    log_format = "{time:YYYY:MM:DD:HH:mm:ss} | {thread.name} | {level} | {file.path}:{line} | {message}"
    logger.add(log_path, format=log_format,
               filter=lambda record: module in record["extra"].get("mod", ""),
               level="DEBUG", rotation="100 MB", retention="7 days")  # 每 10MB 轮转, retention="7 days")

    current_logger = logger.bind(mod=module)
    handler_dict[module] = current_logger

    return current_logger
