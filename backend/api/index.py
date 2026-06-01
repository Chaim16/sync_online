import time

from fastapi import APIRouter

from utils.response import set_result

router = APIRouter()


@router.get("/")
async def index():
    message = "welcome to decision engine service!"
    data = {
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json"
    }
    return set_result(message=message, data=data)


@router.get("/status",
            summary="系统状态检查",
            description="检查系统运行状态和基本信息",
            response_description="返回系统运行状态、运行时间等信息")
async def get_system_status():
    try:
        # 获取系统运行时间（这里简化处理）
        uptime = int(time.time())
        data = {
            "status": "ok",
            "uptime": uptime,
            "timestamp": uptime
        }
        return set_result(data, message="系统运行正常")
    except Exception as e:
        data = {
            "status": "error",
            "message": str(e)
        }
        return set_result(data, code=1, message="系统状态检查失败")


@router.get("/version",
            summary="获取版本信息",
            description="获取代码审查助手的版本和基本信息",
            response_description="返回系统版本、名称、描述等信息")
async def get_version():
    data = {
        "version": "0.0.1",
        "name": "决策引擎",
        "description": "基于多Agent驱动的智能决策引擎"
    }
    return set_result(data, message="获取版本信息成功")

