import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
load_dotenv()

from utils.other import read_yaml_config
from utils.system import init_app
from utils.constains import APP_NAME


app = FastAPI(
    title=APP_NAME,
    description="描述",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)
init_app(app)



if __name__ == '__main__':
    server_config = read_yaml_config().get("server")
    host = server_config.get("host", "127.0.0.1")
    port = server_config.get("port", 6789)
    uvicorn.run("main:app", host=host, port=port)
