FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装依赖
RUN pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# 复制项目文件
COPY . .

# 创建临时目录
RUN mkdir -p temp_files

# 暴露端口
EXPOSE 8000

# 启动FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# 制作镜像 docker build -t sync_online:1.0 .
# 启动docker   docker run -d -p 8000:8000 --name sync_online sync_online:1.1