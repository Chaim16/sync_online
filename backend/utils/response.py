from fastapi.responses import JSONResponse


def set_result(data={}, code=0, message="success"):
    return JSONResponse(
        status_code=200,
        content={
            "code": code,
            "message": message,
            "data": data
        }
    )
