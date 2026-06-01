from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from api import index
from middleware.http_log_middleware import HTTPLogMiddleware


def load_router(app):
    """加载路由配置"""
    app.include_router(index.router, tags=["系统"])


def load_middlewares(app):
    """加载中间件"""
    # 跨域中间件
    origins = ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # 允许的源
        allow_credentials=True,
        allow_methods=["*"],  # 允许所有请求方法
        allow_headers=["*"],  # 允许所有请求头
    )
    # 访问日志中间件
    app.add_middleware(HTTPLogMiddleware)


def load_openapi(app):
    def custom_openapi():
        """自定义OpenAPI配置"""
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title="智能决策引擎",
            version="0.0.1",
            description="""基于多Agent驱动的智能决策引擎""",
            routes=app.routes,
        )

        openapi_schema["info"]["x-logo"] = {
            "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
        }
        app.openapi_schema = openapi_schema
        return app.openapi_schema

    # 设置自定义OpenAPI
    app.openapi = custom_openapi


def set_favicon(app):
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        """网站图标"""
        return {"message": "No favicon"}


def init_app(app):
    load_middlewares(app)
    load_router(app)
    set_favicon(app)
    load_openapi(app)
