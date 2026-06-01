# 日志规范

日志用于记录系统运行状态、业务流程、异常信息和关键操作，便于问题排查、监控告警和审计分析。

## 日志组件
项目统一使用封装后的日志工具：
```python
from utils.logger import get_logger
```
创建日志实例：
```python
logger = get_logger("user_service") # 其中名称应与当前模块、服务或业务域保持一致。
```

推荐示例：

logger = get_logger("user_service")
logger = get_logger("order_service")
logger = get_logger("payment_service")
logger = get_logger("auth")

禁止：

logger = get_logger("test")
logger = get_logger("demo")
logger = get_logger("logger")


## 日志级别规范

- DEBUG: 用于开发调试阶段。
- INFO: 记录正常业务流程。
- WARNING: 记录异常但不影响业务继续执行的情况。
- ERROR：记录业务失败或系统异常，必须包含异常原因和异常堆栈。

## 日志内容规范

- 必须包含业务上下文，日志必须能够定位问题。
- 统一使用英文，日志内容统一使用英文。
- 使用 key=value 格式
- 异常日志规范，捕获异常时必须记录异常堆栈。例如：
```python
try:
    process_order()
except Exception:
    logger.exception(
        f"process order failed, order_id={order_id}"
    )
    raise
```
优先使用：logger.exception(...)，而不是：logger.error(str(e))，原因：exception 自动记录 traceback，方便问题定位
